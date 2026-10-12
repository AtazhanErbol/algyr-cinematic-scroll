# ALGYR — автономный HTML-блок и Laravel-компонент

Готовый блок «Барлығы бір платформада» работает на HTML, CSS и JavaScript. Для установки загрузите `standalone/algyr-block/` в публичный корень сайта и вставьте:

```html
<div data-algyr-embed data-lang="kk"></div>
<script defer src="/algyr-block/embed.js?v=9"></script>
```

[Инструкция для обычного сайта / PHP / CMS](docs/HTML-INTEGRATION.md). Полная разметка без загрузчика: `standalone/snippet.kk.html` (также RU/EN). В репозитории сохранён и Laravel 12 + Blade + Vite вариант: `<x-algyr-scroll id="platform" />`.

На компьютерах и мобильных устройствах исходная камера движется от девушки к ноутбуку, затем реальный список курсов плавно переходит в шесть снимков кабинета. Одна шкала GSAP + ScrollTrigger привязана к 400vh на компьютере и 350svh на телефоне; скролл работает в обе стороны. Нативного видеоплеера и CTA нет.

Для сайта используется последовательность из 120 WebP, 1280 × 720, 12 кадров/с: 4,74 МБ. Загружается постепенно, в памяти не более 10 декодированных кадров. Для телефонов и сенсорных устройств — та же анимация, 120 кадров 720×405, 2,00 МБ и максимум 6 декодированных кадров. Прокрутка пальцем нативная. Reduced motion — только последний снимок.

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

[HTML-вставка](docs/HTML-INTEGRATION.md) · [Laravel](docs/INTEGRATION.md) · [Проверки](docs/VALIDATION.md) · [Ассеты](docs/ASSETS.md) · [Сценарий](docs/STORYBOARD.md).

## Быстрый просмотр после клонирования

Установите Node.js и выполните в папке проекта:

```sh
node scripts/preview-server.mjs 8080
```

Откройте http://127.0.0.1:8080/standalone/ для HTML-версии или http://127.0.0.1:8080/ для экспорта Laravel-демо. Готовые сборки и все кадры уже включены в репозиторий; установка зависимостей для такого просмотра не нужна.

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


## Пересборка автономной поставки

После изменения JS/CSS или переводов:

```sh
npm run build
php scripts/export-standalone.php
node scripts/export-preview.mjs http://127.0.0.1:8000/
node scripts/build-standalone.mjs
python scripts/package.py
```

Кадры для мобильных пересоздаются отдельно: `python scripts/make-mobile-frames.py --ffmpeg /path/to/ffmpeg`. Исходный улучшенный ролик и монтаж сохраняются. Отчёт тестирования: [VALIDATION.md](docs/VALIDATION.md).
