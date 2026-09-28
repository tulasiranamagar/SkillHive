from typing import Iterable

from goals.models import CareerGoal, GoalSkill, UserGoal
from skills.models import Skill, UserSkill

from .similarity import (
    calculate_text_similarity,
    canonical,
)
from .skill_relevance import (
    rank_relevant_goal_skills,
)


class AIEngineError(Exception):
    """
    Base exception for AI engine errors.
    """


MASTERED = "mastered"
IMPROVE = "improve"
MISSING = "missing"

RELATION_ESSENTIAL = GoalSkill.RELATION_ESSENTIAL
RELATION_OPTIONAL = GoalSkill.RELATION_OPTIONAL

TARGET_LEVEL_ESSENTIAL = 4
TARGET_LEVEL_OPTIONAL = 3


def _get_active_user_goal(user):
    return (
        UserGoal.objects
        .select_related("goal")
        .filter(
            user=user,
            is_active=True,
        )
        .first()
    )


def _get_goal_requirements(
    career_goal,
    user=None,
    user_skills=None,
):
    """
    Return AI-selected relevant GoalSkill requirements.

    The original GoalSkill records remain untouched.
    """

    ranked = rank_relevant_goal_skills(
        career_goal=career_goal,
        user=user,
        user_skills=user_skills,
    )

    return [
        item["requirement"]
        for item in ranked
    ]


def _get_target_level(relation_type):
    if relation_type == RELATION_ESSENTIAL:
        return TARGET_LEVEL_ESSENTIAL

    return TARGET_LEVEL_OPTIONAL


def _relation_priority(relation_type):
    if relation_type == RELATION_ESSENTIAL:
        return 0

    return 1


def _get_user_known_skills(
    user_skills: Iterable[UserSkill],
):
    """
    Return known skills indexed by canonical skill name.

    The actual Skill ID remains the authoritative identity.
    """

    known_skills = {}

    for user_skill in user_skills:
        if user_skill.skill_type != UserSkill.TYPE_KNOWN:
            continue

        if not user_skill.skill_id:
            continue

        skill_name = canonical(
            user_skill.skill.name,
        )

        if not skill_name:
            continue

        existing = known_skills.get(skill_name)

        if existing is None:
            known_skills[skill_name] = user_skill
            continue

        if user_skill.level > existing.level:
            known_skills[skill_name] = user_skill

    return known_skills


def _calculate_gap_score(
    status,
    level,
    target_level,
    relation_type,
):
    if status == MISSING:
        if relation_type == RELATION_ESSENTIAL:
            return 1.0

        return 0.7

    if status == IMPROVE:
        gap = max(
            target_level - level,
            0,
        )

        if target_level <= 0:
            return 0.0

        return round(
            gap / target_level,
            4,
        )

    return 0.0


def analyze_skill_gap(
    user_skills,
    career_goal: CareerGoal,
    user_skill_levels=None,
    recommendation_limit=10,
    user=None,
):
    """
    Analyze the gap between a user's known skills and the
    AI-selected relevant skills for a career goal.

    Exact Skill ID matching remains authoritative.

    TF-IDF cosine similarity is used for relevance ranking,
    but similarity never marks a skill as mastered.
    """

    if career_goal is None:
        raise AIEngineError(
            "Career goal is required for skill-gap analysis."
        )

    user_skills = list(
        user_skills or []
    )

    known_skills = _get_user_known_skills(
        user_skills,
    )

    user_skill_levels = user_skill_levels or {}

    requirements = _get_goal_requirements(
        career_goal=career_goal,
        user=user,
        user_skills=user_skills,
    )

    results = []

    known_names = list(
        known_skills.keys()
    )

    for requirement in requirements:
        skill = requirement.skill
        relation_type = requirement.relation_type

        skill_name = canonical(
            skill.name,
        )

        target_level = _get_target_level(
            relation_type,
        )

        exact_user_skill = None

        for user_skill in user_skills:
            if (
                user_skill.skill_type
                == UserSkill.TYPE_KNOWN
                and user_skill.skill_id
                == skill.id
            ):
                exact_user_skill = user_skill
                break

        if exact_user_skill:
            level = int(
                user_skill_levels.get(
                    skill.id,
                    exact_user_skill.level,
                )
            )

            similarity_score = 1.0

        else:
            level = 0
            similarity_score = 0.0

            if skill_name and known_names:
                similarity_score = max(
                    calculate_text_similarity(
                        skill_name,
                        known_name,
                    )
                    for known_name in known_names
                )

        if exact_user_skill:
            if level >= target_level:
                status = MASTERED
            else:
                status = IMPROVE
        else:
            status = MISSING

        gap_score = _calculate_gap_score(
            status=status,
            level=level,
            target_level=target_level,
            relation_type=relation_type,
        )

        results.append(
            {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "relation_type": relation_type,
                "target_level": target_level,
                "current_level": level,
                "status": status,
                "similarity_score": round(
                    similarity_score,
                    4,
                ),
                "gap_score": gap_score,
            }
        )

    results.sort(
        key=lambda item: (
            _relation_priority(
                item["relation_type"],
            ),
            {
                MISSING: 0,
                IMPROVE: 1,
                MASTERED: 2,
            }.get(
                item["status"],
                3,
            ),
            -item["gap_score"],
            item["skill_name"].lower(),
        )
    )

    learning_gaps = [
        item
        for item in results
        if item["status"] in {
            MISSING,
            IMPROVE,
        }
    ]

    return {
        "goal": {
            "id": career_goal.id,
            "title": career_goal.title,
        },
        "required_skills": results,
        "missing_skills": learning_gaps[
            :recommendation_limit
        ],
        "learning_gaps": learning_gaps,
        "method": (
            "ESCO GoalSkill requirements + AI relevance "
            "ranking + exact user skill matching + "
            "TF-IDF cosine similarity"
        ),
    }


def analyze_user_skill_gap(
    user,
    user_goal=None,
    career_goal=None,
):
    """
    Analyze the authenticated user's active career goal.
    """

    if user is None or not user.is_authenticated:
        raise AIEngineError(
            "Authenticated user is required."
        )

    if user_goal is None:
        user_goal = (
            UserGoal.objects
            .select_related("goal")
            .filter(
                user=user,
                is_active=True,
            )
            .first()
        )

    if user_goal is None:
        raise AIEngineError(
            "No active career goal found for this user."
        )

    if user_goal.user_id != user.id:
        raise AIEngineError(
            "This career goal does not belong to the user."
        )

    if not user_goal.is_active:
        raise AIEngineError(
            "The selected career goal is not active."
        )

    if career_goal is None:
        career_goal = user_goal.goal

    if career_goal is None:
        raise AIEngineError(
            "Career goal could not be resolved."
        )

    user_skills = list(
        UserSkill.objects
        .select_related("skill")
        .filter(
            user=user,
        )
    )

    user_skill_levels = {
        item.skill_id: item.level
        for item in user_skills
        if (
            item.skill_type
            == UserSkill.TYPE_KNOWN
            and item.skill_id
        )
    }

    return analyze_skill_gap(
        user_skills=user_skills,
        career_goal=career_goal,
        user_skill_levels=user_skill_levels,
        user=user,
    )


def get_missing_skills_for_user_goal(
    user_goal,
):
    """
    Return Skill objects that are currently missing or need
    improvement for a user's selected career goal.

    The function name is retained for compatibility with
    the Roadmap app.
    """

    if user_goal is None:
        return []

    user = user_goal.user

    analysis = analyze_user_skill_gap(
        user=user,
        user_goal=user_goal,
    )

    learning_gap_ids = [
        item["skill_id"]
        for item in analysis["learning_gaps"]
    ]

    if not learning_gap_ids:
        return []

    skills = Skill.objects.filter(
        id__in=learning_gap_ids,
    )

    skill_map = {
        skill.id: skill
        for skill in skills
    }

    return [
        skill_map[skill_id]
        for skill_id in learning_gap_ids
        if skill_id in skill_map
    ]