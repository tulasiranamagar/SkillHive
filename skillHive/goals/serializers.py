from rest_framework import serializers

from .models import CareerGoal, GoalSkill, UserGoal


class GoalSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(
        source="skill.name",
        read_only=True,
    )

    class Meta:
        model = GoalSkill
        fields = (
            "id",
            "skill",
            "skill_name",
            "relation_type",
        )

        read_only_fields = (
            "id",
            "skill_name",
        )


class CareerGoalSerializer(serializers.ModelSerializer):
    skills = GoalSkillSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = CareerGoal

        fields = (
            "id",
            "title",
            "description",
            "skills",
            "created_at",
        )

        read_only_fields = (
            "id",
            "skills",
            "created_at",
        )


class UserGoalSerializer(serializers.ModelSerializer):
    goal_title = serializers.CharField(
        source="goal.title",
        read_only=True,
    )

    goal = CareerGoalSerializer(
        read_only=True,
    )

    class Meta:
        model = UserGoal

        fields = (
            "id",
            "goal",
            "goal_title",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "goal",
            "goal_title",
            "is_active",
            "created_at",
            "updated_at",
        )


class AdminCareerGoalSerializer(serializers.ModelSerializer):
    skills = GoalSkillSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = CareerGoal

        fields = (
            "id",
            "title",
            "description",
            "skills",
            "created_at",
        )

        read_only_fields = (
            "id",
            "skills",
            "created_at",
        )



class AdminGoalSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(
        source="skill.name",
        read_only=True,
    )

    goal_title = serializers.CharField(
        source="goal.title",
        read_only=True,
    )

    class Meta:
        model = GoalSkill

        fields = (
            "id",
            "goal",
            "goal_title",
            "skill",
            "skill_name",
            "relation_type",
        )

        read_only_fields = (
            "id",
            "goal_title",
            "skill_name",
        )

    def validate(self, attrs):
        goal = attrs.get(
            "goal",
            getattr(self.instance, "goal", None),
        )

        skill = attrs.get(
            "skill",
            getattr(self.instance, "skill", None),
        )

        if goal and skill:
            queryset = GoalSkill.objects.filter(
                goal=goal,
                skill=skill,
            )

            if self.instance:
                queryset = queryset.exclude(
                    pk=self.instance.pk,
                )

            if queryset.exists():
                raise serializers.ValidationError(
                    "This skill is already assigned to this career goal."
                )

        return attrs