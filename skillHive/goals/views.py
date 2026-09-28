from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsSkillHiveAdmin

from .models import CareerGoal, GoalSkill, UserGoal
from .serializers import (
    AdminCareerGoalSerializer,
    AdminGoalSkillSerializer,
    CareerGoalSerializer,
    UserGoalSerializer,
)
from .services import (
    GoalServiceError,
    deactivate_goal as deactivate_goal_service,
    get_active_goal,
    get_user_goals,
    select_goal as select_goal_service,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_goals(request):
    goals = (
        CareerGoal.objects
        .prefetch_related("skills__skill")
        .order_by("title")
    )

    serializer = CareerGoalSerializer(
        goals,
        many=True,
    )

    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def goal_detail(request, pk):
    goal = get_object_or_404(
        CareerGoal.objects.prefetch_related(
            "skills__skill",
        ),
        pk=pk,
    )

    return Response(
        CareerGoalSerializer(goal).data,
    )


@api_view(["POST"])
@permission_classes([IsSkillHiveAdmin])
def create_goal(request):
    serializer = AdminCareerGoalSerializer(
        data=request.data,
    )

    serializer.is_valid(
        raise_exception=True,
    )

    goal = serializer.save()

    goal = (
        CareerGoal.objects
        .prefetch_related("skills__skill")
        .get(pk=goal.pk)
    )

    return Response(
        {
            "message": "Career goal created successfully.",
            "goal": AdminCareerGoalSerializer(goal).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsSkillHiveAdmin])
def update_goal(request, pk):
    goal = get_object_or_404(
        CareerGoal,
        pk=pk,
    )

    serializer = AdminCareerGoalSerializer(
        goal,
        data=request.data,
        partial=request.method == "PATCH",
    )

    serializer.is_valid(
        raise_exception=True,
    )

    goal = serializer.save()

    goal = (
        CareerGoal.objects
        .prefetch_related("skills__skill")
        .get(pk=goal.pk)
    )

    return Response(
        {
            "message": "Career goal updated successfully.",
            "goal": AdminCareerGoalSerializer(goal).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
@permission_classes([IsSkillHiveAdmin])
def delete_goal(request, pk):
    goal = get_object_or_404(
        CareerGoal,
        pk=pk,
    )

    goal.delete()

    return Response(
        {
            "message": "Career goal deleted successfully.",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsSkillHiveAdmin])
def create_goal_skill(request):
    serializer = AdminGoalSkillSerializer(
        data=request.data,
    )

    serializer.is_valid(
        raise_exception=True,
    )

    goal_skill = serializer.save()

    goal_skill = (
        GoalSkill.objects
        .select_related("goal", "skill")
        .get(pk=goal_skill.pk)
    )

    return Response(
        {
            "message": "Goal skill added successfully.",
            "goal_skill": AdminGoalSkillSerializer(
                goal_skill,
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsSkillHiveAdmin])
def update_goal_skill(request, pk):
    goal_skill = get_object_or_404(
        GoalSkill,
        pk=pk,
    )

    serializer = AdminGoalSkillSerializer(
        goal_skill,
        data=request.data,
        partial=request.method == "PATCH",
    )

    serializer.is_valid(
        raise_exception=True,
    )

    goal_skill = serializer.save()

    goal_skill = (
        GoalSkill.objects
        .select_related("goal", "skill")
        .get(pk=goal_skill.pk)
    )

    return Response(
        {
            "message": "Goal skill updated successfully.",
            "goal_skill": AdminGoalSkillSerializer(
                goal_skill,
            ).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
@permission_classes([IsSkillHiveAdmin])
def delete_goal_skill(request, pk):
    goal_skill = get_object_or_404(
        GoalSkill,
        pk=pk,
    )

    goal_skill.delete()

    return Response(
        {
            "message": "Goal skill removed successfully.",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def select_goal(request):
    goal_id = request.data.get("goal_id")

    if not goal_id:
        return Response(
            {
                "error": "goal_id is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    goal = get_object_or_404(
        CareerGoal,
        pk=goal_id,
    )

    try:
        user_goal, created = select_goal_service(
            user=request.user,
            goal=goal,
        )
    except GoalServiceError as exc:
        return Response(
            {
                "error": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_goal = (
        UserGoal.objects
        .select_related("goal")
        .prefetch_related("goal__skills__skill")
        .get(pk=user_goal.pk)
    )

    return Response(
        {
            "message": "Career goal selected successfully.",
            "created": created,
            "user_goal": UserGoalSerializer(
                user_goal,
            ).data,
        },
        status=(
            status.HTTP_201_CREATED
            if created
            else status.HTTP_200_OK
        ),
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_goals(request):
    active_only = (
        request.query_params
        .get("active_only", "false")
        .lower()
        == "true"
    )

    user_goals = get_user_goals(
        user=request.user,
        active_only=active_only,
    )

    return Response(
        UserGoalSerializer(
            user_goals,
            many=True,
        ).data,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_active_goal(request):
    user_goal = get_active_goal(
        user=request.user,
    )

    if not user_goal:
        return Response(
            {
                "message": "No active career goal selected.",
                "goal": None,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        UserGoalSerializer(
            user_goal,
        ).data,
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def deactivate_goal(request, pk):
    goal = get_object_or_404(
        CareerGoal,
        pk=pk,
    )

    try:
        user_goal, changed = deactivate_goal_service(
            user=request.user,
            goal=goal,
        )
    except GoalServiceError as exc:
        return Response(
            {
                "error": str(exc),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if not changed:
        return Response(
            {
                "message": "Goal is already inactive.",
                "goal_id": goal.id,
                "is_active": False,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            "message": "Career goal deactivated successfully.",
            "goal_id": user_goal.goal_id,
            "is_active": False,
        },
        status=status.HTTP_200_OK,
    )