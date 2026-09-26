from django.test import TestCase
from django.urls import reverse
from .models import User


class AccountTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('tester',password='Safe-original-123')

    def test_login_redirects_to_workspace(self):
        response=self.client.post(reverse('user:login'),{'username':'tester','password':'Safe-original-123'})
        self.assertRedirects(response,reverse('management:main_management'))

    def test_external_next_is_rejected(self):
        response=self.client.post(reverse('user:login'),{'username':'tester','password':'Safe-original-123','next':'https://evil.example/'})
        self.assertEqual(response.url,reverse('management:main_management'))

    def test_internal_next_works(self):
        response=self.client.post(reverse('user:login'),{'username':'tester','password':'Safe-original-123','next':'/user/profile/'})
        self.assertEqual(response.url,'/user/profile/')

    def test_bad_password_shows_error(self):
        response=self.client.post(reverse('user:login'),{'username':'tester','password':'bad'})
        self.assertEqual(response.status_code,200)
        self.assertTrue(response.context['form'].non_field_errors())

    def test_registration_and_profile(self):
        response=self.client.post(reverse('user:registration'),{'username':'newuser','password1':'New-secure-90812','password2':'New-secure-90812'})
        self.assertEqual(response.status_code,302)
        self.assertTrue(User.objects.get(username='newuser').check_password('New-secure-90812'))
        response=self.client.post(reverse('user:profile'),{'username':'newuser','first_name':'New','last_name':'Name','email':'new@example.test'})
        self.assertEqual(response.status_code,302)
        self.assertEqual(User.objects.get(username='newuser').first_name,'New')

    def test_logout_requires_post(self):
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(reverse('user:logout')).status_code,405)
        self.assertEqual(self.client.post(reverse('user:logout')).status_code,302)

    def test_password_change_keeps_session(self):
        self.client.force_login(self.user)
        response=self.client.post(reverse('user:password'),{'old_password':'Safe-original-123','new_password1':'Next-secure-8821','new_password2':'Next-secure-8821'})
        self.assertEqual(response.status_code,302)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Next-secure-8821'))
        self.assertEqual(self.client.get(reverse('user:profile')).status_code,200)
