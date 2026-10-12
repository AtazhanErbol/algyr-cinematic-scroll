# ALGYR — PHP / Laravel scroll block

Переносимый блок «Барлығы бір платформада» для Laravel 12 + Blade + Vite. Готовая вставка вместо старого раздела: `<x-algyr-scroll id="platform" />`.

Десктоп: исходная камера движется от девушки к ноутбуку, затем реальный список курсов плавно переходит в шесть снимков кабинета. Одна шкала GSAP + ScrollTrigger привязана к 400vh; скролл работает в обе стороны. Нативного видеоплеера и CTA нет.

Для сайта используется последовательность из 120 WebP, 1280 × 720, 12 кадров/с: 4,74 МБ. Загружается постепенно, в памяти не более 10 декодированных кадров. На телефоне <768px — обложка 25 КБ и свайп, кадры видео не загружаются. Reduced motion — только последний снимок.

Сохранена отдельная улучшенная Full HD-копия: `media-source/camera-enhanced-1080.mp4`, 1920 × 1080, 24fps, 10 секунд, без звука. Применены локальная очистка, масштабирование Lanczos и мягкая резкость. Это не AI-восстановление утраченных деталей. Экран ноутбука содержит реальный снимок курсов из сохранённого подготовленного видео.

Основные файлы:
- Blade: `resources/views/components/algyr-scroll.blade.php` и `algyr-scroll-screens.blade.php`.
- CSS: `resources/css/algyr-scroll.css`, локальные Gotham / Inter сайта.
- JS: `resources/js/algyr-scroll.js` и загрузчик `frame-sequence.js`.
- Настройки: `config/algyr-scroll.php`.
- Переводы RU/KZ/EN: `lang/*/algyr-platform.php`.
- Готовая сборка: `public/vendor/algyr-scroll/`.
- Кадры и изображения: `public/media/algyr/platform/`.
- Повторный экспорт: `scripts/make-frames.py`.

[Подключение](docs/INTEGRATION.md) · [Проверки](docs/VALIDATION.md) · [Ассеты](docs/ASSETS.md) · [Сценарий](docs/STORYBOARD.md).

## Быстрый просмотр после клонирования

Установите Node.js и выполните в папке проекта:

```sh
node scripts/preview-server.mjs 8080
```

Откройте http://127.0.0.1:8080/. Готовые сборки и все кадры уже включены в репозиторий; установка зависимостей для такого просмотра не нужна.

## Разработка на Laravel

Нужны PHP 8.2+, Composer и Node.js. Скопируйте `.env.example` в `.env`, затем выполните:

```sh
composer install
php artisan key:generate
npm ci
npm run build
php artisan serve
```

PHP-проверки: `php vendor/bin/phpunit`. Для переноса только блока следуйте [инструкции интеграции](docs/INTEGRATION.md).

