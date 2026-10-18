// 地図（/cocktail_points）やお気に入り（/favorites）から詳細ページ（/cocktails/:id）を開くとき、
// Link の state で渡す情報
export type DetailLinkState = {
  // 戻り先（地図なら検索の ?q= を含む URL）
  backTo: string;
  // 戻るリンクに出す名前
  backLabel: string;
  // 地図で検索した入力文との相性。検索していなければ null
  score: number | null;
};

export function detailLinkState(
  backTo: string,
  backLabel: string,
  score: number | null = null,
): DetailLinkState {
  return { backTo, backLabel, score };
}

// location.state から読み取る。ほかのページから来た・再読み込みで消えたときは null
export function readDetailLinkState(state: unknown): DetailLinkState | null {
  if (
    typeof state === "object" &&
    state !== null &&
    "backTo" in state &&
    typeof state.backTo === "string" &&
    "backLabel" in state &&
    typeof state.backLabel === "string" &&
    "score" in state &&
    (typeof state.score === "number" || state.score === null)
  ) {
    return {
      backTo: state.backTo,
      backLabel: state.backLabel,
      score: state.score,
    };
  }
  return null;
}
