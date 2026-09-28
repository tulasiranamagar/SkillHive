from typing import Any

ALIASES = {
    "python programming": "python",
    "javascript programming": "javascript",
    "js": "javascript",
    "rest api": "web services",
    "rest apis": "web services",
    "version control": "git",
    "oop": "object oriented programming",
}


def normalize_text(value: Any) -> str:
    """
    Normalize arbitrary text into a simple comparable form.
    """
    return " ".join(
        str(value or "")
        .lower()
        .replace("-", " ")
        .replace("_", " ")
        .split()
    )


def canonical(value: Any) -> str:
    """
    Normalize text and apply known terminology aliases.
    """
    normalized = normalize_text(value)

    if not normalized:
        return ""

    return ALIASES.get(normalized, normalized)


def calculate_text_similarity(first: Any, second: Any) -> float:
    """
    Calculate semantic-ish text similarity using TF-IDF character n-grams
    and cosine similarity.

    Exact canonical matches always return 1.0.

    A lightweight word-overlap fallback is used when scikit-learn is
    unavailable.
    """
    first_text = canonical(first)
    second_text = canonical(second)

    if not first_text or not second_text:
        return 0.0

    if first_text == second_text:
        return 1.0

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
    except ImportError:
        first_words = set(first_text.split())
        second_words = set(second_text.split())

        if not first_words or not second_words:
            return 0.0

        union = first_words | second_words

        if not union:
            return 0.0

        return round(
            len(first_words & second_words) / len(union),
            4,
        )

    try:
        vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(3, 5),
        )

        matrix = vectorizer.fit_transform(
            [
                first_text,
                second_text,
            ]
        )

        score = cosine_similarity(matrix)[0][1]

        return round(float(score), 4)

    except (ValueError, TypeError):
        return 0.0


def calculate_best_similarity(
    source_text: Any,
    candidates,
) -> float:
    """
    Compare one source against multiple candidate strings and return
    the strongest similarity score.
    """
    scores = [
        calculate_text_similarity(
            source_text,
            candidate,
        )
        for candidate in candidates
        if candidate
    ]

    return max(scores or [0.0])