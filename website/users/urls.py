from django.contrib.auth.views import LoginView, PasswordChangeView
from django.urls import path, reverse_lazy
from . import views
from .forms import UserLoginForm

app_name = 'users'
urlpatterns = [
    path('login/', LoginView.as_view(template_name='users/login.html', authentication_form=UserLoginForm, redirect_authenticated_user=True), name='login'),
    path('registration/', views.registration, name='registration'),
    path('profile/', views.profile, name='profile'),
    path('logout/', views.logout, name='logout'),
    path('password/', PasswordChangeView.as_view(template_name='users/password.html', success_url=reverse_lazy('user:profile')), name='password'),
]
