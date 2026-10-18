import type { ReactNode } from "react";
import { Link } from "react-router";

// 全ページ共通のヘッダー。右側のリンクは children で渡す
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="カクテルタスケル ホーム">
        <span className="brand-mark" aria-hidden="true" />
        カクテルタスケル
      </Link>
      {children}
    </header>
  );
}
