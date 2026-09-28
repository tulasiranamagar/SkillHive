# from django.conf import settings
# from django.conf.urls.static import static
# from django.contrib import admin
# from django.urls import include, path

# from rest_framework_simplejwt.views import (
#     TokenObtainPairView,
#     TokenRefreshView,
# )

# from accounts.authentication import (
#     EmailTokenObtainPairSerializer,
# )


# class EmailTokenObtainPairView(TokenObtainPairView):
#     serializer_class = EmailTokenObtainPairSerializer


# urlpatterns = [
#     path(
#         "admin/",
#         admin.site.urls,
#     ),

#     path(
#         "api/accounts/",
#         include("accounts.urls"),
#     ),

#     path(
#         "api/skills/",
#         include("skills.urls"),
#     ),

#     path(
#         "api/goals/",
#         include("goals.urls"),
#     ),

#     path(
#         "api/roadmaps/",
#         include("roadmaps.urls"),
#     ),

#     path(
#         "api/exchanges/",
#         include("exchanges.urls"),
#     ),

#     path(
#         "api/skill-sessions/",
#         include("skill_sessions.urls"),
#     ),

#     path(
#         "api/marketplace/",
#         include("marketplace.urls"),
#     ),

#     path(
#         "api/gamification/",
#         include("gamification.urls"),
#     ),

#     path(
#         "api/chat/",
#         include("chat.urls"),
#     ),

#     path(
#         "api/notifications/",
#         include("notifications.urls"),
#     ),

#     path(
#         "api/certificates/",
#         include("certificates.urls"),
#     ),

#     path(
#         "api/token/",
#         EmailTokenObtainPairView.as_view(),
#         name="token_obtain_pair",
#     ),

#     path(
#         "api/token/refresh/",
#         TokenRefreshView.as_view(),
#         name="token_refresh",
#     ),
# ]


# if settings.DEBUG:
#     urlpatterns += static(
#         settings.MEDIA_URL,
#         document_root=settings.MEDIA_ROOT,
#     )






from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from accounts.authentication import (
    EmailTokenObtainPairSerializer,
)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    path(
        "api/accounts/",
        include("accounts.urls"),
    ),

    path(
        "api/skills/",
        include("skills.urls"),
    ),

    path(
        "api/goals/",
        include("goals.urls"),
    ),

    path(
        "api/ai/",
        include("ai_engine.urls"),
    ),

    path(
        "api/roadmaps/",
        include("roadmaps.urls"),
    ),

    path(
        "api/exchanges/",
        include("exchanges.urls"),
    ),

    path(
        "api/skill-sessions/",
        include("skill_sessions.urls"),
    ),

    path(
        "api/marketplace/",
        include("marketplace.urls"),
    ),

    path(
        "api/gamification/",
        include("gamification.urls"),
    ),

    path(
        "api/chat/",
        include("chat.urls"),
    ),

    path(
        "api/notifications/",
        include("notifications.urls"),
    ),

    path(
        "api/certificates/",
        include("certificates.urls"),
    ),

    path(
        "api/token/",
        EmailTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),

    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )