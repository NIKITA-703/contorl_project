from django.test import TestCase
from django.utils import timezone
from users.models import User
from .models import Articles


class NewsTests(TestCase):
    def setUp(self):
        self.user=User.objects.create_user('reader',password='Safe-reader-123')
        self.admin=User.objects.create_superuser('editor',password='Safe-editor-123')
        self.article=Articles.objects.create(title='News',anons='Intro',full_text='Text',date=timezone.now())

    def test_public_pages_and_namespaced_links(self):
        self.assertEqual(self.client.get('/news/').status_code,200)
        self.assertEqual(self.client.get(f'/news/{self.article.pk}').status_code,200)

    def test_normal_user_cannot_write(self):
        self.client.force_login(self.user)
        for path in ['/news/create',f'/news/{self.article.pk}/update',f'/news/{self.article.pk}/delete']:
            self.assertEqual(self.client.post(path).status_code,403)

    def test_create_redirect_and_invalid_form_preservation(self):
        self.client.force_login(self.admin)
        response=self.client.post('/news/create',{'title':'New','anons':'Intro','full_text':'Body','date':'2026-09-26 12:00'})
        self.assertRedirects(response,'/news/')
        response=self.client.post('/news/create',{'title':'Keep me'})
        self.assertContains(response,'Keep me')
        self.assertTrue(response.context['form'].errors)
