import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { SiteFooter, SiteHeader } from "~/components/site-chrome";
import { analyzeMenuImage, type MenuMatch } from "~/lib/ocr";
import { saveRecommendationSession } from "~/lib/recommendation-session";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "SIP — あなたに合う一杯を" },
    {
      name: "description",
      content:
        "飲みたい気分や味の好みから、あなたにぴったりのカクテルを見つけます。",
    },
  ];
}

type ScanOutcome = {
  menuMatch: MenuMatch | null;
  error: string | null;
};

export default function Home() {
  const navigate = useNavigate();
  const [preference, setPreference] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [ocrProgress, setOcrProgress] = useState("");
  // 写真を選んだ時点で始めたメニューの読み取り（送信時に使い回す）
  const scanRef = useRef<{
    file: File;
    promise: Promise<ScanOutcome>;
  } | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  // メニューの読み取りを始める。失敗しても例外にせず、結果にエラーを入れて返す
  function startScan(file: File): Promise<ScanOutcome> {
    setOcrProgress("メニューを読み取っています…");
    // 読み取りと照合をここで済ませ、送信時はおすすめの計算だけにする
    const promise = analyzeMenuImage(file).then(
      (menuMatch) => ({ menuMatch, error: null }),
      (error: unknown) => ({
        menuMatch: null,
        error:
          error instanceof Error
            ? error.message
            : "メニュー画像の文字認識に失敗しました。",
      }),
    );
    scanRef.current = { file, promise };
    promise.then(({ menuMatch, error }) => {
      // 読み取り中に写真を変えた・消したときは、古い結果を表示しない
      if (scanRef.current?.file !== file) return;
      setOcrProgress(
        error ??
          `メニューを読み取りました（登録済みのお酒 ${menuMatch?.matched.length ?? 0}件）`,
      );
    });
    return promise;
  }

  function selectImage(file: File | undefined) {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("画像ファイルを選択してください。");
      return;
    }
    setImageFile(file);
    // ボタンを押す前に読み取りを始めて、待ち時間を減らす
    startScan(file);
  }

  function removeImage() {
    setImageFile(null);
    scanRef.current = null;
    setOcrProgress("");
  }

  // 写真の選択・撮影のどちらでも使う。同じ写真を選び直せるよう、選択をリセットする
  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    selectImage(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      let menuMatch: MenuMatch | null = null;
      let ocrError: string | null = null;

      if (imageFile) {
        // 写真を選んだときに始めた読み取りがあれば、その結果を待つ
        const outcome = await (scanRef.current?.file === imageFile
          ? scanRef.current.promise
          : startScan(imageFile));
        menuMatch = outcome.menuMatch;
        ocrError = outcome.error;
      }

      await saveRecommendationSession(
        preference.trim(),
        imageFile,
        menuMatch,
        ocrError,
      );
      navigate("/cocktails");
    } catch {
      setSubmitError(
        "検索を開始できませんでした。画像を小さくするか、もう一度お試しください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="site-shell">
      <SiteHeader>
        <a className="topbar-link" href="#how-it-works">
          使い方 <span aria-hidden="true">↗</span>
        </a>
      </SiteHeader>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            YOUR NEXT FAVORITE
          </p>
          <h1 id="hero-title">
            今夜の気分に、
            <br />
            ぴったりの一杯を。
          </h1>
          <p className="hero-description">
            味の好みや気分を教えてください。
            <br className="desktop-break" />
            メニューの写真から、あなたに合うカクテルを見つけます。
          </p>
          <div className="hero-aside" aria-hidden="true">
            <span className="hero-aside-dot" />
            <span>知らない名前でも、大丈夫。</span>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-glow" />
          <div className="art-glass">
            <div className="glass-stem" />
            <div className="glass-base" />
            <div className="glass-bowl">
              <div className="glass-drink" />
              <div className="glass-highlight" />
              <div className="glass-citrus">
                <span />
              </div>
              <div className="glass-bubble bubble-one" />
              <div className="glass-bubble bubble-two" />
              <div className="glass-bubble bubble-three" />
            </div>
          </div>
          <span className="art-label">
            A LITTLE
            <br />
            SOMETHING
            <br />
            FOR TONIGHT
          </span>
        </div>
      </section>

      <section className="recommend-section" aria-labelledby="form-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow section-eyebrow">LET’S FIND YOUR DRINK</p>
            <h2 id="form-title">どんな一杯をお探しですか？</h2>
          </div>
          <span className="step-label">
            <span>01</span> / 02
          </span>
        </div>

        <form className="search-card" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="preference">
              <span className="field-number">01</span>
              味や気分を教えてください
              <span className="field-optional">ひとことでもOK</span>
            </label>
            <textarea
              id="preference"
              name="preference"
              value={preference}
              disabled={isSubmitting}
              onChange={(event) => {
                setPreference(event.target.value);
              }}
              placeholder="例：甘くてフルーティーなものが飲みたい"
              rows={3}
              required
            />
            <fieldset className="prompt-suggestions" aria-label="入力例">
              {["甘くて飲みやすい", "さっぱり柑橘系", "雨上がりに合う一杯"].map(
                (suggestion) => (
                  <button
                    className="suggestion-chip"
                    key={suggestion}
                    onClick={() => {
                      setPreference(suggestion);
                    }}
                    type="button"
                    disabled={isSubmitting}
                  >
                    + {suggestion}
                  </button>
                ),
              )}
            </fieldset>
          </div>

          <div className="form-divider" />

          <div className="form-field">
            <label htmlFor="menu-photo">
              <span className="field-number">02</span>
              メニューの写真を追加
              <span className="field-optional">なくても探せます</span>
            </label>
            <input
              className="file-input"
              id="menu-photo"
              type="file"
              accept="image/*"
              disabled={isSubmitting}
              onChange={handleFileInput}
            />
            <input
              className="file-input"
              id="menu-camera"
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isSubmitting}
              onChange={handleFileInput}
            />
            {imageUrl ? (
              <div className="image-preview">
                <img
                  src={imageUrl}
                  alt={`選択したメニュー写真: ${imageFile?.name ?? ""}`}
                />
                <div className="image-preview-info">
                  <span className="image-check" aria-hidden="true">
                    ✓
                  </span>
                  <span className="image-name">{imageFile?.name}</span>
                </div>
                <button
                  className="remove-image"
                  onClick={removeImage}
                  type="button"
                  aria-label="選択した写真を削除"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="upload-methods">
                <label
                  className={`upload-area${isDragging ? " is-dragging" : ""}`}
                  htmlFor="menu-photo"
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    selectImage(event.dataTransfer.files[0]);
                  }}
                >
                  <span className="upload-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5" />
                    </svg>
                  </span>
                  <span className="upload-copy">
                    <strong>写真を選ぶ</strong>
                    <span>端末内の画像を選択</span>
                  </span>
                  <span className="upload-format">JPG・PNG</span>
                </label>
                <label className="camera-option" htmlFor="menu-camera">
                  <span className="upload-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 7.5h3l1.5-2h7l1.5 2h3v11H4z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                  </span>
                  <span className="upload-copy">
                    <strong>その場で撮影</strong>
                    <span>カメラを起動</span>
                  </span>
                </label>
              </div>
            )}
            {imageError && (
              <p className="field-error" role="alert">
                {imageError}
              </p>
            )}
            <p className="privacy-note">
              <span aria-hidden="true">◈</span>{" "}
              写真を選ぶと、メニューの読み取りのため Google の
              AI（Gemini）に送信します
            </p>
            {ocrProgress && (
              <p className="ocr-progress" aria-live="polite">
                {ocrProgress}
              </p>
            )}
          </div>

          <button
            className="submit-button"
            disabled={isSubmitting}
            type="submit"
          >
            <span>
              {isSubmitting ? "準備しています…" : "おすすめを見つける"}
            </span>
            <span className="submit-arrow" aria-hidden="true">
              →
            </span>
          </button>
          <p className="demo-note">写真がなくてもカタログ全体から探せます</p>
          {submitError && (
            <p className="field-error request-error" role="alert">
              {submitError}
            </p>
          )}
        </form>
      </section>

      <section className="how-section" id="how-it-works">
        <p className="eyebrow section-eyebrow">SIMPLE AS A SIP</p>
        <h2>使い方は、かんたん。</h2>
        <div className="how-steps">
          <div className="how-step">
            <span className="how-step-number">01</span>
            <div>
              <h3>気分を伝える</h3>
              <p>味の好みや、今の気分を入力。</p>
            </div>
          </div>
          <span className="how-arrow" aria-hidden="true">
            →
          </span>
          <div className="how-step">
            <span className="how-step-number">02</span>
            <div>
              <h3>メニューを見せる</h3>
              <p>写真を添えると、もっと見つけやすく。</p>
            </div>
          </div>
          <span className="how-arrow" aria-hidden="true">
            →
          </span>
          <div className="how-step">
            <span className="how-step-number">03</span>
            <div>
              <h3>新しい一杯に出会う</h3>
              <p>あなたに合うカクテルをご提案。</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
