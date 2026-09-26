from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from .models import User


class UserLoginForm(AuthenticationForm):
    username = forms.CharField(label='Логин', widget=forms.TextInput(attrs={'autofocus': True, 'autocomplete': 'username'}))
    password = forms.CharField(label='Пароль', widget=forms.PasswordInput(attrs={'autocomplete': 'current-password'}))


class UserRegistrationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password1', 'password2']


class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['image', 'first_name', 'last_name', 'username', 'email']

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image and image.size > 5 * 1024 * 1024:
            raise forms.ValidationError('Выберите изображение размером до 5 МБ.')
        return image
