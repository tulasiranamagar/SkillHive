from django.contrib.auth.models import User

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from gamification.services import get_total_xp, get_user_level

from .models import Profile
from .services import (
    get_active_user_restriction,
    restore_pending_deactivation,
)


class EmailTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")

        try:
            user = (
                User.objects
                .select_related("profile")
                .get(email__iexact=email)
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"detail": "Invalid email or password."}
            )

        # Check the password directly instead of authenticate().
        # Django's authenticate() rejects inactive users before
        # we get a chance to restore a valid pending deactivation.
        if not user.check_password(password):
            raise serializers.ValidationError(
                {"detail": "Invalid email or password."}
            )

        profile, _ = Profile.objects.get_or_create(
            user=user
        )

        # A permanently deactivated account can never be restored.
        if profile.permanently_deactivated:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "This account has been permanently "
                        "deactivated and cannot be restored."
                    )
                }
            )

        # Admin suspension/ban must never be bypassed by login.
        active_restriction = get_active_user_restriction(
            user=user
        )

        if active_restriction:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Your account is currently restricted."
                    ),
                    "restriction": {
                        "type": (
                            active_restriction.restriction_type
                        ),
                        "reason": active_restriction.reason,
                        "expires_at": (
                            active_restriction.expires_at
                        ),
                    },
                }
            )

        # If the account was voluntarily deactivated and the
        # 30-day recovery period has not expired, login restores it.
        profile = restore_pending_deactivation(
            user=user
        )

        if (
            not user.is_active
            or not profile.is_active
        ):
            if profile.permanently_deactivated:
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "This account has been permanently "
                            "deactivated and cannot be restored."
                        )
                    }
                )

            raise serializers.ValidationError(
                {"detail": "Your account is inactive."}
            )

        refresh = RefreshToken.for_user(user)

        is_admin = bool(
            user.is_superuser
            or (
                user.is_staff
                and profile.role == Profile.ROLE_ADMIN
                and profile.is_active
            )
        )

        total_xp = get_total_xp(user)
        level = get_user_level(user)

        full_name = (
            user.get_full_name().strip()
            or user.username
        )

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": full_name,

                "role": profile.role,
                "is_admin": is_admin,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,

                "is_verified": profile.is_verified,
                "is_active": profile.is_active,

                "onboarding_completed": (
                    profile.onboarding_completed
                ),
                "onboarding_skipped": (
                    profile.onboarding_skipped
                ),

                "xp": total_xp,
                "level": level,
            },
        }