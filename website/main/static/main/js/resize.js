// static/main/js/resize.js

const resizer = document.getElementById('resizer');
const sidebar = document.querySelector('aside');
const header = document.querySelector('.header');
const main = document.querySelector('main');

let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
});

function resize(e) {
    if (isResizing) {
        const width = e.clientX - sidebar.getBoundingClientRect().left;
        if (width > 287 && width < 425) { // Ограничиваем размер от 287 до 425 пикселей
            sidebar.style.width = width + 'px';
            resizer.style.left = width + 'px';
            header.style.width = `calc(100% - ${width}px)`;
            header.style.left = width + 'px';
            main.style.marginLeft = width + 'px';
        }
    }
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    adjustHeaderWidth();
}

// Initial header width adjustment
function adjustHeaderWidth() {
    const width = sidebar.getBoundingClientRect().width;
    header.style.width = `calc(100% - ${width}px)`;
    header.style.left = width + 'px';
    main.style.marginLeft = width + 'px';
    resizer.style.left = width + 'px'; // Добавляем установку позиции resizer
}

window.addEventListener('load', adjustHeaderWidth);
window.addEventListener('resize', adjustHeaderWidth);
