import type { ReactNode } from "react";
import { Link } from "react-router";

// 全ページ共通のロゴ。ホームへは画面遷移で戻る（ページ全体は再読み込みしない）
function Brand({ className = "brand" }: { className?: string }) {
  return (
    <Link className={className} to="/" aria-label="SIP ホーム">
      <span className="brand-mark" aria-hidden="true">
        S
      </span>
      <span>
        SIP<span className="brand-period">.</span>
      </span>
    </Link>
  );
}

// 全ページ共通のヘッダー。右側のリンクは children で渡す
export function SiteHeader({
  children,
  showNote = true,
}: {
  children: ReactNode;
  showNote?: boolean;
}) {
  return (
    <header className="topbar">
      <Brand />
      {showNote && (
        <span className="topbar-note">あなたに合う一杯を見つけよう</span>
      )}
      {children}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <Brand className="brand footer-brand" />
      <span>Find a drink that feels like you.</span>
      <span className="footer-year">JPHACKS 2026</span>
    </footer>
  );
}
