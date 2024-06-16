from django import forms
from .models import Task
import json


class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ['title', 'description', 'tasks']
        widgets = {
            'tasks': forms.HiddenInput()
        }


class TaskAdminForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(TaskAdminForm, self).__init__(*args, **kwargs)
        if self.instance and self.instance.tasks:
            tasks_list = json.loads(self.instance.tasks)
            self.fields['tasks'].initial = "\n".join(tasks_list)

    def clean_tasks(self):
        tasks = self.cleaned_data.get('tasks', '')
        tasks_list = tasks.split('\n')  # Разделяем задачи по строкам
        return json.dumps(tasks_list, ensure_ascii=False)