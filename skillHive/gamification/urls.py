from django.urls import path

from .views import (
    BadgeListView,
    LeaderboardView,
    MyBadgesView,
    MyGamificationProfileView,
    MyXPHistoryView,
)


urlpatterns = [
    path(
        "leaderboard/",
        LeaderboardView.as_view(),
        name="leaderboard",
    ),
    path(
        "badges/",
        BadgeListView.as_view(),
        name="badge-list",
    ),
    path(
        "profile/",
        MyGamificationProfileView.as_view(),
        name="gamification-profile",
    ),
    path(
        "my-badges/",
        MyBadgesView.as_view(),
        name="my-badges",
    ),
    path(
        "xp-history/",
        MyXPHistoryView.as_view(),
        name="xp-history",
    ),
]