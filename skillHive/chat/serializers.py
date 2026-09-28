from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Conversation, Message


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]
        read_only_fields = ["id", "username"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "content",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "sender",
            "is_read",
            "created_at",
        ]

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Message content cannot be empty."
            )

        return value


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(
        many=True,
        read_only=True,
    )

    last_message = serializers.SerializerMethodField()

    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation

        fields = [
            "id",
            "participants",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "participants",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def get_last_message(self, obj):
        message = (
            obj.messages
            .select_related("sender")
            .order_by("-created_at")
            .first()
        )

        if not message:
            return None

        return MessageSerializer(
            message,
            context=self.context,
        ).data

    def get_unread_count(self, obj):
        """
        Count unread messages sent by other participants.

        The current authenticated user's own messages
        are never counted as unread.
        """

        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return 0

        return (
            obj.messages
            .filter(
                is_read=False,
            )
            .exclude(
                sender=request.user,
            )
            .count()
        )


class ConversationCreateSerializer(serializers.Serializer):
    participant_id = serializers.IntegerField(
        min_value=1
    )