<?php
return [
    'media_base' => 'media/algyr',
    'asset_version' => '20261012-9',
    'include_assets' => true,
    // Pin travel, excluding the visible stage: 400vh.
    'scroll_screens' => 4,
    'scrub' => 0.75,
    'mask_edge' => 0.20,
    'phases' => ['videoStart' => 0.05, 'videoEnd' => 0.65, 'screensStart' => 0.72, 'screensEnd' => 0.95],
    'sequence' => ['template' => 'platform/frames/f_{index}.webp', 'count' => 120, 'fps' => 12, 'digits' => 3, 'width' => 1280, 'height' => 720],
    'mobile_sequence' => ['template' => 'platform/frames-mobile/f_{index}.webp', 'count' => 120, 'fps' => 12, 'digits' => 3, 'width' => 720, 'height' => 405, 'maxDecoded' => 6],
    'mobile_scroll_screens' => 3.5,
    'lenis' => true,
    'lenis_lerp' => 0.12,
    'pin_top' => 'auto',
    'header_selector' => '.header, [data-algyr-site-header]',
    'height' => 'calc(100svh - var(--algyr-scroll-pin-top, 0px))',
    'mobile_breakpoint' => 767,
];

