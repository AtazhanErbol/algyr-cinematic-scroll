<?php
namespace Tests\Feature;
use Illuminate\Support\Facades\Blade;
use Tests\TestCase;

class CinematicDemoTest extends TestCase
{
    private function settings(string $html): array
    {
        preg_match_all('/data-algyr-config="([^"]+)"/', $html, $matches);
        return array_map(fn($json) => json_decode(html_entity_decode($json, ENT_QUOTES, 'UTF-8'), true, 512, JSON_THROW_ON_ERROR), $matches[1]);
    }
    public function test_demo_renders_without_database_or_authentication(): void
    {
        $this->get('/')->assertOk()->assertSee('data-algyr-scroll', false)
            ->assertSee('Барлығы бір')->assertSee('платформада')
            ->assertDontSee('<video', false)->assertDontSee('data-algyr-cta', false)
            ->assertSee('/vendor/algyr-scroll/algyr-scroll.js', false);
        $this->get('/demo')->assertOk();
        $this->get('/up')->assertOk()->assertDontSee('algyr-scroll.js');
    }
    public function test_two_instances_have_unique_identifiers_and_shared_assets_once(): void
    {
        $html=Blade::render('<x-algyr-scroll :scroll-screens="2.5" /><x-algyr-scroll :scroll-screens="3.5" />');
        preg_match_all('/\bid="([^"]+)"/', $html, $ids);
        $this->assertSame(count($ids[1]),count(array_unique($ids[1])));
        $settings=$this->settings($html);
        $this->assertCount(2,$settings);
        $this->assertSame(2.5,$settings[0]['scrollScreens']);
        $this->assertSame(3.5,$settings[1]['scrollScreens']);
        $this->assertSame(1,substr_count($html,'/vendor/algyr-scroll/algyr-scroll.js'));
        $this->assertSame(1,substr_count($html,'/vendor/algyr-scroll/algyr-scroll.css'));
        $this->assertStringNotContainsString('/vendor/algyr-scroll/',Blade::render('<x-algyr-scroll :assets="false" />'));
    }
    public function test_screens_are_real_assets_with_identical_uncropped_canvas_dimensions(): void
    {
        $settings=$this->settings(Blade::render('<x-algyr-scroll />'))[0];
        $this->assertSame(['courses','dashboard','lesson','results','test','profile'],array_column($settings['screens'],'key'));
        foreach(['poster','shot-1','shot-2','shot-3','shot-4','shot-5','shot-6'] as $name){
            $path=public_path('media/algyr/platform/'.$name.'.webp');
            $this->assertFileExists($path);
            $size=getimagesize($path);
            $this->assertSame([1280,720],array_slice($size,0,2));
        }
        $this->assertSame(0.75,$settings['scrub']);
        $this->assertSame(0.2,$settings['maskEdge']);
    }
    public function test_video_sequence_fits_budget_and_matches_first_screenshot_at_handoff(): void
    {
        $settings=$this->settings(Blade::render('<x-algyr-scroll />'))[0];
        $frames=glob(public_path('media/algyr/platform/frames/f_*.webp'));
        $this->assertCount(120,$frames);
        $this->assertLessThanOrEqual(6000000,array_sum(array_map('filesize',$frames)));
        foreach($frames as $frame){
            $this->assertSame([1280,720],array_slice(getimagesize($frame),0,2));
        }
        $this->assertSame(hash_file('sha256',public_path('media/algyr/platform/shot-1.webp')),hash_file('sha256',end($frames)));
        $this->assertSame([720,405],array_slice(getimagesize(public_path('media/algyr/platform/poster-mobile.webp')),0,2));
        $this->assertSame(120,$settings['sequence']['count']);
        $this->assertSame(12,$settings['sequence']['fps']);
        $this->assertSame(4,$settings['scrollScreens']);
        $this->assertSame(['videoStart'=>0.05,'videoEnd'=>0.65,'screensStart'=>0.72,'screensEnd'=>0.95],$settings['phases']);
    }
    public function test_locales_translate_captions_and_template_strings(): void
    {
        foreach(['kk'=>'Менің курстарым','ru'=>'Мои курсы','en'=>'My courses'] as $locale=>$title){
            app()->setLocale($locale);
            $html=Blade::render('<x-algyr-scroll />');
            $this->assertStringContainsString($title,$html);
            $this->assertStringNotContainsString('algyr-platform.',$html);
            $this->assertSame($title,$this->settings($html)[0]['screens'][0]['title']);
        }
    }
    public function test_mobile_frames_are_light_and_match_the_mobile_handoff(): void
    {
        $frames=glob(public_path('media/algyr/platform/frames-mobile/f_*.webp'));
        $this->assertCount(120,$frames);
        $this->assertLessThan(3000000,array_sum(array_map('filesize',$frames)));
        foreach($frames as $frame) $this->assertSame([720,405],array_slice(getimagesize($frame),0,2));
        foreach(range(1,6) as $i) $this->assertSame([720,405],array_slice(getimagesize(public_path('media/algyr/platform/shots-mobile/shot-'.$i.'.webp')),0,2));
        $this->assertSame(hash_file('sha256',public_path('media/algyr/platform/shots-mobile/shot-1.webp')),hash_file('sha256',end($frames)));
        $settings=$this->settings(Blade::render('<x-algyr-scroll />'))[0];
        $this->assertSame(6,$settings['mobileSequence']['maxDecoded']);
        $this->assertSame(3.5,$settings['mobileScrollScreens']);
    }
    public function test_config_attribute_and_text_cannot_inject_html(): void
    {
        $html=Blade::render('<x-algyr-scroll :media-base="$base" />',['base'=>'\" onmouseover=\"alert(1)</script><script>alert(2)</script>']);
        $this->assertStringNotContainsString('<script>alert(2)</script>',$html);
        $this->assertStringContainsString('\\u003C',$html);
        $this->assertCount(1,$this->settings($html));
    }
}
