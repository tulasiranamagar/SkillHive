from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class SkillCategory(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    ordering = models.PositiveIntegerField(
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["ordering", "name"]
        verbose_name = "Skill Category"
        verbose_name_plural = "Skill Categories"

    def __str__(self):
        return self.name


class Skill(models.Model):
    TYPE_KNOWLEDGE = "knowledge"
    TYPE_SKILL_COMPETENCE = "skill_competence"

    TYPE_CHOICES = [
        (
            TYPE_KNOWLEDGE,
            "Knowledge",
        ),
        (
            TYPE_SKILL_COMPETENCE,
            "Skill / Competence",
        ),
    ]

    REUSE_TRANSVERSAL = "transversal"
    REUSE_CROSS_SECTORAL = "cross_sectoral"
    REUSE_SECTOR_SPECIFIC = "sector_specific"
    REUSE_OCCUPATION_SPECIFIC = "occupation_specific"

    REUSE_LEVEL_CHOICES = [
        (
            REUSE_TRANSVERSAL,
            "Transversal",
        ),
        (
            REUSE_CROSS_SECTORAL,
            "Cross-sectoral",
        ),
        (
            REUSE_SECTOR_SPECIFIC,
            "Sector-specific",
        ),
        (
            REUSE_OCCUPATION_SPECIFIC,
            "Occupation-specific",
        ),
    ]

    name = models.CharField(
        max_length=255,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    # ESCO skill classification:
    # knowledge or skill/competence.
    skill_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        default=TYPE_SKILL_COMPETENCE,
    )

    # Reuse classification is optional because imported ESCO records
    # may not contain this information.
    reuse_level = models.CharField(
        max_length=30,
        choices=REUSE_LEVEL_CHOICES,
        null=True,
        blank=True,
    )

    category = models.ForeignKey(
        SkillCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="skills",
    )

    # Optional ESCO identifiers.
    # SkillHive can also contain platform-created skills.
    esco_uri = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )

    esco_code = models.CharField(
        max_length=100,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

        indexes = [
            models.Index(
                fields=["skill_type"],
                name="skill_type_idx",
            ),
            models.Index(
                fields=["category"],
                name="skill_category_idx",
            ),
        ]

    def __str__(self):
        return self.name


class UserSkill(models.Model):
    TYPE_KNOWN = "known"
    TYPE_WANTED = "wanted"

    TYPE_CHOICES = [
        (
            TYPE_KNOWN,
            "Known",
        ),
        (
            TYPE_WANTED,
            "Wanted",
        ),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="skills",
    )

    # Existing SkillHive/ESCO skill.
    #
    # Nullable because a user can also enter a custom skill that
    # does not exist in the global Skill Library.
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="user_skills",
        null=True,
        blank=True,
    )

    # User-created skill that is not yet part of the global Skill
    # Library.
    #
    # Example:
    #   "Blender Geometry Nodes"
    #   "Figma Variables"
    #   "Advanced Excel VBA"
    custom_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    skill_type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
    )

    level = models.PositiveSmallIntegerField(
        default=1,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ],
    )

    experience_years = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=0,
        validators=[
            MinValueValidator(0),
        ],
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-level",
            "skill__name",
            "custom_name",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "skill",
                ],
                name="unique_user_skill",
            ),
            models.UniqueConstraint(
                fields=[
                    "user",
                    "custom_name",
                ],
                name="unique_user_custom_skill",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "user",
                    "skill_type",
                ],
                name="user_skill_type_idx",
            ),
            models.Index(
                fields=[
                    "user",
                    "custom_name",
                ],
                name="user_custom_skill_idx",
            ),
        ]

    def __str__(self):
        if self.skill_id:
            skill_name = self.skill.name
        else:
            skill_name = self.custom_name or "Unnamed skill"

        return (
            f"{self.user.username} - "
            f"{skill_name} - "
            f"{self.skill_type}"
        )


class UserInterest(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="skill_interests",
    )

    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="interested_users",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["skill__name"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "skill",
                ],
                name="unique_user_interest",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.skill.name}"
        )