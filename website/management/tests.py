import importlib
import json
from datetime import date
from django.apps import apps
from django.test import TestCase, Client
from django.urls import reverse
from users.models import User
from .models import Project, BoardColumn, Card, Task, ChecklistItem, Comment


class WorkspaceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user('owner', password='Owner-safe-123')
        cls.member = User.objects.create_user('member', password='Member-safe-123')
        cls.outsider = User.objects.create_user('outsider', password='Outside-safe-123')
        cls.project = Project.objects.create(title='Project', owner=cls.owner)
        cls.project.members.add(cls.owner, cls.member)
        cls.todo = BoardColumn.objects.create(project=cls.project, title='Todo')
        cls.done = BoardColumn.objects.create(project=cls.project, title='Done', position=1, is_done=True)
        cls.card = Card.objects.create(column=cls.todo, title='Original', creator=cls.owner)
        cls.other = Project.objects.create(title='Other', owner=cls.outsider)
        cls.foreign_column = BoardColumn.objects.create(project=cls.other, title='Private')
        cls.foreign_card = Card.objects.create(column=cls.foreign_column, title='Private task')

    def setUp(self):
        self.client.force_login(self.owner)
        self.url = reverse('management:project_api', args=[self.project.pk])

    def post(self, **data):
        return self.client.post(self.url, json.dumps(data), content_type='application/json')

    def card_fields(self, **changes):
        fields = dict(action='card_update', card_id=self.card.pk, version=1, title='Updated',
                      description='Details', column=self.todo.pk, assignee='', priority='high',
                      label='Design', start_date='2026-01-01', due_date='2026-01-10')
        fields.update(changes)
        return fields

    def test_authentication_required(self):
        self.client.logout()
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(self.client.get('/management/').status_code, 302)

    def test_workspace_and_serialization(self):
        self.assertEqual(self.client.get('/management/').status_code, 200)
        data = self.client.get(self.url).json()
        self.assertEqual(len(data['cards']), 1)
        self.assertEqual(data['cards'][0]['title'], 'Original')
        self.assertEqual(len(data['members']), 2)

    def test_outsider_cannot_read_or_mutate(self):
        self.client.force_login(self.outsider)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.post(action='card_delete', card_id=self.card.pk, version=1).status_code, 404)
        self.assertEqual(self.client.get(reverse('management:project', args=[self.project.pk])).status_code, 404)

    def test_projects_list_is_scoped(self):
        data = self.client.get(reverse('management:projects_api')).json()
        self.assertEqual([p['id'] for p in data['projects']], [self.project.pk])

    def test_project_create_has_four_columns(self):
        result = self.client.post(reverse('management:projects_api'), json.dumps(
            {'title':'New','description':'Plan','color':'#aabbcc'}), content_type='application/json')
        self.assertEqual(result.status_code, 201)
        project = Project.objects.get(pk=result.json()['id'])
        self.assertEqual(project.columns.count(), 4)
        self.assertEqual(project.columns.filter(is_done=True).count(), 1)
        self.assertTrue(project.members.filter(pk=self.owner.pk).exists())

    def test_project_color_validation(self):
        response = self.client.post(reverse('management:projects_api'), json.dumps(
            {'title':'X','color':'red;url(evil)'}), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_member_can_create_and_edit_card(self):
        self.client.force_login(self.member)
        fields = self.card_fields(action='card_create')
        self.assertEqual(self.post(**fields).status_code, 200)
        self.assertEqual(self.post(**self.card_fields(assignee=self.member.pk)).status_code, 200)
        self.card.refresh_from_db()
        self.assertEqual(self.card.assignee, self.member)
        self.assertEqual(self.card.version, 2)

    def test_stale_card_does_not_overwrite_new_changes(self):
        self.assertEqual(self.post(**self.card_fields()).status_code, 200)
        self.assertEqual(self.post(**self.card_fields(title='Stale')).status_code, 409)
        self.card.refresh_from_db()
        self.assertEqual(self.card.title, 'Updated')

    def test_foreign_column_and_assignee_rejected(self):
        for fields in [self.card_fields(column=self.foreign_column.pk), self.card_fields(assignee=self.outsider.pk)]:
            self.assertEqual(self.post(**fields).status_code, 400)
        self.card.refresh_from_db()
        self.assertEqual(self.card.title, 'Original')

    def test_foreign_card_injection_rejected(self):
        for action in ['card_delete', 'card_claim', 'comment_add', 'checklist_add']:
            self.assertEqual(self.post(action=action, card_id=self.foreign_card.pk, version=1, text='x').status_code, 404)

    def test_invalid_dates_and_empty_title(self):
        for change in [dict(start_date='2026-02-01'), dict(due_date='invalid'), dict(title=' ')]:
            self.assertEqual(self.post(**self.card_fields(**change)).status_code, 400)

    def test_move_card_persists_order_and_completion(self):
        other = Card.objects.create(column=self.done, title='Other')
        response = self.post(action='card_move', card_id=self.card.pk, version=1, column_id=self.done.pk, position=0)
        self.assertEqual(response.status_code, 200)
        self.card.refresh_from_db()
        self.assertEqual(self.card.column, self.done)
        self.assertEqual(list(self.done.cards.values_list('pk', flat=True)), [self.card.pk, other.pk])
        self.assertEqual(self.card.version, 2)

    def test_move_cannot_cross_project(self):
        self.assertEqual(self.post(action='card_move',card_id=self.card.pk,version=1,column_id=self.foreign_column.pk).status_code,404)

    def test_claim_task(self):
        self.client.force_login(self.member)
        self.assertEqual(self.post(action='card_claim',card_id=self.card.pk,version=1).status_code,200)
        self.client.force_login(self.owner)
        self.assertEqual(self.post(action='card_claim',card_id=self.card.pk,version=2).status_code,400)
        self.card.refresh_from_db()
        self.assertEqual(self.card.assignee, self.member)

    def test_checklist_and_comment_round_trip(self):
        self.assertEqual(self.post(action='checklist_add',card_id=self.card.pk,text='Do work').status_code,200)
        item = ChecklistItem.objects.get(card=self.card)
        self.assertEqual(self.post(action='checklist_toggle',card_id=self.card.pk,item_id=item.pk,done=True).status_code,200)
        self.assertEqual(self.post(action='comment_add',card_id=self.card.pk,text='Ready').status_code,200)
        data = self.client.get(self.url).json()['cards'][0]
        self.assertTrue(data['checklist'][0]['done'])
        self.assertEqual(data['comments'][0]['text'],'Ready')
        self.assertEqual(data['comments'][0]['author']['id'],self.owner.pk)
        self.assertEqual(self.post(action='checklist_delete',card_id=self.card.pk,item_id=item.pk).status_code,200)

    def test_checklist_cannot_modify_another_card(self):
        item = ChecklistItem.objects.create(card=self.foreign_card,text='Private')
        self.assertEqual(self.post(action='checklist_toggle',card_id=self.card.pk,item_id=item.pk,done=True).status_code,404)

    def test_member_cannot_manage_project(self):
        self.client.force_login(self.member)
        for action in ['project_update','project_delete','member_add','member_remove','column_create','column_update','column_delete']:
            with self.subTest(action=action):
                self.assertEqual(self.post(action=action, title='Hack').status_code,403)

    def test_invite_and_remove_member(self):
        self.assertEqual(self.post(action='member_add',username=self.outsider.username).status_code,200)
        self.card.assignee=self.outsider
        self.card.save()
        self.assertEqual(self.post(action='member_remove',member_id=self.outsider.pk).status_code,200)
        self.card.refresh_from_db()
        self.assertIsNone(self.card.assignee)
        self.client.force_login(self.outsider)
        self.assertEqual(self.client.get(self.url).status_code,404)

    def test_owner_cannot_be_removed(self):
        self.assertEqual(self.post(action='member_remove',member_id=self.owner.pk).status_code,400)

    def test_nonempty_and_last_column_cannot_be_deleted(self):
        self.assertEqual(self.post(action='column_delete',column_id=self.todo.pk).status_code,400)
        self.assertEqual(self.post(action='column_delete',column_id=self.done.pk).status_code,200)
        self.card.delete()
        self.assertEqual(self.post(action='column_delete',column_id=self.todo.pk).status_code,400)

    def test_card_delete_cascades(self):
        Comment.objects.create(card=self.card,author=self.owner,text='Comment')
        self.assertEqual(self.post(action='card_delete',card_id=self.card.pk,version=1).status_code,200)
        self.assertFalse(Comment.objects.exists())

    def test_csrf_and_http_methods(self):
        strict = Client(enforce_csrf_checks=True)
        strict.force_login(self.owner)
        self.assertEqual(strict.post(self.url, '{}', content_type='application/json').status_code,403)
        strict.get('/management/')
        token = strict.cookies['csrftoken'].value
        self.assertEqual(strict.post(self.url,json.dumps({'action':'column_create','title':'New'}),content_type='application/json',HTTP_X_CSRFTOKEN=token).status_code,200)
        self.assertEqual(self.client.delete(self.url).status_code,405)

    def test_malformed_payloads_fail_without_changes(self):
        for raw in ['[1,2]', 'bad json', 'null']:
            self.assertEqual(self.client.post(self.url,raw,content_type='application/json').status_code,400)
        self.assertEqual(self.post(action='unknown').status_code,400)
        self.assertEqual(Card.objects.filter(column__project=self.project).count(),1)

    def test_script_content_is_safe_in_bootstrap(self):
        self.project.title = '</script><script>alert(1)</script>'
        self.project.save()
        response = self.client.get(reverse('management:project', args=[self.project.pk]))
        self.assertNotContains(response, '</script><script>alert(1)</script>')

    def test_import_legacy_json_preserves_original(self):
        old = Task.objects.create(user=self.outsider,title='Legacy',description='Column description',
            tasks=json.dumps([{'content':'Old card','details':'Keep me','assignee':self.owner.username,'startDate':'2026-01-01','endDate':'2026-01-10'}, 'Plain string']))
        migration = importlib.import_module('management.migrations.0004_import_legacy_tasks')
        migration.import_tasks(apps, None)
        imported = Project.objects.get(title='Личные задачи · outsider')
        cards = Card.objects.filter(column__project=imported)
        self.assertEqual(cards.count(),2)
        self.assertIn('Keep me', cards.first().description)
        self.assertEqual(cards.first().start_date,date(2026,1,1))
        self.assertFalse(imported.members.filter(pk=self.owner.pk).exists())
        self.assertTrue(Task.objects.filter(pk=old.pk).exists())
