import { useId } from "react";
import { cx } from "~/lib/cx";

// ネオン管のような線で描いたカクテルグラス。color はグラスに入ったお酒の色
export function NeonGlass({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  // 同じページに複数置いても、グラデーションの ID がぶつからないようにする
  const gradientId = useId();

  return (
    <svg
      className={cx("neon-glow overflow-visible", className)}
      viewBox="0 0 120 140"
      fill="none"
      aria-hidden="true"
      style={{ color }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* お酒 */}
      <path d="M22 34 H98 L60 76 Z" fill={`url(#${gradientId})`} />
      {/* グラスの縁・脚・台 */}
      <path
        className="stroke-current"
        d="M12 24 H108 L60 78 Z M60 78 V122 M38 124 H82"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 縁に飾ったオレンジ */}
      <circle
        className="stroke-sunset"
        cx="96"
        cy="22"
        r="13"
        strokeWidth="3"
      />
    </svg>
  );
}
