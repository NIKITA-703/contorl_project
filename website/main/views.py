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


@login_required
def profile_view(request):
    return render(request, 'main/profile.html')

# def login(request):
#     error = ''
#     if request.method == "POST":
#         form =


def test(request):
    return render(request, 'main/test.html')

# сделать аутификацию пользователей