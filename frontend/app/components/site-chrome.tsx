import type { ComponentProps, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cx } from "~/lib/cx";

// 利用者向けのページの外枠。画面の奥に、夕焼けとネオンの光をにじませる
export function SiteShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <main className={cx("relative isolate min-h-dvh", className)}>
      <div
        className="bg-night-glow pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
      />
      {children}
    </main>
  );
}

// 全ページ共通のヘッダー。右側のリンクは children で渡す
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex h-18 w-full max-w-290 items-center justify-between px-5 max-md:h-15">
      <Link
        className="font-extrabold text-ink text-xl tracking-wider"
        to="/"
        aria-label="カクテルタスケル ホーム"
      >
        カクテルタスケル
      </Link>
      {children}
    </header>
  );
}

export function HeaderLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cx(
        "py-2.5 text-muted text-sm transition-colors hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

// ヘッダーの右側に置く、前のページへ戻るリンク
export function BackLink({ to, label }: { to: string; label: string }) {
  return <HeaderLink to={to}>← {label}</HeaderLink>;
}

// ページの本文。読みやすい幅で中央に置き、ふわっと出す
export function Page({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cx(
        "mx-auto max-w-200 animate-reveal px-5 pt-6 pb-20",
        className,
      )}
      {...props}
    />
  );
}
