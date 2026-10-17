import { useEffect, useState } from "react";
import { type RecommendResponse, recommend } from "~/lib/api";
import type { Route } from "./+types/home";

// 結果カードの色。おすすめの順に繰り返す
const cardColors = ["cassis", "peach", "blue"];

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

export default function Home() {
  const [preference, setPreference] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState("");

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
    setResult(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setRequestError("");
    try {
      setResult(await recommend(preference.trim(), imageFile));
    } catch {
      setResult(null);
      setRequestError(
        "おすすめを取得できませんでした。時間をおいてもう一度お試しください。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="SIP ホーム">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>
            SIP<span className="brand-period">.</span>
          </span>
        </a>
        <span className="topbar-note">あなたに合う一杯を見つけよう</span>
        <a className="topbar-link" href="#how-it-works">
          使い方 <span aria-hidden="true">↗</span>
        </a>
      </header>

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
              onChange={(event) => {
                setPreference(event.target.value);
                setResult(null);
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
                      setResult(null);
                    }}
                    type="button"
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
              onChange={(event) => {
                selectImage(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
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
                  onClick={() => {
                    setImageFile(null);
                    setResult(null);
                  }}
                  type="button"
                  aria-label="選択した写真を削除"
                >
                  ×
                </button>
              </div>
            ) : (
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
                  <strong>写真を選択</strong>
                  <span>またはここに画像をドロップ</span>
                </span>
                <span className="upload-format">JPG・PNG</span>
              </label>
            )}
            {imageError && (
              <p className="field-error" role="alert">
                {imageError}
              </p>
            )}
            <p className="privacy-note">
              <span aria-hidden="true">◈</span>{" "}
              写真はおすすめのためだけに使用します
            </p>
          </div>

          <button
            className="submit-button"
            disabled={isLoading}
            type="submit"
          >
            <span>{isLoading ? "探しています…" : "おすすめを見つける"}</span>
            <span className="submit-arrow" aria-hidden="true">
              →
            </span>
          </button>
          {requestError && (
            <p className="field-error request-error" role="alert">
              {requestError}
            </p>
          )}
          <p className="demo-note">
            現在はモックのおすすめ結果を表示します
          </p>
        </form>
      </section>

      {result && (
        <section
          className="results-section"
          aria-live="polite"
          aria-labelledby="results-title"
        >
          <div className="results-heading">
            <div>
              <p className="eyebrow section-eyebrow">MADE FOR YOUR MOOD</p>
              <h2 id="results-title">今夜のおすすめ</h2>
              <p className="results-description">
                「{result.query}」に合うお酒を、相性の高い順に紹介します。
              </p>
            </div>
            <span className="mock-label">MOCK</span>
          </div>
          <div className="cocktail-list">
            {result.recommendations.map(({ cocktail, score }, index) => (
              <article className="cocktail-card" key={cocktail.id}>
                <div
                  className={`cocktail-art cocktail-art-${cardColors[index % cardColors.length]}`}
                  aria-hidden="true"
                >
                  <span className="cocktail-number">0{index + 1}</span>
                  <span className="mini-glass">
                    <span className="mini-drink" />
                  </span>
                </div>
                <div className="cocktail-info">
                  <p className="cocktail-english">{cocktail.aliases[0]}</p>
                  <h3>{cocktail.name}</h3>
                  <p className="cocktail-description">{cocktail.description}</p>
                  <div className="cocktail-tags">
                    {cocktail.ingredients.map((ingredient) => (
                      <span key={ingredient}>{ingredient}</span>
                    ))}
                  </div>
                </div>
                <div className="match-score">
                  <strong>
                    {Math.round(score * 100)}
                    <small>%</small>
                  </strong>
                  <span>相性</span>
                </div>
              </article>
            ))}
          </div>
          {result.unregistered.length > 0 && (
            <div className="unregistered">
              <h3>読み取れたが未登録のお酒</h3>
              <p>{result.unregistered.join("、")}</p>
            </div>
          )}
        </section>
      )}

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

      <footer className="footer">
        <a className="brand footer-brand" href="/" aria-label="SIP ホーム">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>
            SIP<span className="brand-period">.</span>
          </span>
        </a>
        <span>Find a drink that feels like you.</span>
        <span className="footer-year">JPHACKS 2026</span>
      </footer>
    </main>
  );
}
