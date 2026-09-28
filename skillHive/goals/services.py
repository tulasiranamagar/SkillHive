from django.db import transaction

from .models import CareerGoal, GoalSkill, UserGoal


class GoalServiceError(Exception):
    pass


@transaction.atomic
def select_goal(*, user, goal):
    if not user or not user.is_authenticated:
        raise GoalServiceError(
            "Authentication is required."
        )

    goal = CareerGoal.objects.filter(
        pk=goal.pk,
    ).first()

    if not goal:
        raise GoalServiceError(
            "Career goal does not exist."
        )

    UserGoal.objects.select_for_update().filter(
        user=user,
        is_active=True,
    ).update(
        is_active=False,
    )

    user_goal = (
        UserGoal.objects
        .select_for_update()
        .filter(
            user=user,
            goal=goal,
        )
        .first()
    )

    if user_goal:
        created = False

        if not user_goal.is_active:
            user_goal.is_active = True

            user_goal.save(
                update_fields=[
                    "is_active",
                    "updated_at",
                ],
            )

        return user_goal, created

    user_goal = UserGoal.objects.create(
        user=user,
        goal=goal,
        is_active=True,
    )

    return user_goal, True


@transaction.atomic
def deactivate_goal(*, user, goal):
    user_goal = (
        UserGoal.objects
        .select_for_update()
        .filter(
            user=user,
            goal=goal,
        )
        .first()
    )

    if not user_goal:
        raise GoalServiceError(
            "You have not selected this career goal."
        )

    if not user_goal.is_active:
        return user_goal, False

    user_goal.is_active = False

    user_goal.save(
        update_fields=[
            "is_active",
            "updated_at",
        ],
    )

    return user_goal, True


def get_active_goal(*, user):
    return (
        UserGoal.objects
        .filter(
            user=user,
            is_active=True,
        )
        .select_related("goal")
        .prefetch_related(
            "goal__skills__skill",
        )
        .first()
    )


def get_user_goals(*, user, active_only=False):
    queryset = (
        UserGoal.objects
        .filter(
            user=user,
        )
        .select_related("goal")
        .prefetch_related(
            "goal__skills__skill",
        )
        .order_by(
            "-is_active",
            "-created_at",
        )
    )

    if active_only:
        queryset = queryset.filter(
            is_active=True,
        )

    return queryset


def get_goal_skill_ids(*, goal):
    return list(
        GoalSkill.objects
        .filter(
            goal=goal,
        )
        .values_list(
            "skill_id",
            flat=True,
        )
    )


def get_goal_skills(*, goal):
    return (
        GoalSkill.objects
        .filter(
            goal=goal,
        )
        .select_related("skill")
        .order_by(
            "relation_type",
            "skill__name",
            "id",
        )
    )