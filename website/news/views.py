from django.shortcuts import render, redirect
from .models import Articles
from .forms import ArticlesForm
from django.views.generic import DetailView, UpdateView, DeleteView
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
# Create your views here.


def news_home(request):
    news = Articles.objects.order_by('-date')
    return render(request, 'news/news_home.html', {'news': news})


class NewsDetailView(DetailView):
    model = Articles
    template_name = 'news/detail_view.html'
    context_object_name = 'article'


class NewsUpdateView(LoginRequiredMixin, PermissionRequiredMixin, UpdateView):
    permission_required = 'news.change_articles'
    model = Articles
    template_name = 'news/create.html'

    form_class = ArticlesForm


class NewsDeleteView(LoginRequiredMixin, PermissionRequiredMixin, DeleteView):
    permission_required = 'news.delete_articles'
    model = Articles
    success_url = '/news/'
    template_name = 'news/news-delete.html'


@login_required
@permission_required('news.add_articles', raise_exception=True)
def create(request):
    error = ''
    if request.method == 'POST':
        form = ArticlesForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('news:news_home')
        else:
            error = 'Некорректный ввод'

    else:
        form = ArticlesForm()

    data = {
        'form': form,
        'error': error
    }

    return render(request, 'news/create.html', data)
