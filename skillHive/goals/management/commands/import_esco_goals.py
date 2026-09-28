import csv
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from goals.models import CareerGoal, GoalSkill
from skills.models import Skill


class Command(BaseCommand):
    help = (
        "Import and synchronize ESCO occupations, skills, "
        "and occupation-skill relationships."
    )

    ESCO_DIR = Path(__file__).resolve().parents[4] / "esco_new"

    OCCUPATIONS_FILE = ESCO_DIR / "occupations_en.csv"
    RELATIONS_FILE = ESCO_DIR / "occupationSkillRelations_en.csv"
    SKILLS_FILE = ESCO_DIR / "skills_en.csv"

    BATCH_SIZE = 2000

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help=(
                "Delete all CareerGoals and GoalSkills before importing. "
                "Do not use this for normal synchronization."
            ),
        )

    def handle(self, *args, **options):
        clear = options["clear"]

        self.stdout.write(
            "Starting ESCO synchronization..."
        )

        self._validate_files()

        with transaction.atomic():
            if clear:
                self.stdout.write(
                    self.style.WARNING(
                        "Clearing existing CareerGoals and GoalSkills..."
                    )
                )

                GoalSkill.objects.all().delete()
                CareerGoal.objects.all().delete()

            occupations = self._load_occupations()
            skill_metadata = self._load_skill_metadata()
            relations = self._load_relations()

            self.stdout.write(
                f"Loaded {len(occupations):,} occupations."
            )

            self.stdout.write(
                f"Loaded {len(skill_metadata):,} skills."
            )

            self.stdout.write(
                f"Loaded {len(relations):,} occupation-skill relationships."
            )

            (
                skills_created,
                skills_updated,
            ) = self._sync_skills(
                skill_metadata
            )

            goals_created = self._sync_goals(
                occupations
            )

            (
                goals_skills_created,
                goals_skills_updated,
                goals_skills_removed,
            ) = self._sync_goal_skills(
                occupations,
                relations,
            )

        self.stdout.write("")

        self.stdout.write(
            self.style.SUCCESS(
                "ESCO synchronization completed successfully."
            )
        )

        self.stdout.write(
            f"Skills created: {skills_created:,}"
        )

        self.stdout.write(
            f"Skills updated: {skills_updated:,}"
        )

        self.stdout.write(
            f"Career goals created: {goals_created:,}"
        )

        self.stdout.write(
            f"Goal skills created: {goals_skills_created:,}"
        )

        self.stdout.write(
            f"Goal skills updated: {goals_skills_updated:,}"
        )

        self.stdout.write(
            f"Stale goal skills removed: {goals_skills_removed:,}"
        )

    # ------------------------------------------------------------------
    # FILE VALIDATION
    # ------------------------------------------------------------------

    def _validate_files(self):
        required_files = [
            self.OCCUPATIONS_FILE,
            self.RELATIONS_FILE,
            self.SKILLS_FILE,
        ]

        for file_path in required_files:
            if not file_path.exists():
                raise FileNotFoundError(
                    f"Required ESCO file not found: {file_path}"
                )

    # ------------------------------------------------------------------
    # LOAD OCCUPATIONS
    # ------------------------------------------------------------------

    def _load_occupations(self):
        occupations = {}

        with self.OCCUPATIONS_FILE.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            reader = csv.DictReader(file)

            for row in reader:
                uri = (
                    row.get(
                        "conceptUri",
                        "",
                    )
                    .strip()
                )

                title = (
                    row.get(
                        "preferredLabel",
                        "",
                    )
                    .strip()
                )

                code = (
                    row.get(
                        "code",
                        "",
                    )
                    .strip()
                )

                if not uri or not title:
                    continue

                occupations[uri] = {
                    "uri": uri,
                    "title": title,
                    "code": code,
                }

        return occupations

    # ------------------------------------------------------------------
    # LOAD SKILLS
    # ------------------------------------------------------------------

    def _load_skill_metadata(self):
        metadata = {}

        with self.SKILLS_FILE.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            reader = csv.DictReader(file)

            for row in reader:
                uri = (
                    row.get(
                        "conceptUri",
                        "",
                    )
                    .strip()
                )

                if not uri:
                    continue

                name = (
                    row.get(
                        "preferredLabel",
                        "",
                    )
                    .strip()
                )

                if not name:
                    continue

                skill_type = self._normalize_skill_type(
                    row.get(
                        "skillType",
                        "",
                    )
                )

                reuse_level = self._normalize_reuse_level(
                    row.get(
                        "reuseLevel",
                        "",
                    )
                )

                description = (
                    row.get(
                        "definition",
                        "",
                    ).strip()
                    or row.get(
                        "description",
                        "",
                    ).strip()
                )

                metadata[uri] = {
                    "name": name,
                    "skill_type": skill_type,
                    "reuse_level": reuse_level,
                    "description": description,
                }

        return metadata

    # ------------------------------------------------------------------
    # LOAD RELATIONSHIPS
    # ------------------------------------------------------------------

    def _load_relations(self):
        relations = []

        with self.RELATIONS_FILE.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            reader = csv.DictReader(file)

            for row in reader:
                occupation_uri = (
                    row.get(
                        "occupationUri",
                        "",
                    )
                    .strip()
                )

                skill_uri = (
                    row.get(
                        "skillUri",
                        "",
                    )
                    .strip()
                )

                relation_type = (
                    row.get(
                        "relationType",
                        "",
                    )
                    .strip()
                    .lower()
                )

                skill_type = (
                    row.get(
                        "skillType",
                        "",
                    )
                    .strip()
                    .lower()
                )

                if (
                    not occupation_uri
                    or not skill_uri
                    or relation_type
                    not in {
                        "essential",
                        "optional",
                    }
                ):
                    continue

                relations.append(
                    {
                        "occupation_uri": occupation_uri,
                        "skill_uri": skill_uri,
                        "relation_type": relation_type,
                        "skill_type": skill_type,
                    }
                )

        return relations

    # ------------------------------------------------------------------
    # SYNCHRONIZE SKILLS
    # ------------------------------------------------------------------

    def _sync_skills(self, skill_metadata):
        """
        Synchronize ESCO skill metadata with SkillHive.

        Matching priority:

        1. ESCO URI
        2. Exact skill name

        Important:

        Skill.skill_type is NOT nullable in the database.

        Therefore:
        - Unknown ESCO skill types never overwrite an existing value.
        - New skills receive Skill.TYPE_SKILL_COMPETENCE as fallback.
        """

        existing_by_uri = {
            skill.esco_uri: skill
            for skill in (
                Skill.objects
                .exclude(
                    esco_uri__isnull=True
                )
                .exclude(
                    esco_uri=""
                )
            )
        }

        existing_by_name = {
            skill.name.strip().lower(): skill
            for skill in Skill.objects.all()
        }

        to_create = []
        to_update = []

        seen_skill_ids = set()

        for uri, data in skill_metadata.items():
            name = data["name"]

            if not name:
                continue

            skill = existing_by_uri.get(uri)

            if skill is None:
                skill = existing_by_name.get(
                    name.lower()
                )

            # ----------------------------------------------------------
            # EXISTING SKILL
            # ----------------------------------------------------------

            if skill is not None:
                changed = False

                # ------------------------------------------------------
                # ESCO URI
                # ------------------------------------------------------

                if skill.esco_uri != uri:
                    skill.esco_uri = uri
                    changed = True

                # ------------------------------------------------------
                # NAME
                # ------------------------------------------------------

                if skill.name != name:
                    skill.name = name
                    changed = True

                # ------------------------------------------------------
                # DESCRIPTION
                # ------------------------------------------------------

                if (
                    skill.description
                    != data["description"]
                ):
                    skill.description = (
                        data["description"]
                    )
                    changed = True

                # ------------------------------------------------------
                # SKILL TYPE
                #
                # NEVER write None to the NOT NULL column.
                # ------------------------------------------------------

                imported_skill_type = data[
                    "skill_type"
                ]

                if imported_skill_type is not None:
                    if (
                        skill.skill_type
                        != imported_skill_type
                    ):
                        skill.skill_type = (
                            imported_skill_type
                        )
                        changed = True

                # ------------------------------------------------------
                # REUSE LEVEL
                # ------------------------------------------------------

                imported_reuse_level = data[
                    "reuse_level"
                ]

                if imported_reuse_level is not None:
                    if (
                        skill.reuse_level
                        != imported_reuse_level
                    ):
                        skill.reuse_level = (
                            imported_reuse_level
                        )
                        changed = True

                # ------------------------------------------------------
                # QUEUE UPDATE
                # ------------------------------------------------------

                if (
                    changed
                    and skill.id
                    not in seen_skill_ids
                ):
                    to_update.append(skill)

                    seen_skill_ids.add(
                        skill.id
                    )

                continue

            # ----------------------------------------------------------
            # NEW SKILL
            # ----------------------------------------------------------

            imported_skill_type = data[
                "skill_type"
            ]

            if imported_skill_type is None:
                imported_skill_type = (
                    Skill.TYPE_SKILL_COMPETENCE
                )

            to_create.append(
                Skill(
                    name=name,
                    description=data[
                        "description"
                    ],
                    skill_type=imported_skill_type,
                    esco_uri=uri,
                    reuse_level=data[
                        "reuse_level"
                    ],
                )
            )

        created_count = 0
        updated_count = 0

        # --------------------------------------------------------------
        # BULK CREATE
        # --------------------------------------------------------------

        for start in range(
            0,
            len(to_create),
            self.BATCH_SIZE,
        ):
            batch = to_create[
                start:start + self.BATCH_SIZE
            ]

            created = Skill.objects.bulk_create(
                batch,
                batch_size=self.BATCH_SIZE,
                ignore_conflicts=True,
            )

            created_count += len(created)

        # --------------------------------------------------------------
        # BULK UPDATE
        # --------------------------------------------------------------

        if to_update:
            Skill.objects.bulk_update(
                to_update,
                [
                    "name",
                    "description",
                    "skill_type",
                    "esco_uri",
                    "reuse_level",
                ],
                batch_size=self.BATCH_SIZE,
            )

            updated_count = len(
                to_update
            )

        return (
            created_count,
            updated_count,
        )

    # ------------------------------------------------------------------
    # SYNCHRONIZE CAREER GOALS
    # ------------------------------------------------------------------

    def _sync_goals(self, occupations):
        existing_goals = {
            goal.title.strip().lower(): goal
            for goal in CareerGoal.objects.all()
        }

        to_create = []

        for data in occupations.values():
            title = data["title"]

            if not title:
                continue

            normalized_title = title.lower()

            if normalized_title in existing_goals:
                continue

            description = (
                f"ESCO occupation: {title}."
            )

            if data["code"]:
                description += (
                    f" ESCO code: {data['code']}."
                )

            to_create.append(
                CareerGoal(
                    title=title,
                    description=description,
                )
            )

        created_count = 0

        for start in range(
            0,
            len(to_create),
            self.BATCH_SIZE,
        ):
            batch = to_create[
                start:start + self.BATCH_SIZE
            ]

            created = CareerGoal.objects.bulk_create(
                batch,
                batch_size=self.BATCH_SIZE,
                ignore_conflicts=True,
            )

            created_count += len(created)

        return created_count

    # ------------------------------------------------------------------
    # SYNCHRONIZE GOAL-SKILL RELATIONSHIPS
    # ------------------------------------------------------------------

    def _sync_goal_skills(
        self,
        occupations,
        relations,
    ):
        goals = {
            goal.title.strip().lower(): goal
            for goal in CareerGoal.objects.all()
        }

        skills = {
            skill.esco_uri: skill
            for skill in (
                Skill.objects
                .exclude(
                    esco_uri__isnull=True
                )
                .exclude(
                    esco_uri=""
                )
            )
        }

        valid_pairs = {}

        for relation in relations:
            occupation = occupations.get(
                relation["occupation_uri"]
            )

            if not occupation:
                continue

            goal = goals.get(
                occupation["title"]
                .strip()
                .lower()
            )

            skill = skills.get(
                relation["skill_uri"]
            )

            if not goal or not skill:
                continue

            pair = (
                goal.id,
                skill.id,
            )

            valid_pairs[pair] = (
                relation["relation_type"]
            )

        existing_pairs = {
            (
                goal_skill.goal_id,
                goal_skill.skill_id,
            ): goal_skill
            for goal_skill in (
                GoalSkill.objects
                .select_related(
                    "goal",
                    "skill",
                )
            )
        }

        to_create = []
        to_update = []

        # --------------------------------------------------------------
        # CREATE / UPDATE RELATIONSHIPS
        # --------------------------------------------------------------

        for pair, relation_type in (
            valid_pairs.items()
        ):
            existing = existing_pairs.get(
                pair
            )

            if existing is None:
                goal_id, skill_id = pair

                to_create.append(
                    GoalSkill(
                        goal_id=goal_id,
                        skill_id=skill_id,
                        relation_type=relation_type,
                    )
                )

            elif (
                existing.relation_type
                != relation_type
            ):
                existing.relation_type = (
                    relation_type
                )

                to_update.append(
                    existing
                )

        # --------------------------------------------------------------
        # CREATE
        # --------------------------------------------------------------

        if to_create:
            GoalSkill.objects.bulk_create(
                to_create,
                batch_size=self.BATCH_SIZE,
                ignore_conflicts=True,
            )

        # --------------------------------------------------------------
        # UPDATE
        # --------------------------------------------------------------

        if to_update:
            GoalSkill.objects.bulk_update(
                to_update,
                ["relation_type"],
                batch_size=self.BATCH_SIZE,
            )

        # --------------------------------------------------------------
        # REMOVE STALE RELATIONSHIPS
        # --------------------------------------------------------------

        stale_ids = [
            goal_skill.id
            for pair, goal_skill in (
                existing_pairs.items()
            )
            if pair not in valid_pairs
        ]

        removed_count = 0

        for start in range(
            0,
            len(stale_ids),
            self.BATCH_SIZE,
        ):
            batch_ids = stale_ids[
                start:start + self.BATCH_SIZE
            ]

            deleted, _ = (
                GoalSkill.objects
                .filter(
                    id__in=batch_ids
                )
                .delete()
            )

            removed_count += deleted

        return (
            len(to_create),
            len(to_update),
            removed_count,
        )

    # ------------------------------------------------------------------
    # NORMALIZATION
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_skill_type(value):
        """
        Convert ESCO skillType values into Skill model choices.

        Unknown/empty ESCO values return None.

        The caller decides whether to preserve an existing value
        or apply the model's safe default for a new record.
        """

        value = (
            value or ""
        ).strip().lower()

        if value == "knowledge":
            return Skill.TYPE_KNOWLEDGE

        if value == "skill/competence":
            return Skill.TYPE_SKILL_COMPETENCE

        return None

    @staticmethod
    def _normalize_reuse_level(value):
        value = (
            value or ""
        ).strip().lower()

        allowed = {
            Skill.REUSE_TRANSVERSAL,
            Skill.REUSE_CROSS_SECTORAL,
            Skill.REUSE_SECTOR_SPECIFIC,
            Skill.REUSE_OCCUPATION_SPECIFIC,
        }

        if value in allowed:
            return value

        return None

