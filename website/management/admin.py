from django.contrib import admin
from .models import Project, BoardColumn, Card, ChecklistItem, Comment, Activity, Task


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'owner', 'created_at']
    filter_horizontal = ['members']
    search_fields = ['title']


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ['title', 'column', 'assignee', 'priority', 'due_date']
    list_filter = ['priority', 'column__project']
    search_fields = ['title']


admin.site.register([BoardColumn, ChecklistItem, Comment, Activity, Task])
