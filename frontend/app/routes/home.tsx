import { useEffect, useState } from "react";
import type { Route } from "./+types/home";

const sampleCocktails = [
  {
    name: "カシスオレンジ",
    englishName: "Cassis Orange",
    description: "カシスの甘酸っぱさとオレンジの果実感。飲みやすく華やかな一杯。",
    tags: ["甘口", "フルーティー"],
    match: 96,
    color: "cassis",
  },
  {
    name: "ファジーネーブル",
    englishName: "Fuzzy Navel",
    description: "ピーチのやさしい甘みとオレンジの爽やかさが広がります。",
    tags: ["甘口", "ピーチ"],
    match: 89,
    color: "peach",
  },
  {
    name: "チャイナブルー",
    englishName: "China Blue",
    description: "ライチの香りにグレープフルーツのほろ苦さを添えた味わい。",
    tags: ["さっぱり", "柑橘"],
    match: 82,
    color: "blue",
  },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SIP — あなたに合う一杯を" },
    {
      name: "description",
      content: "飲みたい気分や味の好みから、あなたにぴったりのカクテルを見つけます。",
    },
  ];
}

export default function Home() {
  const [preference, setPreference] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showResults, setShowResults] = useState(false);

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
    setShowResults(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowResults(true);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="SIP ホーム">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SIP<span className="brand-period">.</span></span>
        </a>
        <span className="topbar-note">あなたに合う一杯を見つけよう</span>
        <a className="topbar-link" href="#how-it-works">使い方 <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" />YOUR NEXT FAVORITE</p>
          <h1 id="hero-title">今夜の気分に、<br />ぴったりの一杯を。</h1>
          <p className="hero-description">
            味の好みや気分を教えてください。<br className="desktop-break" />
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
              <div className="glass-citrus"><span /></div>
              <div className="glass-bubble bubble-one" />
              <div className="glass-bubble bubble-two" />
              <div className="glass-bubble bubble-three" />
            </div>
          </div>
          <span className="art-label">A LITTLE<br />SOMETHING<br />FOR TONIGHT</span>
        </div>
      </section>

      <section className="recommend-section" aria-labelledby="form-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow section-eyebrow">LET’S FIND YOUR DRINK</p>
            <h2 id="form-title">どんな一杯をお探しですか？</h2>
          </div>
          <span className="step-label"><span>01</span> / 02</span>
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
                setShowResults(false);
              }}
              placeholder="例：甘くてフルーティーなものが飲みたい"
              rows={3}
              required
            />
            <div className="prompt-suggestions" aria-label="入力例">
              {["甘くて飲みやすい", "さっぱり柑橘系", "雨上がりに合う一杯"].map((suggestion) => (
                <button
                  className="suggestion-chip"
                  key={suggestion}
                  onClick={() => {
                    setPreference(suggestion);
                    setShowResults(false);
                  }}
                  type="button"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
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
                <img src={imageUrl} alt={`選択したメニュー写真: ${imageFile?.name ?? ""}`} />
                <div className="image-preview-info">
                  <span className="image-check" aria-hidden="true">✓</span>
                  <span className="image-name">{imageFile?.name}</span>
                </div>
                <button
                  className="remove-image"
                  onClick={() => {
                    setImageFile(null);
                    setShowResults(false);
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
                  <svg viewBox="0 0 24 24" fill="none">
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
            {imageError && <p className="field-error" role="alert">{imageError}</p>}
            <p className="privacy-note"><span aria-hidden="true">◈</span> 写真はおすすめのためだけに使用します</p>
          </div>

          <button className="submit-button" type="submit">
            <span>おすすめを見つける</span>
            <span className="submit-arrow" aria-hidden="true">→</span>
          </button>
          <p className="demo-note">現在は画面確認用のサンプル結果を表示します</p>
        </form>
      </section>

      {showResults && (
        <section className="results-section" aria-live="polite" aria-labelledby="results-title">
          <div className="results-heading">
            <div>
              <p className="eyebrow section-eyebrow">MADE FOR YOUR MOOD</p>
              <h2 id="results-title">今夜のおすすめ</h2>
              <p className="results-description">「{preference.trim()}」に合わせたサンプルです。</p>
            </div>
            <span className="mock-label">SAMPLE</span>
          </div>
          <div className="cocktail-list">
            {sampleCocktails.map((cocktail, index) => (
              <article className="cocktail-card" key={cocktail.name}>
                <div className={`cocktail-art cocktail-art-${cocktail.color}`} aria-hidden="true">
                  <span className="cocktail-number">0{index + 1}</span>
                  <span className="mini-glass">
                    <span className="mini-drink" />
                  </span>
                </div>
                <div className="cocktail-info">
                  <p className="cocktail-english">{cocktail.englishName}</p>
                  <h3>{cocktail.name}</h3>
                  <p className="cocktail-description">{cocktail.description}</p>
                  <div className="cocktail-tags">
                    {cocktail.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </div>
                <div className="match-score">
                  <strong>{cocktail.match}<small>%</small></strong>
                  <span>相性</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="how-section" id="how-it-works">
        <p className="eyebrow section-eyebrow">SIMPLE AS A SIP</p>
        <h2>使い方は、かんたん。</h2>
        <div className="how-steps">
          <div className="how-step">
            <span className="how-step-number">01</span>
            <div><h3>気分を伝える</h3><p>味の好みや、今の気分を入力。</p></div>
          </div>
          <span className="how-arrow" aria-hidden="true">→</span>
          <div className="how-step">
            <span className="how-step-number">02</span>
            <div><h3>メニューを見せる</h3><p>写真を添えると、もっと見つけやすく。</p></div>
          </div>
          <span className="how-arrow" aria-hidden="true">→</span>
          <div className="how-step">
            <span className="how-step-number">03</span>
            <div><h3>新しい一杯に出会う</h3><p>あなたに合うカクテルをご提案。</p></div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="/" aria-label="SIP ホーム">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SIP<span className="brand-period">.</span></span>
        </a>
        <span>Find a drink that feels like you.</span>
        <span className="footer-year">JPHACKS 2026</span>
      </footer>
    </main>
  );
}
