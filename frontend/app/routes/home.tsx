import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { NeonGlass } from "~/components/neon-glass";
import { SiteHeader } from "~/components/site-chrome";
import { startMenuScan } from "~/lib/menu-scan-task";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "カクテルタスケル — 今夜の一杯を" },
    {
      name: "description",
      content:
        "飲みたい気分や味の好みから、あなたにぴったりのカクテルを見つけます。",
    },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const [preference, setPreference] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  function selectImage(file: File | undefined) {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("画像ファイルを選択してください。");
      return;
    }
    setImageFile(file);
  }

  // 写真の選択・撮影のどちらでも使う。同じ写真を選び直せるよう、選択をリセットする
  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    selectImage(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = preference.trim();
    // メニューの写真があれば読み取りを始め、終わるまで点群のページで待てるようにする。
    // 読み取りが終わると、点群のページからおすすめ一覧へ進める
    if (imageFile) startMenuScan(query, imageFile);
    navigate(`/cocktail_points?q=${encodeURIComponent(query)}`);
  }

  return (
    <main className="site-shell">
      <SiteHeader />

      <section className="home-hero">
        <NeonGlass color="#ff8a5c" className="home-glass" />
        <h1>
          今夜は、
          <br />
          何を飲む？
        </h1>

        <form
          className={`ask${isDragging ? " is-dragging" : ""}`}
          onSubmit={handleSubmit}
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
          <textarea
            id="preference"
            name="preference"
            value={preference}
            onChange={(event) => setPreference(event.target.value)}
            placeholder="甘くて、ちょっと苦いもの"
            aria-label="飲みたい味や気分"
            rows={2}
            required
          />
          <div className="ask-chips">
            {["甘くて飲みやすい", "さっぱり柑橘系", "雨上がりに合う一杯"].map(
              (suggestion) => (
                <button
                  className="chip"
                  key={suggestion}
                  onClick={() => setPreference(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ),
            )}
          </div>

          <div className="ask-bar">
            <input
              className="sr-only"
              id="menu-camera"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
            />
            <input
              className="sr-only"
              id="menu-photo"
              type="file"
              accept="image/*"
              onChange={handleFileInput}
            />
            {imageUrl ? (
              <div className="photo-thumb">
                <img
                  src={imageUrl}
                  alt={`メニューの写真: ${imageFile?.name}`}
                />
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  aria-label="写真を外す"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <label
                  className="icon-button icon-button-camera"
                  htmlFor="menu-camera"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                  <span className="sr-only">メニューを撮る</span>
                </label>
                <label className="icon-button" htmlFor="menu-photo">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="m4 16 5-5 4 4 2-2 5 5" />
                    <circle cx="15.5" cy="9.5" r="1.5" />
                  </svg>
                  <span className="sr-only">メニューの写真を選ぶ</span>
                </label>
              </>
            )}
            <button className="ask-submit" type="submit">
              探す <span aria-hidden="true">→</span>
            </button>
          </div>
          {imageFile && (
            <p className="ask-note">写真は AI（Gemini）で読み取ります</p>
          )}
          {imageError && (
            <p className="ask-error" role="alert">
              {imageError}
            </p>
          )}
        </form>

        <Link className="map-link" to="/cocktail_points">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6" cy="7" r="1.6" />
            <circle cx="17" cy="5" r="1.6" />
            <circle cx="12" cy="13" r="1.6" />
            <circle cx="19" cy="17" r="1.6" />
            <circle cx="7" cy="19" r="1.6" />
            <path d="m7.3 8.2 3.4 3.6m2.7-.4 3-5m-3 8.2 4.6 2.8m-6.4-1.6-3.8 3.4" />
          </svg>
          地図で眺める
        </Link>
      </section>
    </main>
  );
}
