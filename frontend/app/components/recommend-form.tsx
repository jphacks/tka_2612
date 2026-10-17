import { useEffect, useRef, useState } from "react";
import { Form, useNavigation } from "react-router";

const EXAMPLES = [
  "甘くてフルーティなお酒",
  "さっぱりしたもの",
  "失恋を支えてくれるお酒",
  "雨上がりに合うお酒",
];

export function RecommendForm({ error }: { error?: string }) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
  }

  return (
    <Form method="post" encType="multipart/form-data" className="space-y-6">
      <section className="space-y-2">
        <label htmlFor="query" className="block font-bold">
          1. どんなお酒が飲みたいですか？
        </label>
        <textarea
          id="query"
          name="query"
          rows={2}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="例：甘くてフルーティなお酒 / 失恋を支えてくれるお酒"
          className="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-700 dark:bg-gray-900"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuery(example)}
              className="rounded-full border border-amber-300 px-3 py-1 text-sm text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
            >
              {example}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      <section className="space-y-2">
        <label htmlFor="menu" className="block font-bold">
          2. メニューの写真（任意）
        </label>
        <p className="text-sm text-gray-500">
          写真があればメニューの中から、なければすべてのカクテルから探します。
        </p>
        <input
          ref={fileRef}
          id="menu"
          name="menu"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 dark:file:bg-gray-800 dark:file:text-gray-100"
        />
        {preview && (
          <div className="flex items-start gap-3">
            <img
              src={preview}
              alt="アップロードしたメニュー"
              className="h-32 rounded-lg border border-gray-200 object-cover dark:border-gray-800"
            />
            <button type="button" onClick={clearFile} className="text-sm text-gray-500 underline">
              写真を外す
            </button>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {submitting ? "探しています…" : "おすすめを見る"}
      </button>
    </Form>
  );
}
