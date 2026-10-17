"""フィードバック・お気に入り・入力文のインメモリ保存（モック用）。本実装では SQLite に置き換える

サーバーを再起動すると消える。
"""

from collections import Counter

from app.schemas import Feedback, FeedbackRequest, Rating

_feedbacks: list[Feedback] = []
_favorites: dict[str, set[str]] = {}
_queries: Counter[str] = Counter()


def add_query(query: str) -> None:
    _queries[query] += 1


def add_feedback(req: FeedbackRequest) -> Feedback:
    feedback = Feedback(id=len(_feedbacks) + 1, **req.model_dump())
    _feedbacks.append(feedback)
    return feedback


def count_ratings() -> dict[str, Counter[Rating]]:
    counts: dict[str, Counter[Rating]] = {}
    for f in _feedbacks:
        counts.setdefault(f.cocktail_id, Counter())[f.rating] += 1
    return counts


def list_favorites(device_id: str) -> set[str]:
    return _favorites.get(device_id, set())


def add_favorite(device_id: str, cocktail_id: str) -> None:
    _favorites.setdefault(device_id, set()).add(cocktail_id)


def remove_favorite(device_id: str, cocktail_id: str) -> None:
    _favorites.get(device_id, set()).discard(cocktail_id)


def count_favorites() -> Counter[str]:
    return Counter(c for ids in _favorites.values() for c in ids)


def query_ranking() -> list[tuple[str, int]]:
    return _queries.most_common()
