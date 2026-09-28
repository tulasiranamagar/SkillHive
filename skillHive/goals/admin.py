from django.contrib import admin

from .models import CareerGoal, GoalSkill, UserGoal


class GoalSkillInline(admin.TabularInline):
    model = GoalSkill
    extra = 1
    autocomplete_fields = ("skill",)
    fields = (
        "skill",
        "relation_type",
    )


@admin.register(CareerGoal)
class CareerGoalAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
    )

    readonly_fields = (
        "created_at",
    )

    inlines = (
        GoalSkillInline,
    )


@admin.register(GoalSkill)
class GoalSkillAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "goal",
        "skill",
        "relation_type",
    )

    list_filter = (
        "relation_type",
    )

    search_fields = (
        "goal__title",
        "skill__name",
    )

    autocomplete_fields = (
        "goal",
        "skill",
    )


@admin.register(UserGoal)
class UserGoalAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "goal",
        "is_active",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "is_active",
        "created_at",
    )

    search_fields = (
        "user__username",
        "goal__title",
    )

    autocomplete_fields = (
        "user",
        "goal",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )