import uuid

from django.db import transaction
from django.utils import timezone

from roadmaps.models import Assessment, RoadmapTask

from .models import Certificate


class CertificateServiceError(Exception):
    """Raised when certificate generation cannot be completed."""


@transaction.atomic
def generate_certificate(user, user_goal):
    if user_goal.user_id != user.id:
        raise CertificateServiceError(
            "You cannot generate a certificate for another user."
        )

    if not user_goal.is_active:
        raise CertificateServiceError(
            "This career goal is no longer active."
        )

    # Lock the active career goal so two simultaneous requests cannot generate duplicate certificates.
   
    user_goal = (
        user_goal.__class__.objects
        .select_for_update()
        .select_related("goal")
        .get(pk=user_goal.pk)
    )

    existing = (
        Certificate.objects
        .select_for_update()
        .filter(user_goal=user_goal)
        .first()
    )

    if existing:
        if existing.status == Certificate.STATUS_ISSUED:
            return existing

        raise CertificateServiceError(
            "A certificate already exists for this career goal "
            "and is currently revoked."
        )

    tasks = list(
        RoadmapTask.objects.filter(
            user_goal=user_goal,
        )
    )

    if not tasks:
        return None

    if not all(task.completed for task in tasks):
        return None

    task_ids = [task.id for task in tasks]

    passed_assessments = list(
        Assessment.objects.filter(
            user=user,
            task_id__in=task_ids,
            status="passed",
        ).order_by(
            "-evaluated_at",
            "-id",
        )
    )

    passed_task_ids = {
        assessment.task_id
        for assessment in passed_assessments
    }

    if len(passed_task_ids) != len(task_ids):
        return None

    # Keep only the latest passed assessment for each roadmap task.
    latest_assessments = {}

    for assessment in passed_assessments:
        if assessment.task_id not in latest_assessments:
            latest_assessments[assessment.task_id] = assessment

    scores = []

    for assessment in latest_assessments.values():
        if assessment.total_marks:
            percentage = (
                assessment.score
                / assessment.total_marks
                * 100
            )
        else:
            percentage = 0

        scores.append(percentage)

    assessment_score = (
        round(sum(scores) / len(scores))
        if scores
        else 0
    )

    now = timezone.now()

    certificate = Certificate.objects.create(
        user=user,
        user_goal=user_goal,
        certificate_id=(
            f"SKH-{now.year}-"
            f"{uuid.uuid4().hex[:10].upper()}"
        ),
        title=(
            f"{user_goal.goal.title} "
            f"Completion Certificate"
        ),
        issued_at=now,
        completion_date=now,
        assessment_score=assessment_score,
        status=Certificate.STATUS_ISSUED,
    )

    from gamification.services import award_xp

    award_xp(
        user=user,
        event_key="certificate_earned",
        reference_id=certificate.id,
    )

    return certificate