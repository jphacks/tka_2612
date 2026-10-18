import type { ComponentProps, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cx } from "~/lib/cx";

// 利用者向けの画面で使う、小さな部品

export function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={cx(
        "font-extrabold text-3xl leading-snug tracking-wide md:text-4xl",
        className,
      )}
      {...props}
    />
  );
}

// タイトルの下に添える、件数などの一行
export function PageSub({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2.5 flex items-center gap-2.5 text-muted text-sm">
      {children}
    </p>
  );
}

// 読み込み中・空・エラーのときに、ページの中央に出す案内
export function Message({
  role,
  children,
}: {
  role?: "alert";
  children: ReactNode;
}) {
  return (
    <div
      className="mt-12 grid justify-items-center gap-3.5 text-center text-base text-muted"
      role={role}
    >
      {children}
    </div>
  );
}

export function ErrorText({ className, ...props }: ComponentProps<"p">) {
  return <p className={cx("text-danger text-sm", className)} {...props} />;
}

export function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cx(
        "font-semibold text-sm text-sunset transition-colors hover:text-neon",
        className,
      )}
      {...props}
    />
  );
}

// 英語の名前（日本語の名前の下に小さく添える）
export function EnglishName({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-faint text-xs tracking-wider">{children}</p>;
}

export function Tags({
  items,
  label,
  className,
}: {
  items: string[];
  label?: string;
  className?: string;
}) {
  return (
    <ul className={cx("flex flex-wrap gap-1.5", className)} aria-label={label}>
      {items.map((item) => (
        <li
          className="rounded-full border border-line px-2.5 py-1 text-muted text-xs"
          key={item}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

// 相性（0〜1）を、夕焼けからネオンへのグラデーションの文字で % にして出す
export function Score({
  value,
  size = "md",
}: {
  value: number;
  size?: "md" | "lg";
}) {
  return (
    <p
      className={cx(
        "shrink-0 bg-linear-120 from-sunset to-neon bg-clip-text font-extrabold text-transparent leading-none",
        size === "lg" ? "text-4xl md:text-5xl" : "text-2xl",
      )}
      title="相性"
    >
      {Math.round(value * 100)}
      <small className={size === "lg" ? "text-lg" : "text-sm"}>%</small>
    </p>
  );
}

// 押すと入力欄に入る、候補の言葉
export function Chip(props: Omit<ComponentProps<"button">, "className">) {
  return (
    <button
      className="min-h-9 shrink-0 rounded-full border border-line px-3.5 text-muted text-sm transition-colors hover:border-neon/55 hover:text-ink"
      type="button"
      {...props}
    />
  );
}

// 夕焼けからネオンへ光る、いちばん押してほしいボタン
export function GlowButton({
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { size?: "md" | "lg" }) {
  return (
    <button
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-linear-120 from-sunset to-neon font-bold text-on-glow shadow-glow transition-transform hover:-translate-y-px",
        size === "lg"
          ? "h-12 gap-2.5 px-6 text-base"
          : "h-10 gap-2 px-4.5 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CloseButton({
  onClick,
  label = "閉じる",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      className={cx(
        "grid size-9 shrink-0 place-items-center rounded-full text-faint text-xl transition-colors hover:bg-glass-strong hover:text-ink max-md:size-10",
        className,
      )}
      type="button"
      onClick={onClick}
      aria-label={label}
    >
      ×
    </button>
  );
}
