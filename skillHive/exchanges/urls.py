from django.urls import path

from .views import (
    accept_exchange_request_view,
    cancel_exchange_request_view,
    create_exchange_request,
    exchange_match_with_user,
    exchange_post_detail,
    exchange_posts,
    exchange_request_detail,
    my_exchange_requests,
    received_exchange_requests,
    reject_exchange_request_view,
    recommended_exchange_partners,
)


urlpatterns = [
    path(
        "posts/",
        exchange_posts,
        name="exchange-posts",
    ),

    path(
        "posts/<int:pk>/",
        exchange_post_detail,
        name="exchange-post-detail",
    ),

    path(
        "matches/",
        recommended_exchange_partners,
        name="exchange-matches",
    ),

    path(
        "match/<int:user_id>/",
        exchange_match_with_user,
        name="exchange-match-with-user",
    ),

    path(
        "requests/create/",
        create_exchange_request,
        name="exchange-request-create",
    ),

    path(
        "requests/sent/",
        my_exchange_requests,
        name="exchange-requests-sent",
    ),

    path(
        "requests/received/",
        received_exchange_requests,
        name="exchange-requests-received",
    ),

    path(
        "requests/<int:pk>/",
        exchange_request_detail,
        name="exchange-request-detail",
    ),

    path(
        "requests/<int:pk>/accept/",
        accept_exchange_request_view,
        name="exchange-request-accept",
    ),

    path(
        "requests/<int:pk>/reject/",
        reject_exchange_request_view,
        name="exchange-request-reject",
    ),

    path(
        "requests/<int:pk>/cancel/",
        cancel_exchange_request_view,
        name="exchange-request-cancel",
    ),
]