from django.core.management.base import BaseCommand
from .models import Task  # Импортируем модель Task из вашего приложения management
import json


class Command(BaseCommand):
    help = 'Update existing tasks data to JSON format'

    def handle(self, *args, **kwargs):
        tasks = Task.objects.all()
        for task in tasks:
            if isinstance(task.tasks, str):
                try:
                    task.tasks = json.loads(task.tasks)
                except json.JSONDecodeError:
                    task.tasks = []
                task.save()
        self.stdout.write(self.style.SUCCESS('Successfully updated tasks'))
