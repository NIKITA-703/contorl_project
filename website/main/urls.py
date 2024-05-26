from django.urls import path
from . import views
from .views import profile_view

urlpatterns = [
    path('', views.index, name="home"),
    path('about', views.about, name="about"),
    path('profile', profile_view, name="profile"),
    # path('login', views.login, name="login"),
    path('test', views.test, name="test"),
]
