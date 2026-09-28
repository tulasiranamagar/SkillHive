from rest_framework.pagination import PageNumberPagination


class SkillPagination(PageNumberPagination):
    """
    Pagination for the public SkillHive skill library.

    Default:
        50 skills per page.

    Example:
        /api/skills/?page=1
        /api/skills/?page=2

    The page size can be changed by the client with ?page_size=
    but is capped to keep requests reasonable.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100