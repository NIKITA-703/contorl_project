from django.contrib.auth.decorators import login_required
from django.contrib import auth, messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, redirect
from django.urls import reverse

from .forms import UserLoginForm, UserRegistrationForm, ProfileForm


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
                # messages.success(request, f"{username}, с возвращением!")

                if request.POST.get('next', None):
                    return HttpResponseRedirect(reverse.POST.get('next'))

                return HttpResponseRedirect(reverse('user:profile'))
    else:
        form = UserLoginForm()

    context = {
        'title': 'Home - Авторизация',
        'form': form,
    }
    return render(request, 'users/login.html', context)


def registration(request):
    if request.method == 'POST':
        form = UserRegistrationForm(data=request.POST)
        if form.is_valid():
            form.save()
            user = form.instance
            auth.login(request, user)
            # messages.success(request, f"{user.username}, добро пожаловать!")
            return HttpResponseRedirect(reverse('main:home'))
    else:
        form = UserRegistrationForm()

    context = {
        'title': 'Registration - Регистрация',
        'form': form,
    }
    return render(request, 'users/registration.html', context)


@login_required
def profile(request):
    if request.method == 'POST':
        form = ProfileForm(data=request.POST, instance=request.user, files=request.FILES)
        if form.is_valid():
            form.save()
            # messages.success(request, f"Так-то лучше. Профиль обновлён!")
            return HttpResponseRedirect(reverse('user:profile'))
    else:
        form = ProfileForm(instance=request.user)

    context = {
        'title': 'Profile - Профиль',
        'form': form,
    }
    return render(request, 'users/profile.html', context)


@login_required
def logout(request):  # <li><a class="dropdown-item  text-white" href="{% url "user:logout" %}">Выйти</a></li>
    # messages.success(request, f"{request.user.username}, Вы вышли из под аккаунта!")
    auth.logout(request)
    return redirect(reverse('main:home'))


