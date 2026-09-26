"""Optional real-browser checks: manage.py test management.browser_checks.
Uses an isolated Django test database and the locally installed Chrome.
"""
from pathlib import Path
from django.conf import settings
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.management import call_command
from playwright.sync_api import sync_playwright, expect
from users.models import User
from .models import Project, Card

ARTIFACTS = Path(settings.BASE_DIR).parent / 'artifacts'


class BrowserChecks(StaticLiveServerTestCase):
    def setUp(self):
        ARTIFACTS.mkdir(exist_ok=True)
        self.owner = User.objects.create_user('designer', first_name='Никита', password='Browser-safe-123')
        self.colleague = User.objects.create_user('colleague', first_name='Алексей', password='Colleague-safe-123')
        call_command('demo_project', username='designer', verbosity=0)
        self.project = Project.objects.get(owner=self.owner)
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(channel='chrome', headless=True)
        self.context = self.browser.new_context(viewport={'width':1440,'height':1000}, locale='ru-RU')
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('response', lambda response: self.errors.append(f'HTTP {response.status}: {response.url}') if response.status >= 500 else None)

    def tearDown(self):
        if self.errors:
            print('Browser errors:', self.errors)
        self.browser.close()
        self.playwright.stop()

    def login(self):
        self.page.goto(self.live_server_url + '/user/login/')
        self.page.get_by_label('Логин', exact=True).fill('designer')
        self.page.get_by_label('Пароль', exact=True).fill('Browser-safe-123')
        self.page.get_by_role('button', name='Войти', exact=True).click()
        expect(self.page.locator('.task-card')).to_have_count(11)

    def test_complete_workspace_journey(self):
        page=self.page
        page.goto(self.live_server_url + '/user/login/')
        page.screenshot(path=str(ARTIFACTS/'login-desktop.png'),full_page=True)
        self.login()
        page.screenshot(path=str(ARTIFACTS/'board-desktop.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(ARTIFACTS/'board-mobile.png'),full_page=True,animations='disabled')
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        page.get_by_role('button',name='Открыть меню').click()
        expect(page.locator('body')).to_have_class('workspace-page sidebar-open')
        page.get_by_role('button',name='Мои задачи').click()
        expect(page.locator('.task-table')).to_be_visible()
        page.set_viewport_size({'width':1440,'height':1000})
        page.get_by_role('button',name='Сбросить',exact=True).click()
        page.get_by_role('tab',name='Доска',exact=True).click()

        page.get_by_role('button',name='Новая задача',exact=True).click()
        page.get_by_label('Название задачи',exact=True).fill('Проверка сохранения')
        page.get_by_label('Описание',exact=True).fill('Данные сохраняются после перезагрузки. <script>throw Error("unsafe")</script>')
        page.get_by_label('Метка',exact=True).fill('Тест')
        page.get_by_label('Приоритет',exact=True).select_option('high')
        page.get_by_label('Дата начала',exact=True).fill('2026-09-20')
        page.get_by_label('Дедлайн',exact=True).fill('2026-09-30')
        page.get_by_role('button',name='Создать задачу',exact=True).click()
        expect(page.get_by_role('heading',name='Детали задачи',exact=True)).to_be_visible()
        page.get_by_label('Новый пункт чек-листа').fill('Проверить результат')
        page.get_by_role('button',name='Добавить пункт',exact=True).click()
        expect(page.get_by_label('Проверить результат',exact=True)).to_be_visible()
        page.get_by_label('Проверить результат',exact=True).check()
        expect(page.locator('.checklist-row label')).to_have_class('checked')
        page.get_by_label('Комментарий',exact=True).fill('Готово, всё работает.')
        page.get_by_role('button',name='Отправить комментарий').click()
        expect(page.locator('.comment p')).to_have_text('Готово, всё работает.')
        page.get_by_role('button',name='Взять задачу на себя').click()
        expect(page.get_by_label('Исполнитель',exact=True)).to_have_value(str(self.owner.pk))
        page.screenshot(path=str(ARTIFACTS/'task-details.png'),full_page=True)
        page.get_by_role('button',name='Закрыть окно',exact=True).click()
        page.reload()
        expect(page.locator('.task-card')).to_have_count(12)
        card = page.locator('.task-card').filter(has=page.get_by_role('heading',name='Проверка сохранения',exact=True))
        destination = page.locator('.board-column').filter(has=page.get_by_role('heading',name='Готово',exact=True))
        card.drag_to(destination.locator('.column-header'))
        expect(destination.locator('.task-card')).to_have_count(4)
        page.reload()
        expect(destination.locator('.task-card')).to_have_count(4)
        page.get_by_label('Найти задачу',exact=True).fill('Проверка сохранения')
        expect(page.locator('.task-card')).to_have_count(1)
        page.get_by_role('button',name='Сбросить',exact=True).click()
        expect(page.locator('.task-card')).to_have_count(12)

        for tab, selector in [('Список','.task-table'),('Календарь','.calendar'),('Таймлайн','.timeline')]:
            page.get_by_role('tab',name=tab,exact=True).click()
            expect(page.locator(selector)).to_be_visible()
        page.screenshot(path=str(ARTIFACTS/'timeline-desktop.png'),full_page=True)
        page.get_by_role('button',name='Обзор проекта',exact=True).click()
        expect(page.locator('.metric-card')).to_have_count(4)
        page.get_by_role('button',name='Активность',exact=True).click()
        expect(page.locator('.activity-item').first).to_be_visible()
        page.locator('.header-actions').get_by_role('button',name='Команда',exact=True).click()
        page.get_by_label('Добавить участника по логину').fill('colleague')
        page.get_by_role('button',name='Добавить в проект').click()
        expect(page.locator('.team-row')).to_have_count(2)
        page.get_by_role('button',name='Закрыть окно',exact=True).click()
        page.get_by_role('tab',name='Доска',exact=True).click()
        with page.expect_download() as download:
            page.get_by_role('button',name='Экспорт задач в CSV').click()
        download.value.save_as(ARTIFACTS/'project-export.csv')
        self.assertIn('Проверка сохранения',(ARTIFACTS/'project-export.csv').read_text(encoding='utf-8-sig'))
        saved=page.request.get(self.live_server_url+f'/management/api/projects/{self.project.pk}/').json()
        self.assertIn(self.colleague.pk,[member['id'] for member in saved['members']])
        self.assertEqual(len(next(c for c in saved['cards'] if c['title']=='Проверка сохранения')['comments']),1)
        self.assertEqual(self.errors,[])

    def test_registration_first_project_and_mobile_edit(self):
        page=self.page
        page.set_viewport_size({'width':390,'height':844})
        page.goto(self.live_server_url+'/user/registration/')
        page.get_by_label('Имя пользователя',exact=True).fill('newperson')
        page.get_by_label('Пароль',exact=True).fill('New-person-safe-123')
        page.get_by_label('Подтверждение пароля',exact=True).fill('New-person-safe-123')
        page.get_by_role('button',name='Создать аккаунт',exact=True).click()
        expect(page.get_by_role('heading',name='Дайте идеям пространство')).to_be_visible()
        page.locator('.empty-state').get_by_role('button',name='Создать проект',exact=True).click()
        page.get_by_label('Название проекта').fill('Мой первый проект')
        page.locator('dialog').get_by_role('button',name='Создать проект',exact=True).click()
        expect(page.get_by_role('heading',name='Мой первый проект',exact=True)).to_be_visible()
        expect(page.locator('.board-column')).to_have_count(4)
        page.get_by_role('button',name='Новая задача',exact=True).click()
        page.get_by_label('Название задачи',exact=True).fill('Задача с телефона')
        page.get_by_role('button',name='Создать задачу',exact=True).click()
        expect(page.get_by_role('heading',name='Детали задачи',exact=True)).to_be_visible()
        page.get_by_label('Колонка',exact=True).select_option(label='В работе')
        page.get_by_role('button',name='Сохранить изменения',exact=True).click()
        expect(page.locator('dialog')).not_to_be_visible()
        page.reload()
        expect(page.locator('.board-column').filter(has=page.get_by_role('heading',name='В работе',exact=True)).locator('.task-card')).to_have_count(1)
        self.assertEqual(self.errors,[])

    def test_conflict_and_network_error_keep_draft(self):
        self.login()
        page=self.page
        page.locator('.task-card').first.click()
        original=page.get_by_label('Название задачи',exact=True).input_value()
        page.get_by_label('Название задачи',exact=True).fill('Мой черновик')
        api=self.live_server_url+f'/management/api/projects/{self.project.pk}/'
        card=page.request.get(api).json()['cards'][0]
        csrf=next(cookie['value'] for cookie in self.context.cookies() if cookie['name']=='csrftoken')
        updated=page.request.post(api,data={
            'action':'card_update','card_id':card['id'],'version':card['version'],
            'title':'Изменено другим участником','description':card['description'],
            'column':card['column_id'],'assignee':'','priority':card['priority'],
            'label':card['label'],'start_date':card['start_date'],'due_date':card['due_date'],
        },headers={'X-CSRFToken':csrf})
        self.assertEqual(updated.status,200)
        page.get_by_role('button',name='Сохранить изменения',exact=True).click()
        expect(page.locator('#form-error')).to_contain_text('уже изменена')
        expect(page.get_by_label('Название задачи',exact=True)).to_have_value('Мой черновик')
        page.once('dialog',lambda dialog: dialog.accept())
        page.get_by_role('button',name='Загрузить актуальную версию').click()
        expect(page.get_by_label('Название задачи',exact=True)).to_have_value('Изменено другим участником')
        page.get_by_label('Название задачи',exact=True).fill(original+' — проверено')
        page.route('**/management/api/projects/*/',lambda route: route.abort() if route.request.method=='POST' else route.continue_())
        page.get_by_role('button',name='Сохранить изменения',exact=True).click()
        expect(page.locator('#form-error')).to_contain_text('Нет связи с сервером')
        expect(page.get_by_label('Название задачи',exact=True)).to_have_value(original+' — проверено')
        page.unroute('**/management/api/projects/*/')
        page.get_by_role('button',name='Сохранить изменения',exact=True).click()
        expect(page.locator('dialog')).not_to_be_visible()
        page.reload()
        expect(page.get_by_role('heading',name=original+' — проверено',exact=True)).to_be_visible()
        self.assertEqual(self.errors,[])
