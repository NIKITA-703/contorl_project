// static/main/js/resize.js

document.addEventListener('DOMContentLoaded', (event) => {
    const aside = document.querySelector('aside');
    const resizer = document.getElementById('resizer');
    const main = document.querySelector('main');
    const body = document.body;

    let startX;
    let startWidth;

    const onMouseMove = (e) => {
        const newWidth = startWidth + (e.clientX - startX);
        if (newWidth > 287 && newWidth < 425) { // Ограничиваем размер от 260 до 425 пикселей
            aside.style.width = newWidth + 'px';
            resizer.style.left = newWidth + 'px';
            main.style.marginLeft = (newWidth + 10) + 'px'; // 10px ширина резизера
        }
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        body.classList.remove('no-select');
    };

    const onMouseDown = (e) => {
        startX = e.clientX;
        startWidth = parseInt(document.defaultView.getComputedStyle(aside).width, 10);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        body.classList.add('no-select');
    };

    resizer.addEventListener('mousedown', onMouseDown);
});
