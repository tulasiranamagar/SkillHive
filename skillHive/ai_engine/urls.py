from django.urls import path

from . import views


urlpatterns = [
    path(
        "skill-gap/",
        views.skill_gap_analysis,
        name="skill-gap-analysis",
    ),
    path(
        "generate-questions/",
        views.generate_questions_view,
        name="generate-questions",
    ),
    path(
        "recommendations/",
        views.personalized_recommendations,
        name="personalized-recommendations",
    ),
]