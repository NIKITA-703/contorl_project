from django.contrib import auth
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from .forms import UserLoginForm


# Create your views here.


def login(request):
    if request.method == "POST":
        form = UserLoginForm(data=request.POST)
        if form.is_valid():
            username = request.POST['username']
            password = request.POST['password']
            user = auth.authenticate(username=username, password=password)
            if user:
                auth.login(request, user)
                return HttpResponseRedirect(reverse('user:profile'))
    else:
        form = UserLoginForm()

    context = {
        'title': 'Home - Авторизация',
        'form': form,
    }
    return render(request, 'users/login.html', context)


def registration(request):
    context = {
        'title': 'Registration - Регистрация'
    }
    return render(request, 'users/registration.html', context)


def profile(request):
    context = {
        'title': 'Profile - Профиль'
    }
    return render(request, 'users/profile.html', context)


def logout(request):
    ...


