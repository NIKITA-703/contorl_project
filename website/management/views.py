from django.contrib.auth.decorators import login_required
from django.contrib import auth, messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, redirect
from django.urls import reverse


# Create your views here.


def main_management(request):
    context = {
        'title': 'Management',
    }

    return render(request, 'management/main_management.html', context)
