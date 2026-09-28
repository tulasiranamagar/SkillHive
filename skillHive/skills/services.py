from django.contrib.auth.models import User
from django.db import transaction

from .models import (
    Skill,
    UserInterest,
    UserSkill,
)


def get_known_skill_ids(user):
    """
    Return IDs of structured/global skills known by the user.

    Custom user-entered skills do not have Skill IDs, so they
    are intentionally excluded from this helper.
    """
    return set(
        UserSkill.objects.filter(
            user=user,
            skill_type=UserSkill.TYPE_KNOWN,
            skill__isnull=False,
        ).values_list(
            "skill_id",
            flat=True,
        )
    )


def get_wanted_skill_ids(user):
    """
    Return IDs of structured/global skills wanted by the user.

    Custom user-entered skills do not have Skill IDs, so they
    are intentionally excluded from this helper.
    """
    return set(
        UserSkill.objects.filter(
            user=user,
            skill_type=UserSkill.TYPE_WANTED,
            skill__isnull=False,
        ).values_list(
            "skill_id",
            flat=True,
        )
    )


def get_known_custom_skill_names(user):
    return set(
        UserSkill.objects.filter(
            user=user,
            skill_type=UserSkill.TYPE_KNOWN,
            skill__isnull=True,
        )
        .exclude(
            custom_name__isnull=True,
        )
        .exclude(
            custom_name="",
        )
        .values_list(
            "custom_name",
            flat=True,
        )
    )


def get_wanted_custom_skill_names(user):
    return set(
        UserSkill.objects.filter(
            user=user,
            skill_type=UserSkill.TYPE_WANTED,
            skill__isnull=True,
        )
        .exclude(
            custom_name__isnull=True,
        )
        .exclude(
            custom_name="",
        )
        .values_list(
            "custom_name",
            flat=True,
        )
    )


def get_interest_skill_ids(user):
    return set(
        UserInterest.objects.filter(
            user=user,
        ).values_list(
            "skill_id",
            flat=True,
        )
    )


def get_missing_skill_ids(user, skill_ids):
    known_ids = get_known_skill_ids(user)

    return {
        skill_id
        for skill_id in skill_ids
        if skill_id not in known_ids
    }


def get_missing_skills(user, skill_ids):
    missing_ids = get_missing_skill_ids(
        user=user,
        skill_ids=skill_ids,
    )

    return Skill.objects.filter(
        id__in=missing_ids,
    )

def user_knows_skill(user, skill):
    skill_id = (
        skill.id
        if isinstance(skill, Skill)
        else skill
    )

    return UserSkill.objects.filter(
        user=user,
        skill_id=skill_id,
        skill_type=UserSkill.TYPE_KNOWN,
    ).exists()


def user_wants_skill(user, skill):
    skill_id = (
        skill.id
        if isinstance(skill, Skill)
        else skill
    )

    return UserSkill.objects.filter(
        user=user,
        skill_id=skill_id,
        skill_type=UserSkill.TYPE_WANTED,
    ).exists()


def user_knows_custom_skill(user, custom_name):
    if not custom_name:
        return False

    return UserSkill.objects.filter(
        user=user,
        skill__isnull=True,
        custom_name__iexact=custom_name.strip(),
        skill_type=UserSkill.TYPE_KNOWN,
    ).exists()


def user_wants_custom_skill(user, custom_name):
    if not custom_name:
        return False

    return UserSkill.objects.filter(
        user=user,
        skill__isnull=True,
        custom_name__iexact=custom_name.strip(),
        skill_type=UserSkill.TYPE_WANTED,
    ).exists()

def _resolve_skill(skill):
    """
    Resolve a Skill instance or primary key to a Skill object.
    """
    if isinstance(skill, Skill):
        return skill

    try:
        return Skill.objects.get(
            pk=skill,
        )
    except Skill.DoesNotExist:
        raise ValueError(
            "The selected skill does not exist."
        )


def _normalize_custom_name(custom_name):
    if custom_name is None:
        return None

    custom_name = str(custom_name).strip()

    if not custom_name:
        return None

    return custom_name


def _find_existing_global_skill(custom_name):
    """
    If a user types the name of a skill that already exists in
    the global Skill Library, use that Skill instead of creating
    a duplicate custom skill.
    """
    if not custom_name:
        return None

    return (
        Skill.objects
        .filter(
            name__iexact=custom_name,
        )
        .first()
    )


@transaction.atomic
def add_or_update_user_skill(
    user,
    skill=None,
    skill_type=None,
    level=1,
    experience_years=0,
    custom_name=None,
):
    """
    Create or update a user's known/wanted skill.

    A user skill can be either:

        1. An existing SkillHive/ESCO Skill
        2. A custom user-entered skill

    If custom_name matches an existing global Skill by name,
    the existing Skill is used instead of creating a duplicate
    custom record.
    """

    if skill_type not in {
        UserSkill.TYPE_KNOWN,
        UserSkill.TYPE_WANTED,
    }:
        raise ValueError(
            "Invalid skill type."
        )

    custom_name = _normalize_custom_name(
        custom_name
    )

    if skill is not None and custom_name:
        raise ValueError(
            "Provide either skill or custom_name, not both."
        )

    if skill is not None:
        skill = _resolve_skill(skill)

        user_skill, _ = UserSkill.objects.update_or_create(
            user=user,
            skill=skill,
            defaults={
                "custom_name": None,
                "skill_type": skill_type,
                "level": level,
                "experience_years": experience_years,
            },
        )

        return user_skill

    if not custom_name:
        raise ValueError(
            "Either skill or custom_name is required."
        )

    existing_global_skill = _find_existing_global_skill(
        custom_name
    )

    if existing_global_skill is not None:
        user_skill, _ = UserSkill.objects.update_or_create(
            user=user,
            skill=existing_global_skill,
            defaults={
                "custom_name": None,
                "skill_type": skill_type,
                "level": level,
                "experience_years": experience_years,
            },
        )

        return user_skill

    # Case-insensitive duplicate protection at the service layer.
    existing_custom = (
        UserSkill.objects
        .filter(
            user=user,
            skill__isnull=True,
            custom_name__iexact=custom_name,
        )
        .first()
    )

    if existing_custom is not None:
        existing_custom.custom_name = custom_name
        existing_custom.skill_type = skill_type
        existing_custom.level = level
        existing_custom.experience_years = experience_years
        existing_custom.save(
            update_fields=[
                "custom_name",
                "skill_type",
                "level",
                "experience_years",
                "updated_at",
            ]
        )

        return existing_custom

    return UserSkill.objects.create(
        user=user,
        skill=None,
        custom_name=custom_name,
        skill_type=skill_type,
        level=level,
        experience_years=experience_years,
    )


@transaction.atomic
def update_user_skill(
    user,
    user_skill,
    *,
    skill=None,
    skill_type=None,
    level=None,
    experience_years=None,
    custom_name=None,
):
    """
    Update an existing UserSkill.

    Supports switching between:

        existing Skill -> another existing Skill
        existing Skill -> custom skill
        custom skill -> existing Skill
        custom skill -> another custom skill
    """

    if user_skill.user_id != user.id:
        raise PermissionError(
            "You cannot modify another user's skill."
        )

    if skill_type is None:
        skill_type = user_skill.skill_type

    if skill_type not in {
        UserSkill.TYPE_KNOWN,
        UserSkill.TYPE_WANTED,
    }:
        raise ValueError(
            "Invalid skill type."
        )

    if level is None:
        level = user_skill.level

    if experience_years is None:
        experience_years = user_skill.experience_years

    # Determine whether the request is changing the skill source.
    changing_skill_source = (
        skill is not None
        or custom_name is not None
    )

    if not changing_skill_source:
        if user_skill.skill_id:
            skill = user_skill.skill
            custom_name = None
        else:
            skill = None
            custom_name = user_skill.custom_name

    else:
        custom_name = _normalize_custom_name(
            custom_name
        )

        if skill is not None and custom_name:
            raise ValueError(
                "Provide either skill or custom_name, not both."
            )

        if skill is not None:
            skill = _resolve_skill(skill)

        elif custom_name:
            existing_global_skill = _find_existing_global_skill(
                custom_name
            )

            if existing_global_skill is not None:
                skill = existing_global_skill
                custom_name = None

        else:
            raise ValueError(
                "Either skill or custom_name is required."
            )

    # Existing global Skill.
    if skill is not None:
        conflicting_record = (
            UserSkill.objects
            .filter(
                user=user,
                skill=skill,
            )
            .exclude(
                pk=user_skill.pk,
            )
            .first()
        )

        if conflicting_record is not None:
            conflicting_record.skill_type = skill_type
            conflicting_record.level = level
            conflicting_record.experience_years = experience_years
            conflicting_record.save(
                update_fields=[
                    "skill_type",
                    "level",
                    "experience_years",
                    "updated_at",
                ]
            )

            user_skill.delete()

            return conflicting_record

        user_skill.skill = skill
        user_skill.custom_name = None

    # Custom skill.
    else:
        custom_name = _normalize_custom_name(
            custom_name
        )

        if not custom_name:
            raise ValueError(
                "Custom skill name cannot be empty."
            )

        conflicting_record = (
            UserSkill.objects
            .filter(
                user=user,
                skill__isnull=True,
                custom_name__iexact=custom_name,
            )
            .exclude(
                pk=user_skill.pk,
            )
            .first()
        )

        if conflicting_record is not None:
            conflicting_record.skill_type = skill_type
            conflicting_record.level = level
            conflicting_record.experience_years = experience_years

            conflicting_record.save(
                update_fields=[
                    "skill_type",
                    "level",
                    "experience_years",
                    "updated_at",
                ]
            )

            user_skill.delete()

            return conflicting_record

        user_skill.skill = None
        user_skill.custom_name = custom_name

    user_skill.skill_type = skill_type
    user_skill.level = level
    user_skill.experience_years = experience_years

    user_skill.save()

    return user_skill


@transaction.atomic
def remove_user_skill(
    user,
    skill,
):
    skill_id = (
        skill.id
        if isinstance(skill, Skill)
        else skill
    )

    deleted, _ = UserSkill.objects.filter(
        user=user,
        skill_id=skill_id,
    ).delete()

    return deleted > 0


@transaction.atomic
def remove_user_skill_record(
    user,
    user_skill,
):
    """
    Remove a specific UserSkill record belonging to the user.
    """

    if user_skill.user_id != user.id:
        raise PermissionError(
            "You cannot remove another user's skill."
        )

    user_skill.delete()

    return True


@transaction.atomic
def add_user_interest(
    user,
    skill,
):
    if not isinstance(skill, Skill):
        skill = Skill.objects.get(
            pk=skill
        )

    interest, _ = UserInterest.objects.get_or_create(
        user=user,
        skill=skill,
    )

    return interest


@transaction.atomic
def remove_user_interest(
    user,
    skill,
):
    skill_id = (
        skill.id
        if isinstance(skill, Skill)
        else skill
    )

    deleted, _ = UserInterest.objects.filter(
        user=user,
        skill_id=skill_id,
    ).delete()

    return deleted > 0


def get_exchange_candidates_for_skill(
    user,
    requested_skill,
):
    """
    Find users who know the requested structured Skill and may
    be relevant for peer exchange.

    Custom skills are not included here because exchange
    matching requires a shared structured Skill ID.
    """

    skill_id = (
        requested_skill.id
        if isinstance(requested_skill, Skill)
        else requested_skill
    )

    return (
        UserSkill.objects
        .filter(
            skill_id=skill_id,
            skill_type=UserSkill.TYPE_KNOWN,
        )
        .exclude(
            user=user,
        )
        .select_related(
            "user",
            "skill",
        )
    )


def get_skill_match_score(
    user,
    other_user,
):
    """
    Deterministic structured-skill compatibility score.

    AI recommendations remain separate from this basic
    exchange compatibility calculation.
    """

    user_known = get_known_skill_ids(user)
    user_wanted = get_wanted_skill_ids(user)

    other_known = get_known_skill_ids(other_user)
    other_wanted = get_wanted_skill_ids(other_user)

    can_learn = len(
        user_wanted & other_known
    )

    can_teach = len(
        other_wanted & user_known
    )

    return {
        "can_learn": can_learn,
        "can_teach": can_teach,
        "total_match": can_learn + can_teach,
    }


def get_mutual_skill_matches(user):
    """
    Return users where the two users can exchange structured
    skills in either direction.
    """

    user_known = get_known_skill_ids(user)
    user_wanted = get_wanted_skill_ids(user)

    if not user_known and not user_wanted:
        return User.objects.none()

    candidate_ids = set()

    if user_wanted:
        candidate_ids.update(
            UserSkill.objects.filter(
                skill_id__in=user_wanted,
                skill_type=UserSkill.TYPE_KNOWN,
            )
            .exclude(
                user=user,
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )

    if user_known:
        candidate_ids.update(
            UserSkill.objects.filter(
                skill_id__in=user_known,
                skill_type=UserSkill.TYPE_WANTED,
            )
            .exclude(
                user=user,
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )

    return User.objects.filter(
        id__in=candidate_ids,
        is_active=True,
    )