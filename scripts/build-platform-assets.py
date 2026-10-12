"""Export the six screenshot WebPs from the supplied PNGs. Requires FFmpeg with libwebp.

python scripts/build-platform-assets.py --ffmpeg /path/to/ffmpeg
No source files are overwritten. Then run make-frames.py to update the final frame handoff.
"""
from pathlib import Path
import argparse
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', default='ffmpeg')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = root / 'media-source'
out = root / 'public/media/algyr/platform'
out.mkdir(parents=True, exist_ok=True)

def export(filename, destination, filters, seek=None):
    command = [args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y']
    if seek is not None:
        command += ['-ss', str(seek)]
    command += ['-i', str(source / filename), '-frames:v', '1', '-vf', filters,
                '-c:v', 'libwebp', '-quality', '90', '-compression_level', '6', str(out / destination)]
    subprocess.run(command, check=True)

for index, name in enumerate(['courses', 'dashboard', 'lesson', 'results', 'test', 'profile'], 1):
    export(name + '.png', f'shot-{index}.webp',
           'scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xf7f5fc')
print('Exported 6 screenshots. Run make-frames.py to update the frame/poster sequence. Changing shot-1 also requires updating the prepared video screen composite.')
