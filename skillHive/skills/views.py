from django.db.models import Count, Q

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Skill,
    SkillCategory,
    UserInterest,
    UserSkill,
)
from .pagination import SkillPagination
from .permissions import IsSkillHiveAdmin
from .serializers import (
    AdminSkillCategorySerializer,
    AdminSkillSerializer,
    SkillCategorySerializer,
    SkillSerializer,
    UserInterestSerializer,
    UserSkillSerializer,
)
from .services import (
    add_or_update_user_skill,
    add_user_interest,
    remove_user_interest,
    remove_user_skill_record,
    update_user_skill,
)

class SkillCategoryListView(APIView):
    """
    Public SkillHive skill-category listing.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        categories = (
            SkillCategory.objects
            .annotate(
                skill_count=Count(
                    "skills",
                    distinct=True,
                )
            )
            .order_by(
                "ordering",
                "name",
                "id",
            )
        )

        serializer = SkillCategorySerializer(
            categories,
            many=True,
        )

        return Response(
            serializer.data
        )

class SkillListView(APIView):
    """
    Public SkillHive Skill Library.

    Supported query parameters:

        ?search=python
        ?category=1
        ?type=skill_competence
        ?page=1
        ?page_size=50
    """

    permission_classes = [AllowAny]

    def get(self, request):
        queryset = (
            Skill.objects
            .select_related("category")
            .all()
            .order_by(
                "name",
                "id",
            )
        )

        search = request.query_params.get(
            "search"
        )

        category_id = request.query_params.get(
            "category"
        )

        skill_type = request.query_params.get(
            "type"
        )

        if search:
            search = search.strip()

            if search:
                queryset = queryset.filter(
                    Q(name__icontains=search)
                    | Q(description__icontains=search)
                )

        if category_id:
            queryset = queryset.filter(
                category_id=category_id
            )

        if skill_type:
            queryset = queryset.filter(
                skill_type=skill_type
            )

        paginator = SkillPagination()

        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self,
        )

        serializer = SkillSerializer(
            page,
            many=True,
        )

        return paginator.get_paginated_response(
            serializer.data
        )


class SkillDetailView(APIView):
    """
    Public Skill detail.
    """

    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            skill = (
                Skill.objects
                .select_related("category")
                .get(pk=pk)
            )
        except Skill.DoesNotExist:
            return Response(
                {
                    "detail": "Skill not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SkillSerializer(
            skill
        )

        return Response(
            serializer.data
        )

class UserSkillListView(APIView):
    """
    Manage the authenticated user's known and wanted skills.

    GET:
        /api/skills/user/
        /api/skills/user/?type=known
        /api/skills/user/?type=wanted

    POST:
        /api/skills/user/

    A POST may contain either:

        {
            "skill": 12,
            "skill_type": "known"
        }

    or:

        {
            "custom_name": "Blender Geometry Nodes",
            "skill_type": "known"
        }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            UserSkill.objects
            .filter(
                user=request.user,
            )
            .select_related(
                "skill",
                "skill__category",
            )
            .order_by(
                "skill_type",
                "skill__name",
                "custom_name",
                "id",
            )
        )

        skill_type = request.query_params.get(
            "type"
        )

        if skill_type:
            queryset = queryset.filter(
                skill_type=skill_type
            )

        serializer = UserSkillSerializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data
        )

    def post(self, request):
        serializer = UserSkillSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            user_skill = add_or_update_user_skill(
                user=request.user,
                skill=serializer.validated_data.get(
                    "skill"
                ),
                custom_name=serializer.validated_data.get(
                    "custom_name"
                ),
                skill_type=serializer.validated_data[
                    "skill_type"
                ],
                level=serializer.validated_data.get(
                    "level",
                    1,
                ),
                experience_years=serializer.validated_data.get(
                    "experience_years",
                    0,
                ),
            )
        except ValueError as exc:
            return Response(
                {
                    "detail": str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            UserSkillSerializer(
                user_skill
            ).data,
            status=status.HTTP_201_CREATED,
        )


class UserSkillDetailView(APIView):
    """
    Manage one authenticated user's skill.

    GET:
        /api/skills/user/<id>/

    PATCH:
        /api/skills/user/<id>/

    DELETE:
        /api/skills/user/<id>/
    """

    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        try:
            return (
                UserSkill.objects
                .select_related(
                    "skill",
                    "skill__category",
                )
                .get(
                    pk=pk,
                    user=request.user,
                )
            )
        except UserSkill.DoesNotExist:
            return None

    def get(self, request, pk):
        user_skill = self.get_object(
            request,
            pk,
        )

        if user_skill is None:
            return Response(
                {
                    "detail": "User skill not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            UserSkillSerializer(
                user_skill
            ).data
        )

    def patch(self, request, pk):
        user_skill = self.get_object(
            request,
            pk,
        )

        if user_skill is None:
            return Response(
                {
                    "detail": "User skill not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserSkillSerializer(
            user_skill,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            updated_skill = update_user_skill(
                user=request.user,
                user_skill=user_skill,
                skill=serializer.validated_data.get(
                    "skill"
                ),
                custom_name=serializer.validated_data.get(
                    "custom_name"
                ),
                skill_type=serializer.validated_data.get(
                    "skill_type"
                ),
                level=serializer.validated_data.get(
                    "level"
                ),
                experience_years=serializer.validated_data.get(
                    "experience_years"
                ),
            )
        except (ValueError, PermissionError) as exc:
            return Response(
                {
                    "detail": str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            UserSkillSerializer(
                updated_skill
            ).data
        )

    def delete(self, request, pk):
        user_skill = self.get_object(
            request,
            pk,
        )

        if user_skill is None:
            return Response(
                {
                    "detail": "User skill not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        remove_user_skill_record(
            user=request.user,
            user_skill=user_skill,
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
        
        
class UserInterestListView(APIView):
    """
    Manage the authenticated user's interests.

    Interests continue to use structured Skill records because
    they are part of the recommendation/AI skill system.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        interests = (
            UserInterest.objects
            .filter(
                user=request.user,
            )
            .select_related(
                "skill",
                "skill__category",
            )
            .order_by(
                "skill__name",
                "id",
            )
        )

        serializer = UserInterestSerializer(
            interests,
            many=True,
        )

        return Response(
            serializer.data
        )

    def post(self, request):
        serializer = UserInterestSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        interest = add_user_interest(
            user=request.user,
            skill=serializer.validated_data[
                "skill"
            ],
        )

        return Response(
            UserInterestSerializer(
                interest
            ).data,
            status=status.HTTP_201_CREATED,
        )


class UserInterestDetailView(APIView):
    """
    Delete one interest belonging to the
    authenticated user.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            interest = UserInterest.objects.get(
                pk=pk,
                user=request.user,
            )
        except UserInterest.DoesNotExist:
            return Response(
                {
                    "detail": "Interest not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        remove_user_interest(
            user=request.user,
            skill=interest.skill,
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
        

class AdminSkillCategoryListCreateView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def get(self, request):
        categories = (
            SkillCategory.objects
            .annotate(
                skill_count=Count(
                    "skills",
                    distinct=True,
                )
            )
            .order_by(
                "ordering",
                "name",
                "id",
            )
        )

        serializer = SkillCategorySerializer(
            categories,
            many=True,
        )

        return Response(
            serializer.data
        )

    def post(self, request):
        serializer = AdminSkillCategorySerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class AdminSkillCategoryDetailView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def get_object(self, pk):
        try:
            return SkillCategory.objects.get(
                pk=pk
            )
        except SkillCategory.DoesNotExist:
            return None

    def patch(self, request, pk):
        category = self.get_object(pk)

        if category is None:
            return Response(
                {
                    "detail": "Category not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminSkillCategorySerializer(
            category,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            serializer.data
        )

    def delete(self, request, pk):
        category = self.get_object(pk)

        if category is None:
            return Response(
                {
                    "detail": "Category not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        category.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


class AdminSkillListCreateView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def get(self, request):
        queryset = (
            Skill.objects
            .select_related("category")
            .all()
            .order_by(
                "name",
                "id",
            )
        )

        paginator = SkillPagination()

        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self,
        )

        serializer = AdminSkillSerializer(
            page,
            many=True,
        )

        return paginator.get_paginated_response(
            serializer.data
        )

    def post(self, request):
        serializer = AdminSkillSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class AdminSkillDetailView(APIView):
    permission_classes = [IsSkillHiveAdmin]

    def get_object(self, pk):
        try:
            return Skill.objects.get(
                pk=pk
            )
        except Skill.DoesNotExist:
            return None

    def patch(self, request, pk):
        skill = self.get_object(pk)

        if skill is None:
            return Response(
                {
                    "detail": "Skill not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminSkillSerializer(
            skill,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            serializer.data
        )

    def delete(self, request, pk):
        skill = self.get_object(pk)

        if skill is None:
            return Response(
                {
                    "detail": "Skill not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        skill.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )