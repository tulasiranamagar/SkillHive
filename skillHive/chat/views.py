from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Message
from .serializers import (
    ConversationSerializer,
    ConversationCreateSerializer,
    MessageSerializer,
)
from .services import (
    ChatServiceError,
    get_user_conversations,
    get_conversation_for_user,
    get_or_create_direct_conversation,
    get_conversation_messages,
    send_message,
    update_message,
    delete_message,
    mark_message_as_read,
    mark_conversation_messages_as_read,
)


class ConversationListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return get_user_conversations(
            self.request.user,
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ConversationCreateSerializer

        return ConversationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        try:
            conversation, _ = (
                get_or_create_direct_conversation(
                    request.user,
                    serializer.validated_data[
                        "participant_id"
                    ],
                )
            )
        except ChatServiceError as exc:
            raise ValidationError(
                {"detail": str(exc)}
            )

        output = ConversationSerializer(
            conversation,
            context=self.get_serializer_context(),
        )

        return Response(
            output.data,
            status=status.HTTP_200_OK,
        )


class ConversationDetailView(
    generics.RetrieveAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = ConversationSerializer

    def get_queryset(self):
        return get_user_conversations(
            self.request.user,
        )

    def retrieve(
        self,
        request,
        *args,
        **kwargs,
    ):
        conversation = self.get_object()

        mark_conversation_messages_as_read(
            request.user,
            conversation,
        )

        conversation.refresh_from_db()

        serializer = self.get_serializer(
            conversation,
        )

        return Response(
            serializer.data,
        )


class MessageListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = MessageSerializer

    def get_queryset(self):
        return get_conversation_messages(
            self.request.user,
            self.kwargs["conversation_id"],
        )

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        try:
            message = send_message(
                request.user,
                self.kwargs["conversation_id"],
                serializer.validated_data["content"],
            )
        except ChatServiceError as exc:
            raise ValidationError(
                {"detail": str(exc)}
            )

        output = MessageSerializer(
            message,
            context=self.get_serializer_context(),
        )

        return Response(
            output.data,
            status=status.HTTP_201_CREATED,
        )


class MessageUpdateDeleteView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(
            sender=self.request.user,
        ).select_related(
            "conversation",
            "sender",
        )

    def update(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        try:
            message = update_message(
                request.user,
                kwargs["pk"],
                serializer.validated_data["content"],
            )
        except ChatServiceError as exc:
            raise ValidationError(
                {"detail": str(exc)}
            )

        output = MessageSerializer(
            message,
            context=self.get_serializer_context(),
        )

        return Response(
            output.data,
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):
        try:
            delete_message(
                request.user,
                kwargs["pk"],
            )
        except ChatServiceError as exc:
            raise ValidationError(
                {"detail": str(exc)}
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class MarkMessageReadView(
    generics.UpdateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = MessageSerializer

    http_method_names = [
        "patch",
    ]

    def get_queryset(self):
        return Message.objects.filter(
            conversation__participants=self.request.user,
        ).exclude(
            sender=self.request.user,
        )

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):
        try:
            message = mark_message_as_read(
                request.user,
                kwargs["message_id"],
            )
        except ChatServiceError as exc:
            raise ValidationError(
                {"detail": str(exc)}
            )

        serializer = self.get_serializer(
            message,
        )

        return Response(
            serializer.data,
        )