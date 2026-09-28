from django.urls import path

from .views import (
    MarketplaceContentUnlockView,
    MarketplaceDetailView,
    MarketplaceListCreateView,
    MarketplaceReviewListCreateView,
)


urlpatterns = [
    path(
        "",
        MarketplaceListCreateView.as_view(),
        name="marketplace-list-create",
    ),
    path(
        "content/",
        MarketplaceListCreateView.as_view(),
        name="marketplace-content-list-create",
    ),
    path(
        "content/<int:pk>/",
        MarketplaceDetailView.as_view(),
        name="marketplace-content-detail",
    ),
    path(
        "content/<int:content_id>/unlock/",
        MarketplaceContentUnlockView.as_view(),
        name="marketplace-content-unlock",
    ),
    path(
        "content/<int:content_id>/reviews/",
        MarketplaceReviewListCreateView.as_view(),
        name="marketplace-content-reviews",
    ),
]