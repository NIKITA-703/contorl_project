# Create your views here.
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.views.generic import DetailView


def index(request):
    data = {
        'title': 'Главная страница ╰(*°▽°*)╯',
        'values': ['Some', 'Tyt', 'Kak']
    }
    return render(request, 'main/index.html', data)


def about(request):
    return render(request, 'main/about.html')


def test(request):
    return render(request, 'users/test.html')

