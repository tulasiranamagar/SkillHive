# import csv

# from django.core.management.base import (
#     BaseCommand,
#     CommandError,
# )

# from skills.models import Skill, SkillCategory


# class Command(BaseCommand):
#     help = "Import skills from an ESCO CSV file."

#     def add_arguments(self, parser):
#         parser.add_argument(
#             "--file",
#             required=True,
#             help="Path to the ESCO skills CSV file.",
#         )

#         parser.add_argument(
#             "--category",
#             default="ESCO Skills",
#             help="Default category for imported skills.",
#         )

#     def handle(self, *args, **options):
#         file_path = options["file"]
#         category_name = options["category"].strip()

#         if not category_name:
#             raise CommandError(
#                 "Category name cannot be empty."
#             )

#         try:
#             file = open(
#                 file_path,
#                 "r",
#                 encoding="utf-8-sig",
#                 newline="",
#             )
#         except OSError as exc:
#             raise CommandError(
#                 f"Unable to open CSV file: {exc}"
#             ) from exc

#         with file:
#             reader = csv.DictReader(file)

#             if not reader.fieldnames:
#                 raise CommandError(
#                     "The CSV file has no header row."
#                 )

#             field_map = {
#                 field.strip().lower(): field
#                 for field in reader.fieldnames
#                 if field
#             }

#             label_field = self._find_field(
#                 field_map,
#                 [
#                     "preferredlabel",
#                     "preferred label",
#                     "label",
#                     "name",
#                 ],
#             )

#             description_field = self._find_field(
#                 field_map,
#                 [
#                     "description",
#                     "scope note",
#                     "scopenote",
#                 ],
#             )

#             if not label_field:
#                 raise CommandError(
#                     "Could not find a skill name column. "
#                     "Expected preferredLabel or name."
#                 )

#             category, category_created = (
#                 SkillCategory.objects.get_or_create(
#                     name=category_name,
#                     defaults={
#                         "description": (
#                             "Skills imported from the "
#                             "ESCO dataset."
#                         )
#                     },
#                 )
#             )

#             created_count = 0
#             updated_count = 0
#             skipped_count = 0

#             for row in reader:
#                 name = (
#                     row.get(label_field) or ""
#                 ).strip()

#                 if not name:
#                     skipped_count += 1
#                     continue

#                 description = ""

#                 if description_field:
#                     description = (
#                         row.get(
#                             description_field
#                         )
#                         or ""
#                     ).strip()

#                 skill = (
#                     Skill.objects
#                     .filter(name__iexact=name)
#                     .first()
#                 )

#                 if skill:
#                     changed = False

#                     if not skill.category_id:
#                         skill.category = category
#                         changed = True

#                     if (
#                         description
#                         and not skill.description
#                     ):
#                         skill.description = description
#                         changed = True

#                     if changed:
#                         skill.save(
#                             update_fields=[
#                                 "category",
#                                 "description",
#                             ]
#                         )

#                     updated_count += 1
#                     continue

#                 Skill.objects.create(
#                     name=name,
#                     description=description,
#                     category=category,
#                 )

#                 created_count += 1

#         if category_created:
#             category_message = (
#                 f"Created category: {category_name}"
#             )
#         else:
#             category_message = (
#                 f"Using existing category: {category_name}"
#             )

#         self.stdout.write(
#             self.style.SUCCESS(
#                 "ESCO import completed."
#             )
#         )

#         self.stdout.write(category_message)
#         self.stdout.write(
#             f"Created: {created_count}"
#         )
#         self.stdout.write(
#             f"Updated: {updated_count}"
#         )
#         self.stdout.write(
#             f"Skipped: {skipped_count}"
#         )

#     @staticmethod
#     def _find_field(field_map, candidates):
#         for candidate in candidates:
#             normalized = candidate.lower()

#             if normalized in field_map:
#                 return field_map[normalized]

#         return None





import csv

from django.core.management.base import (
    BaseCommand,
    CommandError,
)

from skills.models import Skill, SkillCategory


class Command(BaseCommand):
    help = "Import skills from an ESCO CSV file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            required=True,
            help="Path to the ESCO skills CSV file.",
        )

        parser.add_argument(
            "--category",
            default="ESCO Skills",
            help="Default category for imported skills.",
        )

    def handle(self, *args, **options):
        file_path = options["file"]
        category_name = options["category"].strip()

        if not category_name:
            raise CommandError(
                "Category name cannot be empty."
            )

        try:
            file = open(
                file_path,
                "r",
                encoding="utf-8-sig",
                newline="",
            )
        except OSError as exc:
            raise CommandError(
                f"Unable to open CSV file: {exc}"
            ) from exc

        with file:
            reader = csv.DictReader(file)

            if not reader.fieldnames:
                raise CommandError(
                    "The CSV file has no header row."
                )

            field_map = {
                field.strip().lower(): field
                for field in reader.fieldnames
                if field
            }

            label_field = self._find_field(
                field_map,
                [
                    "preferredlabel",
                    "preferred label",
                    "label",
                    "name",
                ],
            )

            description_field = self._find_field(
                field_map,
                [
                    "description",
                    "scope note",
                    "scopenote",
                ],
            )

            if not label_field:
                raise CommandError(
                    "Could not find a skill name column. "
                    "Expected preferredLabel or name."
                )

            category, category_created = (
                SkillCategory.objects.get_or_create(
                    name=category_name,
                    defaults={
                        "description": (
                            "Skills imported from the "
                            "ESCO dataset."
                        )
                    },
                )
            )

            created_count = 0
            updated_count = 0
            skipped_count = 0

            for row in reader:
                name = (
                    row.get(label_field) or ""
                ).strip()

                if not name:
                    skipped_count += 1
                    continue

                description = ""

                if description_field:
                    description = (
                        row.get(description_field)
                        or ""
                    ).strip()

                skill = (
                    Skill.objects
                    .filter(name__iexact=name)
                    .first()
                )

                if skill:
                    changed = False

                    if not skill.category_id:
                        skill.category = category
                        changed = True

                    if (
                        description
                        and not skill.description
                    ):
                        skill.description = description
                        changed = True

                    if changed:
                        skill.save(
                            update_fields=[
                                "category",
                                "description",
                            ]
                        )

                    updated_count += 1
                    continue

                Skill.objects.create(
                    name=name,
                    description=description,
                    category=category,
                )

                created_count += 1

        category_message = (
            f"Created category: {category_name}"
            if category_created
            else f"Using existing category: {category_name}"
        )

        self.stdout.write(
            self.style.SUCCESS(
                "ESCO import completed."
            )
        )

        self.stdout.write(category_message)
        self.stdout.write(
            f"Created: {created_count}"
        )
        self.stdout.write(
            f"Updated: {updated_count}"
        )
        self.stdout.write(
            f"Skipped: {skipped_count}"
        )

    @staticmethod
    def _find_field(field_map, candidates):
        for candidate in candidates:
            normalized = candidate.lower()

            if normalized in field_map:
                return field_map[normalized]

        return None