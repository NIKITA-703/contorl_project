from django.shortcuts import redirect, render


def index(request):
    return redirect('management:main_management' if request.user.is_authenticated else 'user:login')


def about(request):
    return render(request, 'main/about.html')
