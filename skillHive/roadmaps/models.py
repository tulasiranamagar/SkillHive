from django.contrib.auth.models import User
from django.db import models

from goals.models import UserGoal
from skills.models import Skill


class RoadmapTask(models.Model):
    user_goal = models.ForeignKey(
        UserGoal,
        on_delete=models.CASCADE,
        related_name="roadmap_tasks",
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="roadmap_tasks",
    )
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user_goal", "skill"],
                name="unique_roadmap_task_user_goal_skill",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user_goal", "completed"],
                name="roadmap_goal_completed_idx",
            ),
            models.Index(
                fields=["skill"],
                name="roadmap_task_skill_idx",
            ),
        ]

    def __str__(self):
        return self.title


class LearningActivity(models.Model):
    ACTIVITY_TYPES = (
        ("video", "Video"),
        ("document", "Document"),
        ("session", "Session"),
        ("question", "Learning Question"),
        ("practical", "Practice Task"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="learning_activities",
    )
    task = models.ForeignKey(
        RoadmapTask,
        on_delete=models.CASCADE,
        related_name="learning_activities",
    )
    activity_type = models.CharField(
        max_length=20,
        choices=ACTIVITY_TYPES,
    )
    reference_id = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    duration_seconds = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "task"],
                name="learn_activity_user_task_idx",
            ),
            models.Index(
                fields=["activity_type"],
                name="learning_activity_type_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.task.title} - "
            f"{self.activity_type}"
        )


class RoadmapProgress(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="roadmap_progress",
    )
    task = models.OneToOneField(
        RoadmapTask,
        on_delete=models.CASCADE,
        related_name="progress",
    )
    video_seconds = models.PositiveIntegerField(default=0)
    document_seconds = models.PositiveIntegerField(default=0)
    sessions_attended = models.PositiveIntegerField(default=0)
    questions_answered = models.PositiveIntegerField(default=0)
    correct_questions = models.PositiveIntegerField(default=0)
    practical_tasks_completed = models.PositiveIntegerField(default=0)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.task.title} - "
            f"{self.progress_percent}%"
        )


class AssessmentQuestion(models.Model):
    QUESTION_TYPES = (
        ("mcq", "Multiple Choice"),
        ("multiple_select", "Multiple Select"),
        ("true_false", "True / False"),
        ("code_output", "Code Output"),
        ("scenario", "Scenario"),
        ("practical", "Practical Task"),
    )

    SOURCES = (
        ("ai", "AI Generated"),
        ("user", "User Created"),
        ("admin", "Admin Created"),
    )

    STATUS_CHOICES = (
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )

    DIFFICULTY_CHOICES = (
        ("beginner", "Beginner"),
        ("basic", "Basic"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
        ("expert", "Expert"),
    )

    task = models.ForeignKey(
        RoadmapTask,
        on_delete=models.CASCADE,
        related_name="assessment_questions",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="assessment_questions",
    )
    question_type = models.CharField(
        max_length=30,
        choices=QUESTION_TYPES,
    )
    difficulty = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default="beginner",
    )
    source = models.CharField(
        max_length=10,
        choices=SOURCES,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    question = models.TextField()

    option_a = models.CharField(
        max_length=500,
        blank=True,
    )
    option_b = models.CharField(
        max_length=500,
        blank=True,
    )
    option_c = models.CharField(
        max_length=500,
        blank=True,
    )
    option_d = models.CharField(
        max_length=500,
        blank=True,
    )

    correct_answer = models.JSONField(
        default=list,
        blank=True,
    )
    explanation = models.TextField(blank=True)
    marks = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(
                fields=["task", "status"],
                name="assess_q_task_status_idx",
            ),
            models.Index(
                fields=["difficulty"],
                name="assess_q_difficulty_idx",
            ),
            models.Index(
                fields=["source"],
                name="assessment_question_source_idx",
            ),
        ]

    def __str__(self):
        return self.question[:100]


class Assessment(models.Model):
    STATUS_CHOICES = (
        ("not_started", "Not Started"),
        ("in_progress", "In Progress"),
        ("submitted", "Submitted"),
        ("passed", "Passed"),
        ("failed", "Failed"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="assessments",
    )
    task = models.ForeignKey(
        RoadmapTask,
        on_delete=models.CASCADE,
        related_name="assessments",
    )
    questions = models.ManyToManyField(
        AssessmentQuestion,
        related_name="assessments",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="not_started",
    )
    score = models.PositiveIntegerField(default=0)
    total_marks = models.PositiveIntegerField(default=0)
    passing_percentage = models.PositiveSmallIntegerField(default=70)

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    evaluated_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "task"],
                name="assessment_user_task_idx",
            ),
            models.Index(
                fields=["status"],
                name="assessment_status_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.task.title} - {self.status}"
        )


class AssessmentAnswer(models.Model):
    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    question = models.ForeignKey(
        AssessmentQuestion,
        on_delete=models.CASCADE,
        related_name="assessment_answers",
    )
    answer = models.JSONField(
        default=list,
        blank=True,
    )
    is_correct = models.BooleanField(default=False)
    marks_awarded = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["assessment", "question"],
                name="unique_assessment_question_answer",
            ),
        ]

    def __str__(self):
        return (
            f"Assessment {self.assessment_id} - "
            f"Question {self.question_id}"
        )