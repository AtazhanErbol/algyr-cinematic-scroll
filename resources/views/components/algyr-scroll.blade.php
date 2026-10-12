@props(['id' => null, 'mediaBase' => null, 'scrollScreens' => null, 'height' => null, 'pinTop' => null, 'assets' => null])
@php
    $componentId = $id ?: 'algyr-scroll-'.Illuminate\Support\Str::uuid();
    $base = rtrim($mediaBase ?: asset(config('algyr-scroll.media_base', 'media/algyr')), '/');
    $revision = rawurlencode((string) config('algyr-scroll.asset_version', '1'));
    // Paths and content order belong to PHP, never to the animation script.
    $screens = [];
    foreach (['courses', 'dashboard', 'lesson', 'results', 'test', 'profile'] as $index => $key) {
        $screens[] = ['key' => $key, 'src' => $base.'/platform/shot-'.($index + 1).'.webp?v='.$revision,
            'title' => __('algyr-platform.'.$key), 'description' => __('algyr-platform.'.$key.'_description')];
    }
    $settings = [
        'scrollScreens' => $scrollScreens ?? config('algyr-scroll.scroll_screens', 4),
        'scrub' => config('algyr-scroll.scrub', 0.75),
        'maskEdge' => config('algyr-scroll.mask_edge', 0.20),
        'phases' => config('algyr-scroll.phases'),
        'sequence' => array_merge(config('algyr-scroll.sequence'), ['template' => $base.'/'.config('algyr-scroll.sequence.template').'?v='.$revision]),
        'lenis' => config('algyr-scroll.lenis', true),
        'lenisLerp' => config('algyr-scroll.lenis_lerp', 0.12),
        'pinTop' => $pinTop ?? config('algyr-scroll.pin_top', 'auto'),
        'headerSelector' => config('algyr-scroll.header_selector', '.header, [data-algyr-site-header]'),
        'mobileBreakpoint' => config('algyr-scroll.mobile_breakpoint', 767),
        'screens' => $screens,
    ];
    $style = '--algyr-scroll-height:'.($height ?? config('algyr-scroll.height')).';--algyr-scroll-brand-bg:url("'.$base.'/brand/platform-bg.png")';
@endphp
@if($assets ?? config('algyr-scroll.include_assets', true))
    @once
        <link rel="stylesheet" href="{{ asset('vendor/algyr-scroll/algyr-scroll.css').'?v='.$revision }}">
        <script defer src="{{ asset('vendor/algyr-scroll/algyr-scroll.js').'?v='.$revision }}"></script>
    @endonce
@endif
<section id="{{ $componentId }}" {{ $attributes->class(['platform', 'algyr-scroll'])->merge(['style' => $style]) }} aria-labelledby="{{ $componentId }}-title" data-algyr-scroll data-algyr-config="{{ json_encode($settings, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) }}">
    <div class="algyr-scroll-stage" data-algyr-stage>
        <header class="algyr-scroll-heading">
            <h2 id="{{ $componentId }}-title">{{ __('algyr-platform.heading') }} <span>{{ __('algyr-platform.heading_accent') }}</span></h2>
            <p>{{ __('algyr-platform.intro') }}</p>
        </header>
        <div class="algyr-scroll-presentation">
            <div class="algyr-scroll-visual" data-algyr-visual aria-hidden="true">
                <div class="algyr-scroll-media" data-algyr-media>
                    <img class="algyr-scroll-poster" src="{{ $base }}/platform/poster.webp?v={{ $revision }}" alt="" width="1280" height="720" loading="lazy" decoding="async">
                    <canvas class="algyr-scroll-canvas" data-algyr-canvas width="1280" height="720" aria-hidden="true"></canvas>
                    <div class="algyr-scroll-flat" data-algyr-flat>
                        @include('components.algyr-scroll-screens')
                    </div>
                </div>
            </div>
            <div class="algyr-scroll-mobile-poster"><img src="{{ $base }}/platform/poster-mobile.webp?v={{ $revision }}" alt="{{ __('algyr-platform.student') }}" width="720" height="405" loading="lazy" decoding="async"></div>
            <div class="algyr-scroll-gallery" data-algyr-gallery tabindex="0" aria-label="{{ __('algyr-platform.gallery') }}">
                @foreach($screens as $screen)
                <figure data-algyr-slide="{{ $loop->index }}">
                    <a href="{{ $screen['src'] }}" target="_blank" rel="noopener" aria-label="{{ $screen['title'] }} — {{ __('algyr-platform.open_image') }}"><img src="{{ $screen['src'] }}" alt="{{ $screen['title'] }}" width="1280" height="720" loading="lazy" decoding="async"></a>
                    <figcaption><h3>{{ $screen['title'] }}</h3><p>{{ $screen['description'] }}</p></figcaption>
                </figure>
                @endforeach
            </div>
            <aside class="algyr-scroll-details" data-algyr-details>
                <div class="algyr-scroll-captions" data-algyr-captions>
                    @foreach($screens as $screen)
                    <div class="algyr-scroll-caption" data-algyr-caption="{{ $loop->index }}"><h3>{{ $screen['title'] }}</h3><p>{{ $screen['description'] }}</p></div>
                    @endforeach
                </div>
                <nav class="algyr-scroll-dots" data-algyr-dots aria-label="{{ __('algyr-platform.steps') }}">
                    @foreach($screens as $screen)
                    <button type="button" data-algyr-step="{{ $loop->index }}" aria-label="{{ $screen['title'] }}"><span></span></button>
                    @endforeach
                </nav>
                <div class="algyr-scroll-progress" aria-hidden="true"><span data-algyr-progress></span></div>
            </aside>
        </div>
        <div class="algyr-scroll-actions">
            <span class="algyr-scroll-hint">{{ __('algyr-platform.scroll') }} <span aria-hidden="true">↓</span></span>
            <button type="button" data-algyr-static data-static-label="{{ __('algyr-platform.static') }}" data-motion-label="{{ __('algyr-platform.motion') }}" aria-pressed="false" hidden>{{ __('algyr-platform.static') }}</button>
            <a href="#{{ $componentId }}-after" data-algyr-skip>{{ __('algyr-platform.skip') }} <span aria-hidden="true">↓</span></a>
        </div>
    </div>
    <div id="{{ $componentId }}-after" class="algyr-scroll-after" tabindex="-1"></div>
</section>

