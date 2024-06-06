// task.js

document.addEventListener('DOMContentLoaded', function() {
    // Добавляем обработчики двойного клика на существующие заголовки колонок
    document.querySelectorAll('.task-header h2').forEach(header => {
        header.addEventListener('dblclick', function() {
            renameColumnInline(header);
        });
    });
});

function createNewColumn() {
    // Получаем шаблон для колонки
    const template = document.querySelector('#column-template');
    // Получаем контейнер, в который будут добавляться колонки
    const columnsContainer = document.querySelector('.columns-container');
    // Клонируем содержимое шаблона
    const clone = document.importNode(template.content, true);
    // Добавляем клонированный шаблон в контейнер
    columnsContainer.appendChild(clone);

    // Добавляем обработчик двойного клика на новый заголовок колонки
    const newHeader = columnsContainer.lastElementChild.querySelector('.task-header h2');
    newHeader.addEventListener('dblclick', function() {
        renameColumnInline(newHeader);
    });
}

function addTask(button) {
    // Создаем новый элемент для задачи
    const taskContainer = document.createElement('div');
    // Задаем класс для стилизации задачи
    taskContainer.className = 'task';
    // Устанавливаем возможность редактирования содержимого задачи
    taskContainer.contentEditable = 'true';
    // Устанавливаем текст по умолчанию для новой задачи
    taskContainer.innerText = 'Новая задача';
    // Получаем контейнер задач, в который добавим новую задачу
    const tasksContainer = button.nextElementSibling;
    // Добавляем новую задачу в контейнер задач
    tasksContainer.appendChild(taskContainer);
}

function toggleMenu(element) {
    // Получаем следующее соседнее меню элемента
    const menu = element.nextElementSibling;
    // Проверяем текущее состояние отображения меню и переключаем его
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
}

function renameColumn(element) {
    // Скрываем меню
    element.parentElement.style.display = 'none';
    // Получаем колонку, содержащую элемент
    const column = element.closest('.column');
    // Получаем заголовок колонки
    const header = column.querySelector('.task-header h2');
    // Сохраняем текущее значение заголовка
    const previousValue = header.textContent;
    // Устанавливаем возможность редактирования заголовка
    header.contentEditable = 'true';
    // Перемещаем фокус на заголовок для редактирования
    header.focus();
    // Снимаем возможность редактирования при потере фокуса
    header.onblur = function() {
        if (header.textContent.trim() === '') {
            header.textContent = previousValue;
        }
        header.contentEditable = 'false';
    };
}

// Функция для переименования колонки по двойному клику
function renameColumnInline(element) {
    // Сохраняем текущее значение заголовка
    const previousValue = element.textContent;
    // Устанавливаем возможность редактирования заголовка
    element.contentEditable = 'true';
    // Перемещаем фокус на заголовок для редактирования
    element.focus();
    // Снимаем возможность редактирования при потере фокуса
    element.onblur = function() {
        if (element.textContent.trim() === '') {
            element.textContent = previousValue;
        }
        element.contentEditable = 'false';
    };
}





// function addNewTask(button) {
//     const tasksContainer = button.nextElementSibling;
//     const newTask = document.createElement('div');
//     newTask.className = 'task';
//     newTask.innerHTML = 'New Task';
//     tasksContainer.appendChild(newTask);
// }
