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
    const column = element.closest('.column');
    const header = column.querySelector('.task-header h2');
    const newName = prompt("Введите новое название колонки:", header.textContent);
    if (newName) {
        header.textContent = newName;
    }
    element.parentElement.style.display = 'none';
}

function createNewColumn() {
    const template = document.getElementById('column-template').content.cloneNode(true);
    document.querySelector('.columns-container').appendChild(template);
}

// function addNewTask(button) {
//     const tasksContainer = button.nextElementSibling;
//     const newTask = document.createElement('div');
//     newTask.className = 'task';
//     newTask.innerHTML = 'New Task';
//     tasksContainer.appendChild(newTask);
// }
