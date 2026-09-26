from django.db import models
from django.conf import settings
import json


class Task(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255, verbose_name='Название задачи')
    description = models.TextField(verbose_name='Описание задачи', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    tasks = models.JSONField(verbose_name='Список задач', blank=True, null=True, default=list)

    class Meta:
        verbose_name = 'Задача'
        verbose_name_plural = 'Задачи'

    def __str__(self):
        return self.title

    def get_tasks(self):
        if self.tasks:
            if isinstance(self.tasks, str):
                try:
                    return json.loads(self.tasks)
                except json.JSONDecodeError:
                    return []
            elif isinstance(self.tasks, list):
                return self.tasks
        return []

    def set_tasks(self, tasks_list):
        if isinstance(tasks_list, list):
            self.tasks = tasks_list
        else:
            self.tasks = tasks_list.split('\n')
        self.save()


class Project(models.Model):
    title = models.CharField('Название', max_length=120)
    description = models.TextField('Описание', blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_projects')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='projects', blank=True)
    color = models.CharField(max_length=7, default='#579b83')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']
        verbose_name = 'Проект'
        verbose_name_plural = 'Проекты'

    def __str__(self):
        return self.title


class BoardColumn(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='columns')
    title = models.CharField(max_length=120)
    position = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=7, default='#8792a2')
    is_done = models.BooleanField(default=False)

    class Meta:
        ordering = ['position', 'id']

    def __str__(self):
        return self.title


class Card(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Низкий'
        MEDIUM = 'medium', 'Обычный'
        HIGH = 'high', 'Высокий'
        URGENT = 'urgent', 'Срочный'

    column = models.ForeignKey(BoardColumn, on_delete=models.CASCADE, related_name='cards')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_cards')
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cards')
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    label = models.CharField(max_length=40, blank=True)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    position = models.PositiveIntegerField(default=0)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position', 'id']

    def __str__(self):
        return self.title


class ChecklistItem(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='checklist')
    text = models.CharField(max_length=255)
    done = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']


class Comment(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    text = models.TextField(max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']


class Activity(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activity')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    text = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
