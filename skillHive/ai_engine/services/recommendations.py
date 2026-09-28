from collections import defaultdict
from datetime import timedelta

from django.db.models import F, Q
from django.utils import timezone

from exchanges.models import ExchangePost
from goals.models import GoalSkill
from marketplace.models import MarketplaceContent
from roadmaps.models import LearningActivity
from skills.models import Skill, UserSkill

from .similarity import (
    calculate_best_similarity,
    calculate_text_similarity,
    canonical,
)
from .skill_gap import analyze_user_skill_gap



# Recommendation configuration

MAX_CONTENT_CANDIDATES = 5000
MAX_EXCHANGE_CANDIDATES = 5000

DEFAULT_CONTENT_LIMIT = 12
DEFAULT_EXCHANGE_LIMIT = 12

BEHAVIOR_WINDOW_DAYS = 90

POPULARITY_WEIGHT = 0.05
FRESHNESS_WEIGHT = 0.05

PROFILE_WEIGHT = 0.25
GOAL_WEIGHT = 0.20
SKILL_GAP_WEIGHT = 0.20
SIMILARITY_WEIGHT = 0.15
BEHAVIOR_WEIGHT = 0.15
INTEREST_WEIGHT = 0.05

# General helpers 

def _safe_float(value):
    try:
        return float(value or 0)
    except (
        TypeError,
        ValueError,
    ):
        return 0.0


def _normalize_score(value):
    return max(
        0.0,
        min(
            1.0,
            _safe_float(value),
        ),
    )


def _days_old(created_at):
    if not created_at:
        return 365.0

    now = timezone.now()

    delta = now - created_at

    return max(
        delta.total_seconds() / 86400,
        0.0,
    )


def _freshness_score(created_at):
    """
    Freshness decays smoothly over time.
    """
    days = _days_old(created_at)

    if days <= 0:
        return 1.0

    return max(
        0.0,
        1.0 - (
            days / 365.0
        ),
    )


def _popularity_score(view_count):
    """
    Normalize popularity without allowing huge view counts
    to dominate the recommendation.
    """
    value = max(
        _safe_float(view_count),
        0.0,
    )

    if value <= 0:
        return 0.0

    import math

    return min(
        math.log1p(value) / math.log1p(1000),
        1.0,
    )


def _get_active_goal(user):
    from goals.models import UserGoal

    return (
        UserGoal.objects
        .select_related("goal")
        .filter(
            user=user,
            is_active=True,
        )
        .first()
    )


# User profile / behavior context

def _get_user_skill_context(user):
    user_skills = list(
        UserSkill.objects
        .select_related("skill")
        .filter(
            user=user,
        )
    )

    known = {}
    wanted = {}

    for item in user_skills:
        name = canonical(
            item.skill.name,
        )

        if not name:
            continue

        if item.skill_type == UserSkill.TYPE_KNOWN:
            known[name] = item

        elif item.skill_type == UserSkill.TYPE_WANTED:
            wanted[name] = item

    interests = set(
        canonical(skill.name)
        for skill in Skill.objects.filter(
            interested_users__user=user,
        )
    )

    return {
        "known": known,
        "wanted": wanted,
        "interests": {
            value
            for value in interests
            if value
        },
        "user_skills": user_skills,
    }


def _get_goal_skill_names(active_goal):
    if not active_goal:
        return set()

    return {
        canonical(skill_name)
        for skill_name in GoalSkill.objects
        .filter(
            goal=active_goal.goal,
        )
        .values_list(
            "skill__name",
            flat=True,
        )
        if skill_name
    }


def _get_completed_learning_skill_names(user):
    """
    Learning activity is treated as behavioral evidence,
    not as proof that the user owns the skill.
    """

    names = set()

    activities = (
        LearningActivity.objects
        .filter(
            user=user,
            completed=True,
        )
        .select_related(
            "task__skill",
        )
        .order_by(
            "-created_at",
        )[:500]
    )

    for activity in activities:
        if (
            activity.task
            and activity.task.skill
        ):
            names.add(
                canonical(
                    activity.task.skill.name,
                )
            )

    return {
        name
        for name in names
        if name
    }


def _get_behavior_context(user):
    """
    Build lightweight behavioral signals from data already stored
    by SkillHive.

    No new database model is required here.
    """

    cutoff = (
        timezone.now()
        - timedelta(
            days=BEHAVIOR_WINDOW_DAYS,
        )
    )

    completed_activities = (
        LearningActivity.objects
        .filter(
            user=user,
            completed=True,
            created_at__gte=cutoff,
        )
        .select_related(
            "task__skill",
        )
        .order_by(
            "-created_at",
        )[:500]
    )

    skill_activity_count = defaultdict(int)

    for activity in completed_activities:
        if (
            activity.task
            and activity.task.skill
        ):
            skill_name = canonical(
                activity.task.skill.name,
            )

            if skill_name:
                skill_activity_count[
                    skill_name
                ] += 1

    return {
        "skill_activity_count": dict(
            skill_activity_count,
        ),
    }


def _get_user_profile_text(
    user,
    context,
    active_goal,
):
    parts = []

    parts.extend(
        context["known"].keys()
    )

    parts.extend(
        context["wanted"].keys()
    )

    parts.extend(
        context["interests"]
    )

    if active_goal:
        parts.append(
            canonical(
                active_goal.goal.title,
            )
        )

        parts.extend(
            _get_goal_skill_names(
                active_goal,
            )
        )

    parts.extend(
        _get_completed_learning_skill_names(
            user,
        )
    )

    return " ".join(
        part
        for part in parts
        if part
    )


# Skill relevance

def _best_skill_similarity(
    candidate_skill_names,
    profile_skill_names,
):
    if not candidate_skill_names:
        return 0.0

    if not profile_skill_names:
        return 0.0

    best = 0.0

    for candidate in candidate_skill_names:
        score = calculate_best_similarity(
            candidate,
            profile_skill_names,
        )

        best = max(
            best,
            score,
        )

    return round(
        best,
        4,
    )


def _extract_content_skill_names(content):
    names = set()

    if getattr(
        content,
        "skill_id",
        None,
    ):
        if getattr(
            content,
            "skill",
            None,
        ):
            names.add(
                canonical(
                    content.skill.name,
                )
            )

    metadata = getattr(
        content,
        "metadata",
        None,
    )

    if isinstance(
        metadata,
        dict,
    ):
        metadata_skills = metadata.get(
            "skills",
            [],
        )

        if isinstance(
            metadata_skills,
            list,
        ):
            names.update(
                canonical(skill)
                for skill in metadata_skills
                if skill
            )

    title = getattr(
        content,
        "title",
        "",
    )

    description = getattr(
        content,
        "description",
        "",
    )

    return {
        name
        for name in names
        if name
    }, f"{title} {description}".strip()


def _extract_exchange_text(exchange):
    offered_name = ""

    requested_name = ""

    if getattr(
        exchange,
        "offered_skill",
        None,
    ):
        offered_name = exchange.offered_skill.name

    if getattr(
        exchange,
        "requested_skill",
        None,
    ):
        requested_name = exchange.requested_skill.name

    text = " ".join(
        value
        for value in [
            offered_name,
            requested_name,
            getattr(
                exchange,
                "title",
                "",
            ),
            getattr(
                exchange,
                "description",
                "",
            ),
        ]
        if value
    )

    return (
        canonical(offered_name),
        canonical(requested_name),
        text,
    )

# Candidate scoring

def _calculate_profile_score(
    candidate_skill_names,
    context,
):
    known = context["known"].keys()
    wanted = context["wanted"].keys()
    interests = context["interests"]

    known_score = _best_skill_similarity(
        candidate_skill_names,
        known,
    )

    wanted_score = _best_skill_similarity(
        candidate_skill_names,
        wanted,
    )

    interest_score = _best_skill_similarity(
        candidate_skill_names,
        interests,
    )

    return {
        "known": known_score,
        "wanted": wanted_score,
        "interest": interest_score,
    }


def _calculate_goal_score(
    candidate_skill_names,
    goal_skill_names,
):
    return _best_skill_similarity(
        candidate_skill_names,
        goal_skill_names,
    )


def _calculate_skill_gap_score(
    candidate_skill_names,
    learning_gap_names,
):
    return _best_skill_similarity(
        candidate_skill_names,
        learning_gap_names,
    )


def _calculate_behavior_score(
    candidate_skill_names,
    behavior_context,
):
    if not candidate_skill_names:
        return 0.0

    counts = behavior_context.get(
        "skill_activity_count",
        {},
    )

    if not counts:
        return 0.0

    best = 0.0

    for skill_name in candidate_skill_names:
        for behavior_skill, count in counts.items():
            similarity = calculate_text_similarity(
                skill_name,
                behavior_skill,
            )

            if similarity <= 0:
                continue

            normalized_count = min(
                count / 10.0,
                1.0,
            )

            best = max(
                best,
                similarity * normalized_count,
            )

    return round(
        best,
        4,
    )


def _calculate_total_score(
    *,
    profile_score,
    goal_score,
    skill_gap_score,
    similarity_score,
    behavior_score,
    interest_score,
    popularity_score,
    freshness_score,
):
    """
    Weighted content-based recommendation score.

    The score is intentionally transparent and explainable.
    """

    total = (
        PROFILE_WEIGHT * profile_score
        + GOAL_WEIGHT * goal_score
        + SKILL_GAP_WEIGHT * skill_gap_score
        + SIMILARITY_WEIGHT * similarity_score
        + BEHAVIOR_WEIGHT * behavior_score
        + INTEREST_WEIGHT * interest_score
        + POPULARITY_WEIGHT * popularity_score
        + FRESHNESS_WEIGHT * freshness_score
    )

    return round(
        total,
        6,
    )
    
# Diversity

def _diversify_results(
    results,
    limit,
    category_key="category",
):
    """
    Greedy diversity selection.

    Higher-ranked items remain preferred, but the algorithm avoids
    returning the same category repeatedly when alternatives exist.
    """

    if not results:
        return []

    selected = []

    category_counts = defaultdict(int)

    remaining = list(results)

    while remaining and len(selected) < limit:
        best_index = None
        best_adjusted_score = None

        for index, item in enumerate(
            remaining
        ):
            category = (
                item.get(category_key)
                or "other"
            )

            count = category_counts[
                category
            ]

            base_score = _safe_float(
                item.get(
                    "score",
                    0,
                )
            )

            diversity_penalty = min(
                count * 0.05,
                0.20,
            )

            adjusted_score = (
                base_score
                - diversity_penalty
            )

            if (
                best_adjusted_score is None
                or adjusted_score
                > best_adjusted_score
            ):
                best_adjusted_score = (
                    adjusted_score
                )
                best_index = index

        item = remaining.pop(
            best_index
        )

        category = (
            item.get(category_key)
            or "other"
        )

        category_counts[
            category
        ] += 1

        selected.append(item)

    return selected

# Marketplace recommendations

def _recommend_content(
    user,
    context,
    active_goal,
    skill_gap,
    profile_text,
    limit,
):
    """
    Generate personalized Marketplace recommendations.

    Candidate generation is broad and does not first restrict content
    to the globally most-viewed records.
    """

    queryset = (
        MarketplaceContent.objects
        .exclude(
            creator=user,
        )
        .select_related(
            "creator",
        )
    )

    if hasattr(
        MarketplaceContent,
        "skill",
    ):
        queryset = queryset.select_related(
            "skill",
        )

    candidates = queryset.order_by(
        "-created_at",
    )[:MAX_CONTENT_CANDIDATES]

    goal_skill_names = (
        _get_goal_skill_names(
            active_goal,
        )
        if active_goal
        else set()
    )

    learning_gap_names = {
        canonical(
            item["skill_name"],
        )
        for item in skill_gap.get(
            "learning_gaps",
            [],
        )
        if item.get(
            "skill_name"
        )
    }

    profile_skill_names = set(
        context["known"].keys()
    ) | set(
        context["wanted"].keys()
    ) | set(
        context["interests"]
    )

    results = []

    for content in candidates:
        candidate_skill_names, content_text = (
            _extract_content_skill_names(
                content,
            )
        )

        profile_signals = (
            _calculate_profile_score(
                candidate_skill_names,
                context,
            )
        )

        profile_score = max(
            profile_signals["known"],
            profile_signals["wanted"],
        )

        goal_score = (
            _calculate_goal_score(
                candidate_skill_names,
                goal_skill_names,
            )
        )

        skill_gap_score = (
            _calculate_skill_gap_score(
                candidate_skill_names,
                learning_gap_names,
            )
        )

        similarity_score = (
            calculate_text_similarity(
                profile_text,
                content_text,
            )
            if profile_text and content_text
            else 0.0
        )

        behavior_score = (
            _calculate_behavior_score(
                candidate_skill_names,
                _get_behavior_context(
                    user,
                ),
            )
        )

        interest_score = (
            profile_signals["interest"]
        )

        popularity_score = (
            _popularity_score(
                getattr(
                    content,
                    "view_count",
                    0,
                )
            )
        )

        freshness_score = (
            _freshness_score(
                getattr(
                    content,
                    "created_at",
                    None,
                )
            )
        )

        score = _calculate_total_score(
            profile_score=profile_score,
            goal_score=goal_score,
            skill_gap_score=skill_gap_score,
            similarity_score=similarity_score,
            behavior_score=behavior_score,
            interest_score=interest_score,
            popularity_score=popularity_score,
            freshness_score=freshness_score,
        )

        if score <= 0:
            continue

        reasons = []

        if skill_gap_score >= 0.65:
            reasons.append(
                "Matches a skill in your learning gap"
            )

        if goal_score >= 0.65:
            reasons.append(
                "Relevant to your career goal"
            )

        if profile_signals["wanted"] >= 0.65:
            reasons.append(
                "Matches a skill you want to learn"
            )

        if profile_signals["known"] >= 0.65:
            reasons.append(
                "Related to your existing skills"
            )

        if interest_score >= 0.65:
            reasons.append(
                "Matches your interests"
            )

        if behavior_score >= 0.50:
            reasons.append(
                "Related to your learning activity"
            )

        if not reasons:
            reasons.append(
                "Similar to your learning profile"
            )

        skill_name = None

        if getattr(
            content,
            "skill",
            None,
        ):
            skill_name = (
                content.skill.name
            )

        results.append(
            {
                "id": content.id,
                "title": content.title,
                "description": content.description,
                "content_type": content.content_type,
                "unlock_type": content.unlock_type,
                "price": getattr(
                    content,
                    "price",
                    None,
                ),
                "xp_unlock_cost": getattr(
                    content,
                    "xp_unlock_cost",
                    0,
                ),
                "creator": {
                    "id": content.creator_id,
                    "username": content.creator.username,
                },
                "skill": skill_name,
                "score": score,
                "profile_score": round(
                    profile_score,
                    4,
                ),
                "goal_score": round(
                    goal_score,
                    4,
                ),
                "skill_gap_score": round(
                    skill_gap_score,
                    4,
                ),
                "similarity_score": round(
                    similarity_score,
                    4,
                ),
                "behavior_score": round(
                    behavior_score,
                    4,
                ),
                "interest_score": round(
                    interest_score,
                    4,
                ),
                "matched_skills": sorted(
                    candidate_skill_names
                ),
                "reason": reasons[0],
                "reasons": reasons,
                "category": getattr(
                    getattr(
                        content,
                        "skill",
                        None,
                    ),
                    "category",
                    None,
                ).name
                if getattr(
                    getattr(
                        content,
                        "skill",
                        None,
                    ),
                    "category",
                    None,
                )
                else content.content_type,
            }
        )

    results.sort(
        key=lambda item: (
            -item["score"],
            item["title"].lower(),
        )
    )

    return _diversify_results(
        results,
        limit,
        category_key="category",
    )


# Skill Exchange recommendations

def _recommend_exchanges(
    user,
    context,
    active_goal,
    skill_gap,
    profile_text,
    limit,
):
    """
    Recommend peer-to-peer skill exchanges.
    """

    queryset = (
        ExchangePost.objects
        .exclude(
            creator=user,
        )
        .select_related(
            "creator",
            "offered_skill",
            "requested_skill",
        )
    )

    if hasattr(
        ExchangePost,
        "status",
    ):
        queryset = queryset.filter(
            status="open",
        )

    candidates = queryset.order_by(
        "-created_at",
    )[:MAX_EXCHANGE_CANDIDATES]

    goal_skill_names = (
        _get_goal_skill_names(
            active_goal,
        )
        if active_goal
        else set()
    )

    learning_gap_names = {
        canonical(
            item["skill_name"],
        )
        for item in skill_gap.get(
            "learning_gaps",
            [],
        )
        if item.get(
            "skill_name"
        )
    }

    wanted_names = set(
        context["wanted"].keys()
    )

    known_names = set(
        context["known"].keys()
    )

    interest_names = set(
        context["interests"]
    )

    results = []

    for exchange in candidates:
        offered_name, requested_name, exchange_text = (
            _extract_exchange_text(
                exchange,
            )
        )

        offered_score = calculate_best_similarity(
            offered_name,
            known_names,
        )

        requested_score = calculate_best_similarity(
            requested_name,
            wanted_names,
        )

        interest_score = max(
            calculate_best_similarity(
                offered_name,
                interest_names,
            ),
            calculate_best_similarity(
                requested_name,
                interest_names,
            ),
        )

        goal_score = max(
            calculate_best_similarity(
                offered_name,
                goal_skill_names,
            ),
            calculate_best_similarity(
                requested_name,
                goal_skill_names,
            ),
        )

        skill_gap_score = max(
            calculate_best_similarity(
                offered_name,
                learning_gap_names,
            ),
            calculate_best_similarity(
                requested_name,
                learning_gap_names,
            ),
        )

        profile_score = max(
            offered_score,
            requested_score,
            interest_score,
        )

        similarity_score = (
            calculate_text_similarity(
                profile_text,
                exchange_text,
            )
            if profile_text and exchange_text
            else 0.0
        )

        behavior_score = 0.0

        freshness_score = (
            _freshness_score(
                getattr(
                    exchange,
                    "created_at",
                    None,
                )
            )
        )

        popularity_score = 0.0

        score = (
            0.30 * offered_score
            + 0.25 * requested_score
            + 0.10 * interest_score
            + 0.15 * goal_score
            + 0.15 * skill_gap_score
            + 0.05 * similarity_score
            + 0.03 * freshness_score
            + 0.02 * popularity_score
        )

        score = round(
            score,
            6,
        )

        if score <= 0:
            continue

        reasons = []

        if requested_score >= 0.65:
            reasons.append(
                "Offers a skill you want to learn"
            )

        if offered_score >= 0.65:
            reasons.append(
                "Matches a skill you can exchange"
            )

        if skill_gap_score >= 0.65:
            reasons.append(
                "Supports a skill in your learning gap"
            )

        if goal_score >= 0.65:
            reasons.append(
                "Related to your career goal"
            )

        if interest_score >= 0.65:
            reasons.append(
                "Matches your interests"
            )

        if not reasons:
            reasons.append(
                "Matches your skill profile"
            )

        results.append(
            {
                "id": exchange.id,
                "title": getattr(
                    exchange,
                    "title",
                    "",
                ),
                "description": getattr(
                    exchange,
                    "description",
                    "",
                ),
                "creator": {
                    "id": exchange.creator_id,
                    "username": exchange.creator.username,
                },
                "offered_skill": (
                    exchange.offered_skill.name
                    if exchange.offered_skill
                    else None
                ),
                "requested_skill": (
                    exchange.requested_skill.name
                    if exchange.requested_skill
                    else None
                ),
                "score": score,
                "profile_score": round(
                    profile_score,
                    4,
                ),
                "goal_score": round(
                    goal_score,
                    4,
                ),
                "skill_gap_score": round(
                    skill_gap_score,
                    4,
                ),
                "similarity_score": round(
                    similarity_score,
                    4,
                ),
                "behavior_score": behavior_score,
                "interest_score": round(
                    interest_score,
                    4,
                ),
                "reason": reasons[0],
                "reasons": reasons,
                "category": (
                    exchange.offered_skill.category.name
                    if (
                        exchange.offered_skill
                        and exchange.offered_skill.category
                    )
                    else "other"
                ),
            }
        )

    results.sort(
        key=lambda item: (
            -item["score"],
            item["title"].lower(),
        )
    )

    return _diversify_results(
        results,
        limit,
        category_key="category",
    )

# Public recommendation service

def get_personalized_recommendations(
    user,
    content_limit=DEFAULT_CONTENT_LIMIT,
    exchange_limit=DEFAULT_EXCHANGE_LIMIT,
):
    """
    Main personalized recommendation entry point.

    Recommendation architecture:

        User profile
            +
        Interests
            +
        Known skills
            +
        Wanted skills
            +
        Career goal / ESCO skills
            +
        Skill gap
            +
        Learning activity
            +
        Content similarity
            +
        Freshness / popularity
            ↓
        Personalized recommendations
    """

    if user is None or not user.is_authenticated:
        raise ValueError(
            "Authenticated user is required."
        )

    context = _get_user_skill_context(
        user,
    )

    active_goal = _get_active_goal(
        user,
    )

    profile_text = _get_user_profile_text(
        user=user,
        context=context,
        active_goal=active_goal,
    )

    skill_gap = {
        "goal": None,
        "required_skills": [],
        "missing_skills": [],
        "learning_gaps": [],
        "method": None,
    }

    if active_goal:
        try:
            skill_gap = analyze_user_skill_gap(
                user=user,
                user_goal=active_goal,
            )
        except Exception:
            skill_gap = {
                "goal": {
                    "id": active_goal.goal_id,
                    "title": active_goal.goal.title,
                },
                "required_skills": [],
                "missing_skills": [],
                "learning_gaps": [],
                "method": None,
            }

    ai_recommended_skills = [
        {
            "id": item["skill_id"],
            "name": item["skill_name"],
            "status": item["status"],
            "target_level": item["target_level"],
            "current_level": item["current_level"],
            "gap_score": item["gap_score"],
        }
        for item in skill_gap.get(
            "learning_gaps",
            [],
        )[:5]
    ]

    content = _recommend_content(
        user=user,
        context=context,
        active_goal=active_goal,
        skill_gap=skill_gap,
        profile_text=profile_text,
        limit=content_limit,
    )

    exchanges = _recommend_exchanges(
        user=user,
        context=context,
        active_goal=active_goal,
        skill_gap=skill_gap,
        profile_text=profile_text,
        limit=exchange_limit,
    )

    return {
        "interests": sorted(
            context["interests"]
        ),
        "known_skills": sorted(
            context["known"].keys()
        ),
        "wanted_skills": sorted(
            context["wanted"].keys()
        ),
        "active_goal": (
            {
                "id": active_goal.goal_id,
                "title": active_goal.goal.title,
            }
            if active_goal
            else None
        ),
        "ai_recommended_skills": (
            ai_recommended_skills
        ),
        "skill_gap": skill_gap,
        "content": content,
        "exchange": exchanges,
        "method": (
            "Content-based personalization using "
            "user profile, ESCO career-goal skills, "
            "skill-gap analysis, TF-IDF cosine similarity, "
            "learning activity, freshness, popularity, "
            "and diversity-aware ranking."
        ),
    }