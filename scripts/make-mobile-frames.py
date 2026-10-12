"""Derive a lighter, pixel-matched touch sequence without changing the camera edit."""
from pathlib import Path
import argparse
import json
import shutil
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
media = root / 'public/media/algyr/platform'
frames = media / 'frames-mobile'
shots = media / 'shots-mobile'
frames.mkdir(exist_ok=True)
shots.mkdir(exist_ok=True)
common = [args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y']
subprocess.run(common + ['-framerate', '12', '-i', str(media/'frames/f_%03d.webp'),
    '-vf', 'scale=720:405:flags=lanczos', '-c:v', 'libwebp', '-quality', '82',
    '-compression_level', '6', '-start_number', '0', str(frames/'f_%03d.webp')], check=True)
for i in range(1, 7):
    subprocess.run(common + ['-i', str(media/f'shot-{i}.webp'), '-vf', 'scale=720:405:flags=lanczos',
        '-c:v', 'libwebp', '-quality', '90', '-compression_level', '6', str(shots/f'shot-{i}.webp')], check=True)
shutil.copyfile(shots/'shot-1.webp', frames/'f_119.webp')
assert len(list(frames.glob('*.webp'))) == 120
size = sum(p.stat().st_size for p in frames.glob('*.webp'))
assert size < 3_000_000
print(json.dumps({'frames':120,'width':720,'height':405,'bytes':size,'handoff':'byte-identical to mobile shot-1'}))
