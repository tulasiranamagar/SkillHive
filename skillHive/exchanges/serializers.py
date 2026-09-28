from django.contrib.auth.models import User

from rest_framework import serializers

from .models import ExchangePost, ExchangeRequest


class ExchangeUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User

        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
        )

        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username


class ExchangePostSerializer(serializers.ModelSerializer):
    creator = ExchangeUserSerializer(
        read_only=True,
    )

    request_count = serializers.SerializerMethodField()

    has_requested = serializers.SerializerMethodField()

    my_request_status = serializers.SerializerMethodField()

    class Meta:
        model = ExchangePost

        fields = (
            "id",
            "creator",
            "title",
            "description",
            "offered_skill_name",
            "requested_skill_name",
            "scheduled_at",
            "duration_minutes",
            "status",
            "request_count",
            "has_requested",
            "my_request_status",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "creator",
            "status",
            "request_count",
            "has_requested",
            "my_request_status",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        """
        Validate the final values of the exchange.

        For PATCH requests, fields not supplied by the client
        are taken from the existing instance.
        """

        offered = attrs.get(
            "offered_skill_name",
            getattr(
                self.instance,
                "offered_skill_name",
                "",
            ),
        )

        requested = attrs.get(
            "requested_skill_name",
            getattr(
                self.instance,
                "requested_skill_name",
                "",
            ),
        )

        offered = str(
            offered or ""
        ).strip()

        requested = str(
            requested or ""
        ).strip()

        if not offered:
            raise serializers.ValidationError(
                {
                    "offered_skill_name": (
                        "Please enter the skill you want to share."
                    )
                }
            )

        if not requested:
            raise serializers.ValidationError(
                {
                    "requested_skill_name": (
                        "Please enter the skill you want to learn."
                    )
                }
            )

        if offered.casefold() == requested.casefold():
            raise serializers.ValidationError(
                "Offered and requested skills must be different."
            )

        attrs["offered_skill_name"] = offered
        attrs["requested_skill_name"] = requested

        return attrs

    def get_request_count(self, obj):
        return obj.requests.filter(
            status=ExchangeRequest.STATUS_PENDING,
        ).count()

    def get_has_requested(self, obj):
        request = self.context.get("request")

        if not request:
            return False

        if not request.user.is_authenticated:
            return False

        return obj.requests.filter(
            requester=request.user,
            status__in=[
                ExchangeRequest.STATUS_PENDING,
                ExchangeRequest.STATUS_ACCEPTED,
            ],
        ).exists()

    def get_my_request_status(self, obj):
        request = self.context.get("request")

        if not request:
            return None

        if not request.user.is_authenticated:
            return None

        exchange_request = (
            obj.requests
            .filter(
                requester=request.user,
            )
            .order_by("-updated_at", "-id")
            .first()
        )

        if not exchange_request:
            return None

        return exchange_request.status


class ExchangeRequestSerializer(serializers.ModelSerializer):
    requester = ExchangeUserSerializer(
        read_only=True,
    )

    recipient = ExchangeUserSerializer(
        read_only=True,
    )

    post = ExchangePostSerializer(
        read_only=True,
    )

    post_id = serializers.PrimaryKeyRelatedField(
        source="post",
        queryset=ExchangePost.objects.filter(
            status=ExchangePost.STATUS_OPEN,
        ),
        write_only=True,
    )

    class Meta:
        model = ExchangeRequest

        fields = (
            "id",
            "post",
            "post_id",
            "requester",
            "recipient",
            "message",
            "status",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "post",
            "requester",
            "recipient",
            "status",
            "created_at",
            "updated_at",
        )


class ExchangeMatchSerializer(serializers.Serializer):
    user = ExchangeUserSerializer()

    known_skills = serializers.ListField()

    wanted_skills = serializers.ListField()

    learn_from_them = serializers.ListField()

    teach_them = serializers.ListField()

    match_count = serializers.IntegerField()

    match_score = serializers.IntegerField()