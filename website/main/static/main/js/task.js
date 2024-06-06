// task.js

function createNewColumn() {
    const template = document.querySelector('#column-template');
    const columnsContainer = document.querySelector('.columns-container');
    const clone = document.importNode(template.content, true);
    columnsContainer.appendChild(clone);
}

function addTask(button) {
    const taskContainer = document.createElement('div');
    taskContainer.className = 'task';
    taskContainer.contentEditable = 'true';
    taskContainer.innerText = 'Новая задача';
    const tasksContainer = button.nextElementSibling;
    tasksContainer.appendChild(taskContainer);
}

function toggleMenu(element) {
    const menu = element.nextElementSibling;
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
}

function renameColumn(element) {
    element.parentElement.style.display = 'none';
    const column = element.closest('.column');
    const header = column.querySelector('.task-header h2');
    header.contentEditable = 'true';
    header.focus();
    // Снять редактирование при потере фокуса
    header.onblur = function() {
        header.contentEditable = 'false';
        element.parentElement.style.display = 'none';
    };
}

// функция для переименования по двойному клику
function renameColumnInline(element) {
    element.contentEditable = 'true';
    element.focus();
    element.onblur = function() {
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
