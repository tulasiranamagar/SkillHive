from django.core.management.base import BaseCommand

from accounts.services import permanently_deactivate_expired_accounts

class Command(BaseCommand):
    help = "Permanently deactivate accounts whose 30-day deactivation period has expired."

    def handle(self, *args, **options):
        count = permanently_deactivate_expired_accounts()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully deactivated {count} expired account(s)."
            )
        )