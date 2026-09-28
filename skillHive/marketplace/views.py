from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import (
    MarketplaceContent,
    MarketplaceContentUnlock,
    MarketplaceReview,
)
from .serializers import (
    MarketplaceContentSerializer,
    MarketplaceContentUnlockSerializer,
    MarketplaceReviewCreateSerializer,
    MarketplaceReviewSerializer,
)
from .services import (
    create_review,
    increment_content_view,
    unlock_content,
)


class MarketplaceListCreateView(generics.ListCreateAPIView):
    serializer_class = MarketplaceContentSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]

        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = (
            MarketplaceContent.objects
            .select_related("creator")
            .prefetch_related(
                "reviews__reviewer",
            )
        )

        if self.request.method == "GET":
            if self.request.query_params.get("mine") == "true":
                if not self.request.user.is_authenticated:
                    return MarketplaceContent.objects.none()

                queryset = queryset.filter(
                    creator=self.request.user
                )
            else:
                queryset = queryset.filter(
                    is_active=True
                )

        return queryset.order_by("-created_at")

    def get_serializer_context(self):
        return {
            "request": self.request,
        }

    def perform_create(self, serializer):
        serializer.save(
            creator=self.request.user,
        )


class MarketplaceDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = MarketplaceContentSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]

        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return (
            MarketplaceContent.objects
            .select_related("creator")
            .prefetch_related(
                "reviews__reviewer",
            )
        )

    def get_serializer_context(self):
        return {
            "request": self.request,
        }

    def get_object(self):
        queryset = self.get_queryset()

        obj = get_object_or_404(
            queryset,
            pk=self.kwargs["pk"],
        )

        if obj.is_active:
            return obj

        if (
            self.request.user.is_authenticated
            and obj.creator_id == self.request.user.id
        ):
            return obj

        from rest_framework.exceptions import NotFound

        raise NotFound(
            "This marketplace content is no longer available."
        )

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()

        if obj.is_active:
            increment_content_view(obj)

            obj.refresh_from_db()

        serializer = self.get_serializer(obj)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def perform_update(self, serializer):
        obj = self.get_object()

        if obj.creator_id != self.request.user.id:
            raise PermissionDenied(
                "Only the creator can edit this content."
            )

        serializer.save()

    def perform_destroy(self, obj):
        if obj.creator_id != self.request.user.id:
            raise PermissionDenied(
                "Only the creator can delete this content."
            )

        # Permanent deletion.
        # Related MarketplaceContentUnlock and MarketplaceReview
        # records are also deleted automatically because their
        # ForeignKeys use on_delete=models.CASCADE.
        obj.delete()


class MarketplaceContentUnlockView(
    generics.CreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = MarketplaceContentUnlockSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        method = serializer.validated_data["method"]

        try:
            result = unlock_content(
                user=request.user,
                content_id=kwargs["content_id"],
                method=method,
            )

        except MarketplaceContent.DoesNotExist:
            from rest_framework.exceptions import NotFound

            raise NotFound(
                "Marketplace content was not found."
            )

        return Response(
            {
                "unlocked": result["unlocked"],
                "created": result["created"],
            },
            status=(
                status.HTTP_201_CREATED
                if result["created"]
                else status.HTTP_200_OK
            ),
        )


class MarketplaceReviewListCreateView(
    generics.ListCreateAPIView
):
    def get_queryset(self):
        return (
            MarketplaceReview.objects
            .filter(
                content_id=self.kwargs["content_id"]
            )
            .select_related("reviewer")
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]

        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MarketplaceReviewCreateSerializer

        return MarketplaceReviewSerializer

    def perform_create(self, serializer):
        content = get_object_or_404(
            MarketplaceContent,
            pk=self.kwargs["content_id"],
            is_active=True,
        )

        create_review(
            user=self.request.user,
            content=content,
            rating=serializer.validated_data["rating"],
            comment=serializer.validated_data.get(
                "comment",
                "",
            ),
        )