from django.contrib import admin

from .models import (
    Skill,
    SkillCategory,
    UserInterest,
    UserSkill,
)


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "ordering",
        "created_at",
    ]

    search_fields = [
        "name",
        "description",
    ]

    ordering = [
        "ordering",
        "name",
    ]


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "skill_type",
        "reuse_level",
        "category",
        "esco_code",
        "created_at",
    ]

    list_filter = [
        "skill_type",
        "reuse_level",
        "category",
    ]

    search_fields = [
        "name",
        "description",
        "esco_uri",
        "esco_code",
    ]

    autocomplete_fields = [
        "category",
    ]


@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "skill",
        "skill_type",
        "level",
        "experience_years",
        "created_at",
    ]

    list_filter = [
        "skill_type",
        "level",
    ]

    search_fields = [
        "user__username",
        "user__email",
        "skill__name",
    ]

    autocomplete_fields = [
        "user",
        "skill",
    ]


@admin.register(UserInterest)
class UserInterestAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "skill",
        "created_at",
    ]

    search_fields = [
        "user__username",
        "user__email",
        "skill__name",
    ]

    autocomplete_fields = [
        "user",
        "skill",
    ]