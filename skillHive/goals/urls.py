from django.urls import path

from .views import (
    create_goal,
    create_goal_skill,
    deactivate_goal,
    delete_goal,
    delete_goal_skill,
    goal_detail,
    list_goals,
    my_active_goal,
    my_goals,
    select_goal,
    update_goal,
    update_goal_skill,
)


urlpatterns = [
    path(
        "",
        list_goals,
        name="goal-list",
    ),

    path(
        "my/",
        my_goals,
        name="my-goals",
    ),

    path(
        "my/active/",
        my_active_goal,
        name="my-active-goal",
    ),

    path(
        "select/",
        select_goal,
        name="goal-select",
    ),

    # Admin career goals
    path(
        "create/",
        create_goal,
        name="goal-create",
    ),

    path(
        "<int:pk>/",
        goal_detail,
        name="goal-detail",
    ),

    path(
        "<int:pk>/deactivate/",
        deactivate_goal,
        name="goal-deactivate",
    ),

    path(
        "admin/<int:pk>/",
        update_goal,
        name="admin-goal-update",
    ),

    path(
        "admin/<int:pk>/delete/",
        delete_goal,
        name="admin-goal-delete",
    ),

    # Admin goal skills
    path(
        "admin/skills/create/",
        create_goal_skill,
        name="admin-goal-skill-create",
    ),

    path(
        "admin/skills/<int:pk>/",
        update_goal_skill,
        name="admin-goal-skill-update",
    ),

    path(
        "admin/skills/<int:pk>/delete/",
        delete_goal_skill,
        name="admin-goal-skill-delete",
    ),
]