from django.contrib import auth, messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.views.decorators.http import require_POST
from .forms import UserRegistrationForm, ProfileForm


def registration(request):
    if request.user.is_authenticated:
        return redirect('management:main_management')
    form = UserRegistrationForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        auth.login(request, user)
        return redirect('management:main_management')
    return render(request, 'users/registration.html', {'form': form})


@login_required
def profile(request):
    form = ProfileForm(request.POST or None, request.FILES or None, instance=request.user)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Профиль обновлён.')
        return redirect('user:profile')
    return render(request, 'users/profile.html', {'form': form})


@require_POST
def logout(request):
    auth.logout(request)
    return redirect('user:login')
