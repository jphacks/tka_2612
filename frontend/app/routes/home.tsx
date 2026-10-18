import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { NeonGlass } from "~/components/neon-glass";
import { HeaderLink, SiteHeader, SiteShell } from "~/components/site-chrome";
import { Chip, ErrorText, GlowButton } from "~/components/ui";
import { cx } from "~/lib/cx";
import {
  discardPreparedMenuScan,
  prepareMenuScan,
  startMenuScan,
} from "~/lib/menu-scan-task";
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

// 入力欄の下に出す候補。押すと入力欄に入る。
// 味・雰囲気・変わり種を交互に並べ、スマホで見える先頭の数個でも幅が伝わるようにする
const SUGGESTIONS = [
  "甘くて飲みやすい",
  "雨上がりに合う一杯",
  "スパイ映画の主人公気分",
  "さっぱり柑橘系",
  "ゆっくり飲みたい夜に",
  "魔女の怪しい薬みたいな",
  "ほろ苦い大人の味",
  "乾杯の一杯目に",
  "月曜日をなかったことにしたい",
  "度数低めで軽く",
  "夏の夕暮れに",
  "南の島に逃げたい",
  "フルーティーで華やか",
  "お祝いの日に",
  "昭和の喫茶店みたいな味",
];

// 選んだ写真の読み取りの状態（入力欄の下に表示する）
type ScanStatus =
  | { kind: "reading" }
  | { kind: "done"; count: number }
  | { kind: "failed"; message: string };

function scanStatusText(status: ScanStatus): string {
  if (status.kind === "reading") return "メニューを読み取っています…";
  if (status.kind === "failed") return status.message;
  return status.count > 0
    ? `読み取りました（登録済みのお酒 ${status.count}件）`
    : "読み取りました（登録済みのお酒は見つかりませんでした）";
}

export default function Home() {
  const navigate = useNavigate();
  const [preference, setPreference] = useState("");
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  // 読み取り中に写真を変えた・外したとき、古い読み取りの結果を表示しないために使う
  const imageFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

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

  // 写真を撮る・選ぶ・ドロップしたら、読み取りだけを始める（画面は「探す」を押すまで移らない）
  function selectImage(file: File | undefined) {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("画像ファイルを選んでください");
      return;
    }
    imageFileRef.current = file;
    setImageFile(file);
    setScanStatus({ kind: "reading" });
    prepareMenuScan(file).then(({ menuMatch, error }) => {
      if (imageFileRef.current !== file) return;
      setScanStatus(
        error
          ? { kind: "failed", message: error }
          : { kind: "done", count: menuMatch?.matched.length ?? 0 },
      );
    });
  }

  function removeImage() {
    imageFileRef.current = null;
    setImageFile(null);
    setScanStatus(null);
    discardPreparedMenuScan();
  }

  // 同じ写真を選び直せるよう、選択をリセットする
  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    selectImage(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  return (
    <SiteShell>
      {/* お客さんの操作の邪魔にならないよう、店長向けのページへの入り口は控えめに置く */}
      <SiteHeader>
        <nav className="flex items-center gap-5 max-md:gap-4">
          <HeaderLink to="/favorites" aria-label="お気に入り">
            <span
              className="mr-1 text-neon max-md:mr-0 max-md:text-[22px]"
              aria-hidden="true"
            >
              ♡
            </span>
            {/* 狭い画面ではハートだけにして、ヘッダーに収める */}
            <span className="max-md:hidden" aria-hidden="true">
              お気に入り
            </span>
          </HeaderLink>
          <HeaderLink to="/store">お店の方へ</HeaderLink>
        </nav>
      </SiteHeader>

      {/* 下のシャッターに隠れないよう、下側をあけておく */}
      <section className="mx-auto flex min-h-[calc(100dvh-72px)] max-w-170 flex-col items-center justify-center px-5 pt-4 pb-50 text-center max-md:min-h-[calc(100dvh-60px)] max-md:justify-start max-md:pt-[3vh]">
        <NeonGlass
          color="#ff8a5c"
          className="mb-5 h-28 w-24 animate-float max-md:mb-3 max-md:h-18.5 max-md:w-16 max-md:short:hidden"
        />
        <h1 className="mb-8 bg-linear-120 from-35% from-white via-65% via-[#ffc2a8] to-neon bg-clip-text font-extrabold text-5xl text-transparent leading-tight md:text-7xl max-md:mb-5 max-md:short:mb-4 max-md:short:text-4xl">
          今夜は、
          <br />
          何を飲む？
        </h1>

        <form
          className="w-full rounded-3xl border border-line bg-glass p-3 text-left shadow-2xl shadow-black/35 backdrop-blur-lg transition-colors focus-within:border-neon/50 data-dragging:border-neon/50"
          data-dragging={isDragging || undefined}
          onSubmit={(event) => {
            event.preventDefault();
            // 選んだ写真があれば、始めておいた読み取りを使って探す
            search(imageFile);
          }}
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
            className="block w-full resize-none bg-transparent px-3 py-2.5 text-ink text-lg leading-relaxed outline-none placeholder:text-faint max-md:short:text-base"
            id="preference"
            name="preference"
            value={preference}
            onChange={(event) => setPreference(event.target.value)}
            placeholder="甘くて、ちょっと苦いもの"
            aria-label="飲みたい味や気分"
            rows={2}
          />
          {imageFile && previewUrl && scanStatus && (
            <div className="mx-1 mt-1 mb-3 flex items-center gap-3 rounded-2xl border border-line bg-glass p-2">
              <img
                className="size-14 shrink-0 rounded-lg object-cover"
                src={previewUrl}
                alt="選んだメニューの写真"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-ink text-sm">
                  {imageFile.name}
                </span>
                <span
                  className={cx(
                    "text-xs",
                    scanStatus.kind === "failed" ? "text-danger" : "text-muted",
                  )}
                  aria-live="polite"
                >
                  {scanStatusText(scanStatus)}
                </span>
              </div>
              <button
                className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-lg text-muted"
                onClick={removeImage}
                type="button"
                aria-label="写真を外す"
              >
                ×
              </button>
            </div>
          )}
          {/* 入力例は1行にして横にスクロールし、右端は続きがあるとわかるよう薄くする。
              スマホでは「探す」を下に広げて押しやすくする */}
          <div className="flex items-center gap-3 border-line border-t px-1 pt-3 pb-0.5 max-md:flex-col max-md:items-stretch">
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto mask-r-from-85% [scrollbar-width:none] max-md:-mx-4 max-md:px-3">
              {SUGGESTIONS.map((suggestion) => (
                <Chip
                  key={suggestion}
                  onClick={() => setPreference(suggestion)}
                >
                  {suggestion}
                </Chip>
              ))}
            </div>
            <GlowButton size="lg" type="submit">
              探す <span aria-hidden="true">→</span>
            </GlowButton>
          </div>
          {imageError && (
            <ErrorText className="mx-2 mt-2.5 text-xs" role="alert">
              {imageError}
            </ErrorText>
          )}
        </form>
      </section>

      {/* スマホのカメラアプリのように、画面の下中央にシャッターを置く。
          左は写真を選ぶ、右は地図を眺める */}
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 grid grid-cols-[1fr_auto_1fr] items-end justify-items-center bg-linear-to-b from-transparent to-45% to-night/92 px-[max(32px,50%-180px)] pt-10 pb-[calc(12px+env(safe-area-inset-bottom))] *:pointer-events-auto"
        aria-label="メニューの写真で探す"
      >
        {/* 写真の入力は見えないので、キーボードで選んだときはすぐ後ろのボタンを囲む */}
        <input
          className="peer/photo sr-only"
          id="menu-photo"
          type="file"
          accept="image/*"
          onChange={handleFileInput}
        />
        <label
          className={cx(DOCK_BUTTON, PEER_PHOTO_FOCUS)}
          htmlFor="menu-photo"
        >
          <DockIcon>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="m4 16 5-5 4 4 2-2 5 5" />
            <circle cx="15.5" cy="9.5" r="1.5" />
          </DockIcon>
          <span className="sr-only">メニューの写真を選ぶ</span>
        </label>
        <div className="grid justify-items-center gap-2.5">
          {/* カメラアプリのモード名のように、シャッターの上に何を撮るかを出す */}
          <span
            className="font-bold text-sunset text-xs tracking-[0.2em] text-shadow-halo text-shadow-sunset/60"
            aria-hidden="true"
          >
            メニュー
          </span>
          <input
            className="peer/camera sr-only"
            id="menu-camera"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
          />
          <label
            className="group relative block size-19.5 rounded-full border-4 border-white shadow-halo shadow-neon/50 ring-1 ring-white/20 transition-transform active:scale-94 peer-focus-visible/camera:outline-2 peer-focus-visible/camera:outline-neon peer-focus-visible/camera:outline-offset-4"
            htmlFor="menu-camera"
          >
            {/* 押せることが伝わるよう、まわりに光の輪を広げ続ける */}
            <span
              className="absolute -inset-2.5 animate-ring rounded-full border-2 border-neon/60"
              aria-hidden="true"
            />
            {/* 内側は白にする。赤い丸だと動画の録画ボタンに見えるため */}
            <span
              className="absolute inset-1.25 rounded-full bg-white inset-shadow-night/20 inset-shadow-sm transition-colors group-active:bg-[#e9e3ee]"
              aria-hidden="true"
            />
            <span className="sr-only">メニューを撮る</span>
          </label>
        </div>
        <Link className={DOCK_BUTTON} to="/cocktail_points">
          <DockIcon>
            <circle cx="6" cy="7" r="1.6" />
            <circle cx="17" cy="5" r="1.6" />
            <circle cx="12" cy="13" r="1.6" />
            <circle cx="19" cy="17" r="1.6" />
            <circle cx="7" cy="19" r="1.6" />
            <path d="m7.3 8.2 3.4 3.6m2.7-.4 3-5m-3 8.2 4.6 2.8m-6.4-1.6-3.8 3.4" />
          </DockIcon>
          <span className="sr-only">地図で眺める</span>
        </Link>
        <p className="col-span-full mt-2.5 text-2xs text-faint">
          写真は AI（Gemini）で読み取ります
        </p>
      </nav>
    </SiteShell>
  );
}

// シャッターの左右に置く、丸いボタン
const DOCK_BUTTON =
  "mb-3 grid size-13 place-items-center rounded-full border border-line bg-glass text-ink backdrop-blur-md transition-colors hover:border-neon/55";
const PEER_PHOTO_FOCUS =
  "peer-focus-visible/photo:outline-2 peer-focus-visible/photo:outline-neon peer-focus-visible/photo:outline-offset-4";

// ボタンの中の線の絵。点（circle）は塗りつぶす
function DockIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="size-5.5 fill-none stroke-[1.6] stroke-current [&_circle]:fill-current [&_circle]:stroke-none"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
