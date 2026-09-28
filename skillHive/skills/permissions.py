from rest_framework.permissions import BasePermission


class IsSkillHiveAdmin(BasePermission):
    """
    SkillHive admin permission.

    A user is considered an application admin when:

    1. The user is a Django superuser, OR
    2. The user is staff AND their SkillHive profile:
       - has role='admin'
       - is active

    This keeps SkillHive authorization consistent with the
    application's admin architecture instead of relying only
    on Django's is_staff flag.
    """

    message = "You do not have permission to perform this admin action."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if not user.is_active:
            return False

        if user.is_superuser:
            return True

        if not user.is_staff:
            return False

        try:
            profile = user.profile
        except AttributeError:
            return False

        return (
            profile.role == "admin"
            and profile.is_active
        )