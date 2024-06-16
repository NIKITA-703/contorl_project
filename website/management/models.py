from django.db import models
from django.conf import settings
import json


class Task(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255, verbose_name='Название задачи')
    description = models.TextField(verbose_name='Описание задачи', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    tasks = models.TextField(verbose_name='Список задач', blank=True, null=True)

    class Meta:
        verbose_name = 'Задача'
        verbose_name_plural = 'Задачи'

    def __str__(self):
        return self.title

    def get_tasks(self):
        if self.tasks:
            try:
                return json.loads(self.tasks)
            except json.JSONDecodeError:
                return []
        return []

    def set_tasks(self, tasks_list):
        if isinstance(tasks_list, list):
            self.tasks = json.dumps(tasks_list)
        else:
            self.tasks = json.dumps(tasks_list.split('\n'))
