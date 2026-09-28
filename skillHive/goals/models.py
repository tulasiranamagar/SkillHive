from django.contrib.auth import get_user_model
from django.db import models

from skills.models import Skill


User = get_user_model()


class CareerGoal(models.Model):
    title = models.CharField(
        max_length=255,
        unique=True,
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class GoalSkill(models.Model):
    RELATION_ESSENTIAL = "essential"
    RELATION_OPTIONAL = "optional"

    RELATION_TYPE_CHOICES = [
        (RELATION_ESSENTIAL, "Essential"),
        (RELATION_OPTIONAL, "Optional"),
    ]

    goal = models.ForeignKey(
        CareerGoal,
        on_delete=models.CASCADE,
        related_name="skills",
    )

    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="career_goals",
    )

    relation_type = models.CharField(
        max_length=20,
        choices=RELATION_TYPE_CHOICES,
        default=RELATION_ESSENTIAL,
        db_index=True,
    )

    class Meta:
        ordering = [
            "relation_type",
            "skill__name",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["goal", "skill"],
                name="unique_goal_skill",
            ),
        ]

        indexes = [
            models.Index(
                fields=["goal", "relation_type"],
                name="goal_skill_relation_idx",
            ),
            models.Index(
                fields=["skill", "relation_type"],
                name="skill_goal_relation_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.goal.title} - "
            f"{self.skill.name} ({self.relation_type})"
        )


class UserGoal(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="career_goals",
    )

    goal = models.ForeignKey(
        CareerGoal,
        on_delete=models.CASCADE,
        related_name="users",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["user", "goal"],
                name="unique_user_career_goal",
            ),
        ]

        indexes = [
            models.Index(
                fields=["user", "is_active"],
                name="user_goal_active_idx",
            ),
        ]

    def __str__(self):
        return f"{self.user} → {self.goal}"