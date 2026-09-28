from rest_framework.permissions import BasePermission

from .services import is_skillhive_admin


class IsSkillHiveAdmin(BasePermission):
    message = (
        "SkillHive administrator permission is required."
    )

    def has_permission(self, request, view):
        return is_skillhive_admin(request.user)


class IsOwnerOrSkillHiveAdmin(BasePermission):
    message = (
        "You can only access your own account."
    )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        if is_skillhive_admin(request.user):
            return True

        if hasattr(obj, "user"):
            return obj.user == request.user

        return obj == request.user