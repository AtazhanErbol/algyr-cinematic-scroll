<?php
// Build-time only. The resulting HTML needs no PHP runtime or framework.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$directory = __DIR__.'/../standalone/algyr-block/templates';
if (!is_dir($directory)) mkdir($directory, 0755, true);
foreach (['kk', 'ru', 'en'] as $locale) {
    $app->setLocale($locale);
    $html = Illuminate\Support\Facades\Blade::render('<x-algyr-scroll id="algyr-template" media-base="media" :assets="false" />');
    file_put_contents($directory.'/'.$locale.'.html', $html);
}
echo "Exported standalone KK/RU/EN templates.\n";
