# Create your views here.
from django.shortcuts import render


def index(request):
    data = {
        'title': 'Главная страница ╰(*°▽°*)╯',
        'values': ['Some', 'Tyt', 'Kak']
    }
    return render(request, 'main/index.html', data)


def about(request):
    return render(request, 'main/about.html')


def test(request):
    return render(request, 'main/test.html')

