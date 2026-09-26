import sqlite3
from datetime import datetime
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create a consistent SQLite backup in the workspace backups directory.'

    def handle(self, *args, **options):
        db = settings.DATABASES['default']
        if db['ENGINE'] != 'django.db.backends.sqlite3':
            raise CommandError('This command supports SQLite only.')
        directory = Path(settings.BASE_DIR).parent / 'backups'
        directory.mkdir(exist_ok=True)
        target = directory / f'potok_{datetime.now():%Y%m%d_%H%M%S_%f}.sqlite3'
        source = sqlite3.connect(str(db['NAME']))
        destination = sqlite3.connect(str(target))
        try:
            source.backup(destination)
        finally:
            destination.close()
            source.close()
        self.stdout.write(self.style.SUCCESS(str(target)))
