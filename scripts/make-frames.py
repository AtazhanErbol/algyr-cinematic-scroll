"""Build and audit the scroll sequence from the saved, screen-composited input.

python scripts/make-frames.py --ffmpeg /path/to/ffmpeg --enhance
python scripts/make-frames.py --verify-only
Requires Python + Pillow and FFmpeg with libx264/libwebp.
"""
from pathlib import Path
import argparse, hashlib, json, os, re, shutil, subprocess, tempfile
from PIL import Image

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', default='ffmpeg')
parser.add_argument('--input', type=Path, default=root/'media-source/camera-enhanced-1080.mp4')
parser.add_argument('--enhance', action='store_true', help='Rebuild Full HD master from saved camera-prepared.mp4.')
parser.add_argument('--verify-only', action='store_true')
parser.add_argument('--fps', type=int, default=12)
parser.add_argument('--quality', type=int, default=85)
parser.add_argument('--width', type=int, default=1280)
parser.add_argument('--duration', type=float, default=10)
parser.add_argument('--budget', type=int, default=6000000)
args = parser.parse_args()
out = root/'public/media/algyr/platform'
count = round(args.fps*args.duration)
height = round(args.width*9/16)
if args.width % 2 or height % 2 or args.fps < 1 or count < 2:
    parser.error('Use positive FPS and even 16:9 dimensions.')
if args.enhance and args.verify_only:
    parser.error('--enhance and --verify-only cannot be combined.')
if args.enhance and args.input.resolve() in [(root/'media-source/camera-original.mp4').resolve(), (root/'media-source/camera-prepared.mp4').resolve()]:
    parser.error('Enhancement output must not overwrite the original or prepared input.')

def run(arguments):
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', *map(str, arguments)], check=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

if not args.verify_only:
    out.mkdir(parents=True, exist_ok=True)
    if args.enhance:
        prepared = root/'media-source/camera-prepared.mp4'
        if not prepared.is_file():
            parser.error('Missing saved screen-tracked input media-source/camera-prepared.mp4.')
        # This is conservative local enhancement, not generative AI restoration.
        run(['-i',prepared,'-an','-vf',
             'hqdn3d=0.6:0.4:1.2:0.8,scale=1920:1080:flags=lanczos,unsharp=5:5:0.38:3:3:0',
             '-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-r','24',
             '-movflags','+faststart',args.input])
    if not args.input.is_file():
        parser.error('Input master is missing. Supply --input or use --enhance.')
    # Produce all frames before replacing the current sequence.
    with tempfile.TemporaryDirectory(prefix='frames-build-', dir=out) as temp:
        stage=Path(temp)
        run(['-i',args.input,'-an','-t',args.duration,'-vf',f'fps={args.fps},scale={args.width}:{height}:flags=lanczos',
             '-c:v','libwebp','-quality',args.quality,'-compression_level','6','-start_number','0',stage/'f_%03d.webp'])
        candidates=sorted(stage.glob('f_*.webp'))
        assert len(candidates)==count, f'Expected {count} frames, got {len(candidates)}'
        # The screenshot uses the same 16:9 letterboxing as the rectified final video frame.
        assert Image.open(out/'shot-1.webp').size==(args.width,height)
        shutil.copyfile(out/'shot-1.webp',candidates[-1])
        total=sum(path.stat().st_size for path in candidates)
        assert total<=args.budget, f'Sequence is {total} bytes; lower quality/FPS to meet {args.budget}.'
        target=(out/'frames').resolve()
        assert target.parent==out.resolve()
        target.mkdir(exist_ok=True)
        for old in target.glob('f_*.webp'):
            old.unlink()
        for path in candidates:
            shutil.copyfile(path,target/path.name)
    shutil.copyfile(out/'frames/f_000.webp',out/'poster.webp')
    run(['-i',out/'poster.webp','-vf','scale=720:405:flags=lanczos','-c:v','libwebp',
         '-quality','85','-compression_level','6',out/'poster-mobile.webp'])

frames=sorted((out/'frames').glob('f_*.webp'))
probe=subprocess.run([args.ffmpeg,'-hide_banner','-i',str(args.input),'-f','null',os.devnull],capture_output=True,text=True,encoding='utf-8',errors='replace',check=True).stderr
stream=next(line for line in probe.splitlines() if 'Video:' in line)
resolution=re.search(r'\b(\d{3,5})x(\d{3,5})\b',stream)
fps=float(re.search(r'([\d.]+) fps',stream).group(1))
duration=re.search(r'Duration: (\d+):(\d+):([\d.]+)',probe)
seconds=int(duration[1])*3600+int(duration[2])*60+float(duration[3])
decoded_count=int(re.findall(r'frame=\s*(\d+)',probe)[-1])
assert 'Audio:' not in probe, 'The web master must not contain audio.'
assert abs(seconds-args.duration)<.05
assert len(frames)==count
assert [f.name for f in frames]==[f'f_{i:03d}.webp' for i in range(count)]
assert all(Image.open(f).size==(args.width,height) for f in frames)
assert digest(frames[-1])==digest(out/'shot-1.webp')
assert digest(frames[0])==digest(out/'poster.webp')
total=sum(f.stat().st_size for f in frames)
assert total<=args.budget
assert Image.open(out/'poster-mobile.webp').size==(720,405)
screens=[out/f'shot-{i}.webp' for i in range(1,7)]
mobile=sum(f.stat().st_size for f in screens)+(out/'poster-mobile.webp').stat().st_size
assert mobile<3000000
report={
    'processing':'Local denoise + Lanczos upscale + mild sharpening; no AI detail reconstruction.',
    'master':{'path':'media-source/camera-enhanced-1080.mp4','bytes':args.input.stat().st_size,'sha256':digest(args.input),
              'width':int(resolution[1]),'height':int(resolution[2]),'fps':fps,'decoded_frames':decoded_count,'duration_seconds':seconds,'audio':False},
    'sequence':{'frames':count,'fps':args.fps,'width':args.width,'height':height,'quality':args.quality,'bytes':total,'budget':args.budget},
    'mobile':{'poster_bytes':(out/'poster-mobile.webp').stat().st_size,'poster_and_all_screenshots_bytes':mobile,'frame_downloads':0},
    'last_frame_equals_first_screenshot':True,
    'frames':{f.name:{'bytes':f.stat().st_size,'sha256':digest(f)} for f in frames}
}
(root/'docs/MEDIA-REPORT.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='frames'},indent=2))

