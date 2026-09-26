from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from users.models import User
from management.models import Project, BoardColumn, Card, ChecklistItem, Comment, Activity


class Command(BaseCommand):
    help = 'Create an example project for an existing user; never changes passwords or existing tasks.'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)

    @transaction.atomic
    def handle(self, *args, **options):
        user = User.objects.filter(username=options['username']).first()
        if not user:
            raise CommandError('User not found. Create an account first.')
        title = 'Запуск продукта'
        if Project.objects.filter(owner=user, title=title).exists():
            self.stdout.write('Example project already exists; nothing changed.')
            return
        project = Project.objects.create(owner=user, title=title, color='#b5c98b',
            description='От идеи до первого релиза. Создаём продукт, которым хочется пользоваться.')
        project.members.add(user)
        columns = [BoardColumn.objects.create(project=project, title=name, color=color, position=i, is_done=i == 3)
                   for i, (name, color) in enumerate([('Новые', '#98a890'), ('В работе', '#c5a26b'), ('На проверке', '#a296ba'), ('Готово', '#83a46c')])]
        rows = [
            (0, 'Провести интервью с пользователями', 'Узнать, как люди решают задачу сегодня. Собрать боли, ожидания и первые гипотезы.', 'Исследование', 'high', 4, False),
            (0, 'Подготовить контент для запуска', 'Тексты для главной страницы, рассылки и первого знакомства с продуктом.', 'Маркетинг', 'medium', 7, False),
            (0, 'Продумать сценарий первого входа', 'Помочь новым пользователям сделать первый шаг без лишних вопросов.', 'Продукт', 'low', 9, False),
            (1, 'Собрать дизайн-систему', 'Цвета, типографика и компоненты. Единый визуальный язык для всего продукта.', 'Дизайн', 'high', 2, True),
            (1, 'Разработать личный кабинет', 'Профиль, настройки и быстрый доступ ко всем рабочим проектам.', 'Разработка', 'medium', 5, True),
            (1, 'Настроить события аналитики', 'Определить ключевые действия и подготовить карту событий для первого релиза.', 'Аналитика', 'urgent', -1, False),
            (2, 'Проверить адаптивную верстку', 'Проверяем интерфейс на телефоне, планшете и большом экране.', 'Разработка', 'medium', 1, True),
            (2, 'Согласовать структуру лендинга', 'История продукта: от проблемы пользователя до понятного решения.', 'Дизайн', 'high', 3, False),
            (3, 'Сформулировать видение продукта', 'Определили аудиторию, ценность и цель первого релиза.', 'Продукт', 'high', -3, True),
            (3, 'Исследовать конкурентов', 'Собрали сильные стороны существующих решений и точки роста.', 'Исследование', 'medium', -2, True),
            (3, 'Подготовить рабочее пространство', 'Всё готово: доска, этапы и первые задачи. Можно начинать.', 'Команда', 'low', -1, True),
        ]
        today = timezone.localdate()
        for index, (col, name, description, label, priority, days, assigned) in enumerate(rows):
            card = Card.objects.create(column=columns[col], title=name, description=description,
                creator=user, assignee=user if assigned else None, priority=priority, label=label,
                start_date=today-timedelta(days=5 if col == 3 else 2), due_date=today+timedelta(days=days), position=index)
            if index in (0, 3, 6):
                for n, text in enumerate(['Подготовить план', 'Выполнить основную работу', 'Проверить результат']):
                    ChecklistItem.objects.create(card=card, text=text, done=n == 0)
            if index == 3:
                Comment.objects.create(card=card, author=user, text='Начнём с базовых компонентов: кнопки, поля ввода и карточки. Здесь можно обсудить детали.')
        Activity.objects.create(project=project, actor=user, text='создал пример проекта. Все задачи можно менять или удалить')
        self.stdout.write(self.style.SUCCESS(f'Example project created: /management/project/{project.id}/'))
