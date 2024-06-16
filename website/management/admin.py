from django.contrib import admin
from .forms import TaskAdminForm
from .models import Task
import json


class TaskAdmin(admin.ModelAdmin):
    form = TaskAdminForm
    list_display = ('title', 'user', 'created_at')
    fields = ('user', 'title', 'description', 'tasks')
    readonly_fields = ('created_at',)

    def save_model(self, request, obj, form, change):
        obj.tasks = form.cleaned_data['tasks']
        super().save_model(request, obj, form, change)


admin.site.register(Task, TaskAdmin)


# admin.site.register(Task)