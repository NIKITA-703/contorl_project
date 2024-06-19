from django.contrib import admin
from django.core.exceptions import ValidationError

from .forms import TaskAdminForm
from .models import Task
import json


class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'created_at']

    def save_model(self, request, obj, form, change):
        if isinstance(obj.tasks, list):
            obj.tasks = json.dumps(obj.tasks)  # сериализуем список в строку
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj and isinstance(obj.tasks, str):
            try:
                obj.tasks = json.loads(obj.tasks)  # десериализуем строку в список
            except json.JSONDecodeError:
                raise ValidationError("Invalid JSON format")
        return form


admin.site.register(Task, TaskAdmin)


# admin.site.register(Task)