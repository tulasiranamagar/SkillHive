from rest_framework import serializers

from gamification.services import get_total_xp

from .models import (
    MarketplaceContent,
    MarketplaceContentUnlock,
    MarketplaceReview,
)


class MarketplaceReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(
        source="reviewer.username",
        read_only=True,
    )

    class Meta:
        model = MarketplaceReview
        fields = (
            "id",
            "reviewer_name",
            "rating",
            "comment",
            "created_at",
        )
        read_only_fields = (
            "id",
            "reviewer_name",
            "created_at",
        )


class MarketplaceContentSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(
        source="creator.username",
        read_only=True,
    )

    unlocked = serializers.SerializerMethodField()

    current_user_xp = serializers.SerializerMethodField()

    xp_shortage = serializers.SerializerMethodField()

    reviews = MarketplaceReviewSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = MarketplaceContent

        fields = (
            "id",
            "creator",
            "creator_name",
            "title",
            "description",
            "content_type",
            "unlock_type",
            "price",
            "xp_unlock_cost",
            "current_user_xp",
            "xp_shortage",
            "video_url",
            "content_file",
            "content_image",
            "view_count",
            "fee_due",
            "is_active",
            "unlocked",
            "reviews",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "creator",
            "creator_name",
            "view_count",
            "fee_due",
            "is_active",
            "unlocked",
            "current_user_xp",
            "xp_shortage",
            "reviews",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        content_type = attrs.get(
            "content_type",
            getattr(
                self.instance,
                "content_type",
                None,
            ),
        )

        unlock_type = attrs.get(
            "unlock_type",
            getattr(
                self.instance,
                "unlock_type",
                None,
            ),
        )

        price = attrs.get(
            "price",
            getattr(
                self.instance,
                "price",
                0,
            ),
        )

        xp_cost = attrs.get(
            "xp_unlock_cost",
            getattr(
                self.instance,
                "xp_unlock_cost",
                0,
            ),
        )

        video_url = attrs.get(
            "video_url",
            getattr(
                self.instance,
                "video_url",
                "",
            ),
        )

        content_file = attrs.get(
            "content_file",
            getattr(
                self.instance,
                "content_file",
                None,
            ),
        )

        content_image = attrs.get(
            "content_image",
            getattr(
                self.instance,
                "content_image",
                None,
            ),
        )

        if content_type == MarketplaceContent.TYPE_VIDEO:
            if not video_url and not content_file:
                raise serializers.ValidationError(
                    "Video content requires a video URL or video file."
                )

        elif content_type == MarketplaceContent.TYPE_FILE:
            if not content_file:
                raise serializers.ValidationError(
                    "File content requires a file."
                )

        elif content_type == MarketplaceContent.TYPE_IMAGE:
            if not content_image:
                raise serializers.ValidationError(
                    "Image content requires an image."
                )

        if unlock_type == MarketplaceContent.UNLOCK_MONEY:
            if price <= 0:
                raise serializers.ValidationError(
                    {
                        "price": (
                            "Money content requires a "
                            "positive price."
                        )
                    }
                )

        elif unlock_type == MarketplaceContent.UNLOCK_XP:
            if xp_cost <= 0:
                raise serializers.ValidationError(
                    {
                        "xp_unlock_cost": (
                            "XP content requires a "
                            "positive XP cost."
                        )
                    }
                )

        elif unlock_type == MarketplaceContent.UNLOCK_MONEY_OR_XP:
            if price <= 0 or xp_cost <= 0:
                raise serializers.ValidationError(
                    (
                        "Money or XP content requires both "
                        "a positive price and XP cost."
                    )
                )

        return attrs

    def get_unlocked(self, obj):
        request = self.context.get("request")

        if obj.unlock_type == MarketplaceContent.UNLOCK_FREE:
            return True

        if not request or not request.user.is_authenticated:
            return False

        if obj.creator_id == request.user.id:
            return True

        return obj.unlocks.filter(
            user=request.user
        ).exists()

    def get_current_user_xp(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return 0

        return get_total_xp(request.user)

    def get_xp_shortage(self, obj):
        request = self.context.get("request")

        if (
            not request
            or not request.user.is_authenticated
        ):
            return obj.xp_unlock_cost or 0

        current_xp = get_total_xp(request.user)
        required_xp = int(obj.xp_unlock_cost or 0)

        return max(required_xp - current_xp, 0)

    def to_representation(self, instance):
        data = super().to_representation(instance)

        request = self.context.get("request")

        unlocked = False

        if instance.unlock_type == MarketplaceContent.UNLOCK_FREE:
            unlocked = True

        elif request and request.user.is_authenticated:
            if instance.creator_id == request.user.id:
                unlocked = True
            else:
                unlocked = instance.unlocks.filter(
                    user=request.user
                ).exists()

        if not unlocked:
            data["video_url"] = None
            data["content_file"] = None
            data["content_image"] = None

        return data


class MarketplaceContentUnlockSerializer(serializers.Serializer):
    method = serializers.ChoiceField(
        choices=[
            MarketplaceContentUnlock.METHOD_MONEY,
            MarketplaceContentUnlock.METHOD_XP,
        ]
    )


class MarketplaceReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketplaceReview
        fields = (
            "rating",
            "comment",
        )

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

