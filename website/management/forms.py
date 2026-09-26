import re
from django import forms
from django.db.models import Q
from .models import Card, Project
from users.models import User


class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['title', 'description', 'color']

    def clean_color(self):
        value = self.cleaned_data['color']
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', value):
            raise forms.ValidationError('Выберите корректный цвет.')
        return value


class CardForm(forms.ModelForm):
    class Meta:
        model = Card
        fields = ['title', 'description', 'column', 'assignee', 'priority', 'label', 'start_date', 'due_date']

    def __init__(self, *args, project, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['column'].queryset = project.columns.all()
        self.fields['assignee'].queryset = User.objects.filter(Q(projects=project) | Q(pk=project.owner_id)).distinct()

    def clean(self):
        values = super().clean()
        start, due = values.get('start_date'), values.get('due_date')
        if start and due and start > due:
            self.add_error('due_date', 'Дедлайн не может быть раньше даты начала.')
        return values
