import { useState } from "react";
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
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // 地図のページへ移る。メニューの写真があれば読み取りを始め、終わるまで地図で待てるようにする。
  // 気分の入力は空でもよい（空なら全カクテルの地図を開く）
  function search(imageFile: File | null) {
    const query = preference.trim();
    if (imageFile) startMenuScan(query, imageFile);
    navigate(
      query
        ? `/cocktail_points?q=${encodeURIComponent(query)}`
        : "/cocktail_points",
    );
  }

  // 写真を撮る・選ぶ・ドロップしたら、そのまま探し始める
  function searchWithImage(file: File | undefined) {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("画像ファイルを選んでください");
      return;
    }
    search(file);
  }

  // 同じ写真を選び直せるよう、選択をリセットする
  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    searchWithImage(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  return (
    <main className="site-shell">
      <SiteHeader>
        <Link className="topbar-link" to="/trends">
          みんなの好み
        </Link>
      </SiteHeader>

      <section className="home-hero">
        <NeonGlass color="#ff8a5c" className="home-glass" />
        <h1>
          今夜は、
          <br />
          何を飲む？
        </h1>

        <form
          className={`ask${isDragging ? " is-dragging" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            search(null);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            searchWithImage(event.dataTransfer.files[0]);
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
          />
          <div className="ask-bar">
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
            <button className="ask-submit" type="submit">
              探す <span aria-hidden="true">→</span>
            </button>
          </div>
          {imageError && (
            <p className="ask-error" role="alert">
              {imageError}
            </p>
          )}
        </form>
      </section>

      {/* スマホのカメラアプリのように、画面の下にシャッターを置く。
          左は写真を選ぶ、右は地図を眺める */}
      <nav className="camera-dock" aria-label="メニューの写真で探す">
        <input
          className="sr-only"
          id="menu-photo"
          type="file"
          accept="image/*"
          onChange={handleFileInput}
        />
        <input
          className="sr-only"
          id="menu-camera"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
        />
        <label className="dock-button" htmlFor="menu-photo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="m4 16 5-5 4 4 2-2 5 5" />
            <circle cx="15.5" cy="9.5" r="1.5" />
          </svg>
          <span className="sr-only">メニューの写真を選ぶ</span>
        </label>
        <div className="shutter-wrap">
          <span className="shutter-mode" aria-hidden="true">
            メニュー
          </span>
          <label className="shutter" htmlFor="menu-camera">
            <span className="sr-only">メニューを撮って探す</span>
          </label>
        </div>
        <Link className="dock-button" to="/cocktail_points">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6" cy="7" r="1.6" />
            <circle cx="17" cy="5" r="1.6" />
            <circle cx="12" cy="13" r="1.6" />
            <circle cx="19" cy="17" r="1.6" />
            <circle cx="7" cy="19" r="1.6" />
            <path d="m7.3 8.2 3.4 3.6m2.7-.4 3-5m-3 8.2 4.6 2.8m-6.4-1.6-3.8 3.4" />
          </svg>
          <span className="sr-only">地図で眺める</span>
        </Link>
        <p className="dock-note">写真は AI（Gemini）で読み取ります</p>
      </nav>
    </main>
  );
}
