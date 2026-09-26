import json
from datetime import date
from django.db import migrations


def parse_date(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def import_tasks(apps, schema_editor):
    Task = apps.get_model('management', 'Task')
    Project = apps.get_model('management', 'Project')
    Column = apps.get_model('management', 'BoardColumn')
    Card = apps.get_model('management', 'Card')
    User = apps.get_model('users', 'User')
    for user_id in Task.objects.values_list('user_id', flat=True).distinct():
        user = User.objects.get(pk=user_id)
        project = Project.objects.create(title=f'Личные задачи · {user.username}'[:120], owner_id=user_id,
                                         description='Задачи, перенесённые из первоначальной версии проекта.')
        project.members.add(user)
        for position, old in enumerate(Task.objects.filter(user_id=user_id).order_by('id')):
            column = Column.objects.create(project=project, title=old.title[:120] or 'Без названия', position=position)
            tasks = old.tasks
            for _ in range(3):
                if not isinstance(tasks, str):
                    break
                try:
                    tasks = json.loads(tasks)
                except (ValueError, TypeError):
                    tasks = [tasks]
                    break
            if not isinstance(tasks, list):
                tasks = [] if tasks is None else [str(tasks)]
            for index, raw in enumerate(tasks):
                item = raw if isinstance(raw, dict) else {'content': str(raw)}
                content = str(item.get('content') or 'Без названия')
                description = str(item.get('details') or '')
                if len(content) > 255:
                    description = content + '\n\n' + description
                if old.description:
                    description += '\n\nОписание исходной колонки: ' + old.description
                status = item.get('status')
                if status:
                    description += '\n\nИсходный статус: ' + str(status)
                assignee = item.get('assignee')
                if assignee and assignee not in ('---', user.username):
                    description += '\nИсходный исполнитель: ' + str(assignee)
                start = parse_date(item.get('startDate') or item.get('start_date'))
                due = parse_date(item.get('endDate') or item.get('end_date'))
                if start and due and start > due:
                    start = None
                Card.objects.create(column=column, creator_id=user_id,
                                    assignee_id=user_id if assignee == user.username else None,
                                    title=content[:255], description=description.strip(), position=index,
                                    start_date=start, due_date=due)


class Migration(migrations.Migration):
    dependencies = [('management', '0003_boardcolumn_card_checklistitem_comment_project_and_more')]
    # Forward-only: the imported records may subsequently be edited by users.
    operations = [migrations.RunPython(import_tasks)]
