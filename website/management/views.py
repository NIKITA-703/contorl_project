import json
from functools import wraps

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Q, Max, Prefetch, F
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from users.models import User
from .forms import CardForm, ProjectForm
from .models import Project, BoardColumn, Card, ChecklistItem, Comment, Activity


def accessible_projects(user):
    return Project.objects.filter(Q(owner=user) | Q(members=user)).distinct()


def person(user):
    if not user:
        return {'id': None, 'name': 'Удалённый пользователь', 'username': '', 'avatar': ''}
    return {'id': user.id, 'name': user.get_full_name() or user.username, 'username': user.username,
            'avatar': user.image.url if user.image else ''}


def project_summary(project):
    return {'id': project.id, 'title': project.title, 'description': project.description,
            'color': project.color, 'owner_id': project.owner_id}


def board_data(project, user):
    columns = list(project.columns.all())
    cards = Card.objects.filter(column__project=project).select_related('creator', 'assignee').prefetch_related(
        'checklist', Prefetch('comments', queryset=Comment.objects.select_related('author')))
    members = User.objects.filter(Q(pk=project.owner_id) | Q(projects=project)).distinct().order_by('username')
    return {
        'project': project_summary(project), 'me': person(user),
        'members': [person(member) for member in members],
        'columns': [{'id': c.id, 'title': c.title, 'color': c.color, 'is_done': c.is_done} for c in columns],
        'cards': [{
            'id': c.id, 'column_id': c.column_id, 'title': c.title, 'description': c.description,
            'creator': person(c.creator), 'assignee_id': c.assignee_id, 'priority': c.priority, 'label': c.label,
            'start_date': c.start_date, 'due_date': c.due_date, 'version': c.version,
            'created_at': c.created_at, 'updated_at': c.updated_at,
            'checklist': [{'id': i.id, 'text': i.text, 'done': i.done} for i in c.checklist.all()],
            'comments': [{'id': i.id, 'text': i.text, 'author': person(i.author), 'created_at': i.created_at} for i in c.comments.all()],
        } for c in cards],
        'activity': [{'id': a.id, 'actor': person(a.actor), 'text': a.text, 'created_at': a.created_at}
                     for a in project.activity.select_related('actor')[:30]],
    }


@login_required
@ensure_csrf_cookie
def workspace(request, project_id=None):
    projects = list(accessible_projects(request.user).order_by('-created_at', '-id'))
    project = get_object_or_404(accessible_projects(request.user), pk=project_id) if project_id else (projects[0] if projects else None)
    initial = board_data(project, request.user) if project else {'project': None, 'me': person(request.user)}
    initial['projects'] = [project_summary(p) for p in projects]
    return render(request, 'management/main_management.html', {'initial': initial, 'active_project': project})


class ApiError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def api_errors(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Войдите в аккаунт, чтобы продолжить.'}, status=401)
        try:
            return view(request, *args, **kwargs)
        except ApiError as error:
            return JsonResponse({'error': error.message}, status=error.status)
        except (ValueError, TypeError):
            return JsonResponse({'error': 'Некорректные данные запроса.'}, status=400)
    return wrapped


def payload(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        raise ApiError('Не удалось прочитать данные запроса.')
    if not isinstance(data, dict):
        raise ApiError('Ожидается объект JSON.')
    return data


def text_field(data, key, limit=255):
    value = data.get(key, '')
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise ApiError(f'Заполните поле «{key}» (до {limit} символов).')
    return value.strip()


def valid_form(form):
    if not form.is_valid():
        raise ApiError(' '.join(str(message) for messages in form.errors.values() for message in messages))
    return form


def log(project, user, text):
    Activity.objects.create(project=project, actor=user, text=text[:500])


def owner_only(project, user):
    if project.owner_id != user.id:
        raise ApiError('Это действие доступно владельцу проекта.', 403)


def next_position(queryset):
    maximum = queryset.aggregate(value=Max('position'))['value']
    return 0 if maximum is None else maximum + 1


@require_http_methods(['GET', 'POST'])
@api_errors
def projects_api(request):
    if request.method == 'GET':
        return JsonResponse({'projects': [project_summary(p) for p in accessible_projects(request.user)]})
    form = valid_form(ProjectForm(payload(request)))
    with transaction.atomic():
        project = form.save(commit=False)
        project.owner = request.user
        project.save()
        project.members.add(request.user)
        for index, (title, color) in enumerate([('Новые', '#8792a2'), ('В работе', '#cc9a52'), ('На проверке', '#9582bd'), ('Готово', '#579b83')]):
            BoardColumn.objects.create(project=project, title=title, position=index, color=color, is_done=index == 3)
        log(project, request.user, 'создал проект')
    return JsonResponse({'id': project.id}, status=201)


@require_http_methods(['GET', 'POST'])
@api_errors
def project_api(request, project_id):
    project = get_object_or_404(accessible_projects(request.user), pk=project_id)
    if request.method == 'GET':
        return JsonResponse(board_data(project, request.user))
    data = payload(request)
    with transaction.atomic():
        project = Project.objects.select_for_update().get(pk=project.pk)
        if not accessible_projects(request.user).filter(pk=project.pk).exists():
            raise ApiError('Вы больше не состоите в этом проекте.', 403)
        result = mutate(project, request.user, data)
    return JsonResponse(result)


def mutate(project, user, data):
    action = data.get('action')
    if action == 'project_update':
        owner_only(project, user)
        valid_form(ProjectForm(data, instance=project)).save()
        log(project, user, 'обновил настройки проекта')
    elif action == 'project_delete':
        owner_only(project, user)
        project.delete()
        return {'deleted': True}
    elif action == 'member_add':
        owner_only(project, user)
        member = User.objects.filter(username=text_field(data, 'username', 150), is_active=True).first()
        if not member:
            raise ApiError('Пользователь с таким логином не найден. Сначала ему нужно зарегистрироваться.')
        project.members.add(member)
        log(project, user, f'добавил участника @{member.username}')
    elif action == 'member_remove':
        owner_only(project, user)
        member = get_object_or_404(project.members, pk=data.get('member_id'))
        if member.pk == project.owner_id:
            raise ApiError('Нельзя удалить владельца проекта.')
        project.members.remove(member)
        Card.objects.filter(column__project=project, assignee=member).update(assignee=None, version=F('version') + 1)
        log(project, user, f'удалил участника @{member.username}')
    elif action in ('column_create', 'column_update', 'column_delete'):
        owner_only(project, user)
        if action == 'column_create':
            column = BoardColumn.objects.create(project=project, title=text_field(data, 'title', 120), position=next_position(project.columns))
            log(project, user, f'создал колонку «{column.title}»')
        else:
            column = get_object_or_404(project.columns, pk=data.get('column_id'))
            if action == 'column_delete':
                if column.cards.exists():
                    raise ApiError('Сначала перенесите или удалите задачи из этой колонки.')
                if project.columns.count() <= 1:
                    raise ApiError('В проекте должна остаться хотя бы одна колонка.')
                column.delete()
            else:
                column.title = text_field(data, 'title', 120)
                if not isinstance(data.get('is_done'), bool):
                    raise ApiError('Укажите тип колонки.')
                column.is_done = data['is_done']
                column.save()
    elif action == 'card_create':
        form = valid_form(CardForm(data, project=project))
        card = form.save(commit=False)
        card.creator = user
        card.position = next_position(card.column.cards)
        card.save()
        log(project, user, f'создал задачу «{card.title}»')
        return {'ok': True, 'card_id': card.id}
    elif action in ('card_update', 'card_move', 'card_delete', 'card_claim', 'comment_add', 'checklist_add', 'checklist_toggle', 'checklist_delete'):
        card = get_object_or_404(Card.objects.select_for_update(), pk=data.get('card_id'), column__project=project)
        if action in ('card_update', 'card_move', 'card_delete', 'card_claim') and data.get('version') != card.version:
            raise ApiError('Задача уже изменена другим участником. Обновите доску и повторите действие.', 409)
        if action == 'card_delete':
            log(project, user, f'удалил задачу «{card.title}»')
            card.delete()
        elif action == 'card_update':
            old_column_id = card.column_id
            card = valid_form(CardForm(data, instance=card, project=project)).save(commit=False)
            if card.column_id != old_column_id:
                card.position = next_position(card.column.cards)
            card.version += 1
            card.save()
            log(project, user, f'обновил задачу «{card.title}»')
        elif action == 'card_move':
            column = get_object_or_404(project.columns, pk=data.get('column_id'))
            others = list(column.cards.exclude(pk=card.pk))
            index = max(0, min(int(data.get('position', len(others))), len(others)))
            others.insert(index, card)
            for position, item in enumerate(others):
                Card.objects.filter(pk=item.pk).update(position=position)
            card.column, card.position = column, index
            card.version += 1
            card.save()
            log(project, user, f'переместил «{card.title}» в «{column.title}»')
        elif action == 'card_claim':
            if card.assignee_id and card.assignee_id != user.id:
                raise ApiError('У задачи уже есть исполнитель.')
            card.assignee = user
            card.version += 1
            card.save()
            log(project, user, f'взял в работу «{card.title}»')
        elif action == 'comment_add':
            Comment.objects.create(card=card, author=user, text=text_field(data, 'text', 4000))
            log(project, user, f'добавил комментарий к «{card.title}»')
        elif action == 'checklist_add':
            ChecklistItem.objects.create(card=card, text=text_field(data, 'text'))
        else:
            item = get_object_or_404(card.checklist, pk=data.get('item_id'))
            if action == 'checklist_delete':
                item.delete()
            else:
                if not isinstance(data.get('done'), bool):
                    raise ApiError('Некорректное значение отметки.')
                item.done = data['done']
                item.save()
    else:
        raise ApiError('Неизвестное действие.')
    return {'ok': True}
