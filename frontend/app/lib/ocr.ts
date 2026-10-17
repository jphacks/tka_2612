export type RecognizedMenuItem = {
  text: string;
  x: number | null;
  y: number | null;
};

export type OCRProgress = {
  status: string;
  progress: number;
};

function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("画像の大きさを読み取れませんでした。"));
    };
    image.src = imageUrl;
  });
}

export async function recognizeMenuImage(
  file: File,
  onProgress: (progress: OCRProgress) => void,
): Promise<RecognizedMenuItem[]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("jpn+eng", undefined, {
    logger: ({ status, progress }) => onProgress({ status, progress }),
  });

  try {
    const { data } = await worker.recognize(
      file,
      {},
      { text: true, blocks: true },
    );
    let dimensions: { width: number; height: number } | null = null;

    try {
      dimensions = await getImageDimensions(file);
    } catch {
      // OCR text can still be used if the browser cannot provide image dimensions.
    }

    const lines =
      data.blocks?.flatMap((block) =>
        block.paragraphs.flatMap((paragraph) => paragraph.lines),
      ) ?? [];
    if (lines.length === 0) {
      return data.text
        .split(/\r?\n/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ text, x: null, y: null }));
    }

    return lines
      .map(({ text, bbox }) => ({
        text: text.trim(),
        x:
          dimensions && dimensions.width > 0
            ? Math.max(
                0,
                Math.min(
                  100,
                  ((bbox.x0 + bbox.x1) / 2 / dimensions.width) * 100,
                ),
              )
            : null,
        y:
          dimensions && dimensions.height > 0
            ? Math.max(
                0,
                Math.min(
                  100,
                  ((bbox.y0 + bbox.y1) / 2 / dimensions.height) * 100,
                ),
              )
            : null,
      }))
      .filter(({ text }) => Boolean(text));
  } finally {
    await worker.terminate();
  }
}
