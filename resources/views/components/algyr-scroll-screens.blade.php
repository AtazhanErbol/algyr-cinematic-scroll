@foreach($screens as $screen)
<div class="algyr-scroll-shot" data-algyr-shot="{{ $loop->index }}">
    <div class="algyr-scroll-shot-content">
        <img src="{{ $screen['src'] }}" alt="" width="1280" height="720" loading="lazy" decoding="async">
        <span class="algyr-scroll-shot-shade"></span>
    </div>
</div>
@endforeach
