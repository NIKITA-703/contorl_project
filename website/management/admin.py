from django.contrib import admin
from .models import Task


class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'created_at')
    fields = ('user', 'title', 'description', 'tasks')
    readonly_fields = ('created_at',)

    def save_model(self, request, obj, form, change):
        tasks_input = form.cleaned_data.get('tasks')
        if tasks_input:
            tasks_list = tasks_input.splitlines()  # Разбиваем строки по символам новой строки
            obj.set_tasks(tasks_list)
        super().save_model(request, obj, form, change)


admin.site.register(Task, TaskAdmin)


# admin.site.register(Task)