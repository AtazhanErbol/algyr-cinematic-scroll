# Источники и сторонние компоненты

- Laravel Framework, Vite, Laravel Vite Plugin, PHPUnit, Mockery: версии в lock-файлах, лицензии в соответствующих пакетах.
- GSAP3.15.0 и ScrollTrigger включены в локальный бандл. Условия: https://gsap.com/standard-license/. Лицензионный заголовок сохранён сборкой.
- Lenis1.3.26, MIT; копия лицензии docs/licenses/LENIS.txt.
- Gotham Regular/Medium/Bold и Inter Bold: публичные webfont-файлы ALGYR, полученные09.10.2026: https://algyr.kz/fonts/gotham_regular.woff2, gotham_medium.woff2, gotham_bold.woff2, Inter-Bold.woff2. Используются для компонента ALGYR. Локальные имена Algyr Gotham / Algyr Inter не переопределяют шрифты хост-сайта.
- Брендовый фон: https://algyr.kz/img/platform-bg.png. Логотип демо: https://algyr.kz/storage/page-images/logos/01M20BW5QVSYB2KX9FSRWJGGH6.svg. Материалы предназначены для интеграции в ALGYR.
- algyr_laptop_screen.mp4 и скриншоты предоставлены пользователем. Сохранённый монтаж camera-prepared.mp4 совмещает реальный экран курсов с движением камеры. Новая обработка локальная: шумоподавление, Lanczos, резкость. Облачные модели для улучшения текущего видео не использовались. Подробности — ASSETS.md.
- Email профиля уже скрыт в сохранённом исходнике. Интерфейс скриншотов не генерируется.
- FFmpeg и Pillow нужны только на машине экспорта; бинарные инструменты не входят в архив и не требуются серверу сайта.

