from typing import Iterable

from goals.models import GoalSkill
from skills.models import UserInterest, UserSkill

from .similarity import calculate_text_similarity, canonical


DEFAULT_RELEVANCE_THRESHOLD = 0.35
ESSENTIAL_RELEVANCE_THRESHOLD = 0.18
MAX_RELEVANT_SKILLS = 40


def _safe_text(value):
    return str(value or "").strip()


def _get_user_skill_names(user_skills: Iterable[UserSkill]):
    known = []
    wanted = []

    for user_skill in user_skills:
        if user_skill.skill_id:
            name = canonical(user_skill.skill.name)
        else:
            name = canonical(user_skill.custom_name)

        if not name:
            continue

        if user_skill.skill_type == UserSkill.TYPE_KNOWN:
            known.append(name)

        elif user_skill.skill_type == UserSkill.TYPE_WANTED:
            wanted.append(name)

    return known, wanted


def _get_interest_names(user):
    return [
        canonical(item.skill.name)
        for item in (
            UserInterest.objects
            .select_related("skill")
            .filter(user=user)
        )
        if item.skill_id and canonical(item.skill.name)
    ]


def _best_similarity(source, candidates):
    if not source or not candidates:
        return 0.0

    return max(
        (
            calculate_text_similarity(
                source,
                candidate,
            )
            for candidate in candidates
            if candidate
        ),
        default=0.0,
    )


def _relation_score(relation_type):
    if relation_type == GoalSkill.RELATION_ESSENTIAL:
        return 1.0

    return 0.65


def _reuse_score(skill):
    reuse_level = getattr(
        skill,
        "reuse_level",
        None,
    )

    if reuse_level == "occupation_specific":
        return 0.95

    if reuse_level == "sector_specific":
        return 0.85

    if reuse_level == "cross_sectoral":
        return 0.65

    if reuse_level == "transversal":
        return 0.55

    return 0.60


def _skill_type_score(skill):
    skill_type = getattr(
        skill,
        "skill_type",
        None,
    )

    if skill_type == "skill_competence":
        return 0.90

    if skill_type == "knowledge":
        return 0.80

    return 0.70


def _calculate_relevance_score(
    requirement,
    goal_text,
    known_names,
    wanted_names,
    interest_names,
):
    skill = requirement.skill

    skill_name = canonical(
        skill.name,
    )

    description = canonical(
        skill.description,
    )

    goal_similarity = _best_similarity(
        skill_name,
        [
            canonical(goal_text),
            description,
        ],
    )

    known_similarity = _best_similarity(
        skill_name,
        known_names,
    )

    wanted_similarity = _best_similarity(
        skill_name,
        wanted_names,
    )

    interest_similarity = _best_similarity(
        skill_name,
        interest_names,
    )

    relation_score = _relation_score(
        requirement.relation_type,
    )

    reuse_score = _reuse_score(
        skill,
    )

    type_score = _skill_type_score(
        skill,
    )

    score = (
        relation_score * 0.30
        + goal_similarity * 0.25
        + known_similarity * 0.15
        + wanted_similarity * 0.15
        + interest_similarity * 0.05
        + reuse_score * 0.05
        + type_score * 0.05
    )

    return round(
        min(score, 1.0),
        4,
    )


def rank_relevant_goal_skills(
    career_goal,
    user=None,
    user_skills=None,
    relevance_threshold=DEFAULT_RELEVANCE_THRESHOLD,
    max_results=MAX_RELEVANT_SKILLS,
):
    """
    Rank and filter GoalSkill records by AI-based relevance.

    CareerGoal and GoalSkill remain the source knowledge base.
    This function only selects which existing GoalSkill records
    are relevant for personalized skill-gap analysis.

    Essential skills use a lower protection threshold so that
    important ESCO requirements are not accidentally removed.

    Optional skills require stronger relevance evidence.

    TF-IDF cosine similarity is used as the text-based
    matching signal.
    """

    if career_goal is None:
        return []

    requirements = list(
        GoalSkill.objects
        .select_related(
            "skill",
            "goal",
        )
        .filter(
            goal=career_goal,
        )
    )

    if not requirements:
        return []

    user_skills = list(
        user_skills or []
    )

    known_names, wanted_names = (
        _get_user_skill_names(
            user_skills,
        )
    )

    interest_names = []

    if user is not None:
        interest_names = _get_interest_names(
            user,
        )

    goal_text = _safe_text(
        f"{career_goal.title} "
        f"{career_goal.description}"
    )

    ranked = []

    for requirement in requirements:
        skill = requirement.skill

        score = _calculate_relevance_score(
            requirement=requirement,
            goal_text=goal_text,
            known_names=known_names,
            wanted_names=wanted_names,
            interest_names=interest_names,
        )

        is_essential = (
            requirement.relation_type
            == GoalSkill.RELATION_ESSENTIAL
        )

        threshold = (
            ESSENTIAL_RELEVANCE_THRESHOLD
            if is_essential
            else relevance_threshold
        )

        if score < threshold:
            continue

        ranked.append(
            {
                "requirement": requirement,
                "skill": skill,
                "relevance_score": score,
            }
        )

    ranked.sort(
        key=lambda item: (
            0
            if (
                item["requirement"].relation_type
                == GoalSkill.RELATION_ESSENTIAL
            )
            else 1,
            -item["relevance_score"],
            item["skill"].name.lower(),
        )
    )

    return ranked[:max_results]