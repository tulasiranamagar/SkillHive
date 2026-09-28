from rest_framework import serializers

from .models import (
    Skill,
    SkillCategory,
    UserInterest,
    UserSkill,
)


class SkillCategorySerializer(
    serializers.ModelSerializer
):
    skill_count = serializers.IntegerField(
        read_only=True,
    )

    class Meta:
        model = SkillCategory

        fields = [
            "id",
            "name",
            "description",
            "ordering",
            "skill_count",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "skill_count",
            "created_at",
        ]


class SkillSerializer(
    serializers.ModelSerializer
):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    class Meta:
        model = Skill

        fields = [
            "id",
            "name",
            "description",
            "skill_type",
            "reuse_level",
            "category",
            "category_name",
            "esco_uri",
            "esco_code",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

class UserSkillSerializer(
    serializers.ModelSerializer
):
    skill_detail = SkillSerializer(
        source="skill",
        read_only=True,
        allow_null=True,
    )

    display_name = serializers.SerializerMethodField()

    class Meta:
        model = UserSkill

        fields = [
            "id",
            "skill",
            "skill_detail",
            "custom_name",
            "display_name",
            "skill_type",
            "level",
            "experience_years",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "skill_detail",
            "display_name",
            "created_at",
            "updated_at",
        ]

        extra_kwargs = {
            "skill": {
                "required": False,
                "allow_null": True,
            },
            "custom_name": {
                "required": False,
                "allow_null": True,
                "allow_blank": True,
            },
        }

    def get_display_name(self, obj):
        if obj.skill_id:
            return obj.skill.name

        return obj.custom_name or ""

    def validate_level(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Skill level must be between 1 and 5."
            )

        return value

    def validate_experience_years(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Experience years cannot be negative."
            )

        return value

    def validate(self, attrs):
        skill = attrs.get("skill")
        custom_name = attrs.get("custom_name")

        # PATCH:
        # If neither is supplied, keep the existing skill source.
        if self.instance is not None:
            if "skill" not in attrs and "custom_name" not in attrs:
                return attrs

        if custom_name is not None:
            custom_name = custom_name.strip()

            if not custom_name:
                custom_name = None

            attrs["custom_name"] = custom_name

        # We must have either an existing Skill or a custom name.
        if skill is None and not custom_name:
            if self.instance is None:
                raise serializers.ValidationError(
                    {
                        "skill": (
                            "Select an existing skill or provide "
                            "a custom skill name."
                        ),
                        "custom_name": (
                            "Provide a custom skill name when "
                            "no existing skill is selected."
                        ),
                    }
                )

        # A record cannot represent both an existing Skill and a
        # custom skill simultaneously.
        if skill is not None and custom_name:
            raise serializers.ValidationError(
                {
                    "custom_name": (
                        "Use either an existing skill or a custom "
                        "skill name, not both."
                    )
                }
            )

        return attrs


class UserInterestSerializer(
    serializers.ModelSerializer
):
    skill_detail = SkillSerializer(
        source="skill",
        read_only=True,
    )

    class Meta:
        model = UserInterest

        fields = [
            "id",
            "skill",
            "skill_detail",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]

class AdminSkillCategorySerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = SkillCategory

        fields = [
            "id",
            "name",
            "description",
            "ordering",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]

class AdminSkillSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = Skill

        fields = [
            "id",
            "name",
            "description",
            "skill_type",
            "reuse_level",
            "category",
            "esco_uri",
            "esco_code",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]