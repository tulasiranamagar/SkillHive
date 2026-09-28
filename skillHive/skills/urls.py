from django.urls import path

from .views import (
    AdminSkillCategoryDetailView,
    AdminSkillCategoryListCreateView,
    AdminSkillDetailView,
    AdminSkillListCreateView,
    SkillCategoryListView,
    SkillDetailView,
    SkillListView,
    UserInterestDetailView,
    UserInterestListView,
    UserSkillDetailView,
    UserSkillListView,
)


urlpatterns = [

    path(
        "categories/",
        SkillCategoryListView.as_view(),
        name="skill-category-list",
    ),

    path(
        "",
        SkillListView.as_view(),
        name="skill-list",
    ),

    path(
        "<int:pk>/",
        SkillDetailView.as_view(),
        name="skill-detail",
    ),

    path(
        "user/",
        UserSkillListView.as_view(),
        name="user-skill-list",
    ),

    path(
        "user/<int:pk>/",
        UserSkillDetailView.as_view(),
        name="user-skill-detail",
    ),
    path(
        "interests/",
        UserInterestListView.as_view(),
        name="user-interest-list",
    ),

    path(
        "interests/<int:pk>/",
        UserInterestDetailView.as_view(),
        name="user-interest-detail",
    ),

    path(
        "admin/categories/",
        AdminSkillCategoryListCreateView.as_view(),
        name="admin-skill-category-list-create",
    ),

    path(
        "admin/categories/<int:pk>/",
        AdminSkillCategoryDetailView.as_view(),
        name="admin-skill-category-detail",
    ),
    path(
        "admin/skills/",
        AdminSkillListCreateView.as_view(),
        name="admin-skill-list-create",
    ),

    path(
        "admin/skills/<int:pk>/",
        AdminSkillDetailView.as_view(),
        name="admin-skill-detail",
    ),
]