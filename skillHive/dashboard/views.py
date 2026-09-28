from django.db.models import Sum

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ai_engine.services import get_personalized_recommendations
from gamification.models import UserBadge, XPTransaction
from goals.models import UserGoal
from roadmaps.models import RoadmapTask
from skills.models import UserSkill

from .serializers import DashboardSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):

    user = request.user

    user_goal = (
        UserGoal.objects
        .filter(
            user=user,
            is_active=True,
        )
        .select_related("goal")
        .first()
    )

    active_goal = (
        user_goal.goal.title
        if user_goal
        else None
    )


    if user_goal:

        tasks = (
            RoadmapTask.objects
            .filter(
                user_goal=user_goal
            )
            .select_related("skill")
            .order_by("id")
        )

    else:

        tasks = RoadmapTask.objects.none()

    total_tasks = tasks.count()

    completed_tasks = (
        tasks
        .filter(
            completed=True
        )
        .count()
    )

    if total_tasks > 0:

        progress = (
            completed_tasks
            / total_tasks
        ) * 100

    else:

        progress = 0


    roadmap_preview = tasks[:5]

    roadmap_data = [
        {
            "title": task.title,
            "skill": (
                task.skill.name
                if task.skill
                else None
            ),
            "completed": task.completed,
        }
        for task in roadmap_preview
    ]


    total_xp = (
        XPTransaction.objects
        .filter(
            user=user
        )
        .aggregate(
            total=Sum("points")
        )["total"]
        or 0
    )

    total_xp = int(total_xp)
    from gamification.services import calculate_level
    level = calculate_level(total_xp)

    badges = (
        UserBadge.objects
        .filter(
            user=user
        )
        .select_related("badge")
        .order_by("-earned_at")
    )

    badge_data = [
        {
            "name": user_badge.badge.name,
            "description": (
                user_badge.badge.description
            ),
        }
        for user_badge in badges
    ]


    xp_history = (
        XPTransaction.objects
        .filter(
            user=user
        )
        .order_by(
            "-created_at"
        )[:10]
    )

    xp_data = [
        {
            "points": transaction.points,
            "reason": transaction.reason,
            "created_at": transaction.created_at,
        }
        for transaction in xp_history
    ]

    known_skills = list(
        UserSkill.objects
        .filter(
            user=user,
            skill_type=UserSkill.KNOWN,
        )
        .select_related("skill")
        .values_list(
            "skill__name",
            flat=True,
        )
    )

    wanted_skills = list(
        UserSkill.objects
        .filter(
            user=user,
            skill_type=UserSkill.WANTED,
        )
        .select_related("skill")
        .values_list(
            "skill__name",
            flat=True,
        )
    )

    try:

        recommendation_result = (
            get_personalized_recommendations(
                user=user,
                content_limit=3,
                exchange_limit=3,
            )
        )

        recommendations = {
            "interests": [{"id": i.id, "name": i.skill.name} for i in user.interests.select_related("skill")],

            "known_skills": known_skills,

            "wanted_skills": wanted_skills,

            "active_goal": recommendation_result.get(
                "active_goal",
                active_goal,
            ),

            "ai_recommended_skills": (
                recommendation_result.get(
                    "ai_recommended_skills",
                    [],
                )
            ),

            "content": recommendation_result.get(
                "content",
                [],
            ),

            "exchange": recommendation_result.get(
                "exchange",
                [],
            ),

            "method": recommendation_result.get(
                "method",
                "content-based",
            ),
        }

    except Exception:

        # Recommendations must never prevent
        # the main dashboard from loading.

        recommendations = {
            "interests": [],

            "known_skills": known_skills,

            "wanted_skills": wanted_skills,

            "active_goal": active_goal,

            "ai_recommended_skills": [],

            "content": [],

            "exchange": [],

            "method": "unavailable",
        }


    data = {
        "username": user.username,

        "xp": total_xp,

        "level": level,

        "active_goal": active_goal,

        "progress": round(
            progress,
            2,
        ),

        "total_tasks": total_tasks,

        "completed_tasks": completed_tasks,

        "roadmap_preview": roadmap_data,

        "badges": badge_data,

        "xp_history": xp_data,

        "recommendations": recommendations,
    }

    serializer = DashboardSerializer(
        data
    )

    return Response(
        serializer.data
    )