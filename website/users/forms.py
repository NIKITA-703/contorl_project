from django import forms
from django.contrib.auth.forms import AuthenticationForm

from .models import User


class UserLoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={"autofocus": True,
                                      'class': 'form-control',
                                      'placeholder': 'Логин'})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password",
                                          'class': 'form-control',
                                          'placeholder': 'Пароль'}
                                   ),
    )
    class Meta:
        model = User
        fields = ['username', 'password']

        # widgets = {
        #     'username':
        # }






