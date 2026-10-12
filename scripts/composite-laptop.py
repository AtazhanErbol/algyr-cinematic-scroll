"""Composite the complete screenshot into each measured, visible display.

Requires OpenCV, NumPy and FFmpeg. Original footage is never overwritten.
"""
from pathlib import Path
import argparse, hashlib, json, subprocess
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', default='ffmpeg')
args = parser.parse_args()
data = json.loads((root/'media-source/screen-tracking.json').read_text(encoding='utf-8-sig'))
original = root/'media-source/camera-original.mp4'
assert hashlib.sha256(original.read_bytes()).hexdigest() == data['source_sha256'], 'Tracking belongs to another video.'
screen = cv2.imread(str(root/'public/media/algyr/platform/shot-1.webp'))
height, width = screen.shape[:2]
assert [width, height] == data['frame_size']
source_quad = np.array([[0, 0], [width-1, 0], [width-1, height-1], [0, height-1]], np.float32)
cap = cv2.VideoCapture(str(original))
assert cap.isOpened() and cap.get(cv2.CAP_PROP_FPS) == data['fps']
assert int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) == len(data['frames']) == data['frame_count']
out = root/'media-source/camera-prepared.mp4'
staged = out.with_name('camera-prepared.build.mp4')
writer = subprocess.Popen([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo',
    '-pix_fmt', 'bgr24', '-s', f'{width}x{height}', '-r', str(data['fps']), '-i', 'pipe:0',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', str(staged)], stdin=subprocess.PIPE)
painted = 0
try:
    for index, coordinates in enumerate(data['frames']):
        ok, frame = cap.read()
        assert ok
        if coordinates is not None:
            quad = np.array(coordinates, np.float32)
            assert quad.shape == (4, 2) and cv2.isContourConvex(quad)
            matrix = cv2.getPerspectiveTransform(source_quad, quad)
            overlay = cv2.warpPerspective(screen, matrix, (width, height), flags=cv2.INTER_LANCZOS4)
            # A one-pixel inner feather confines all paint to the measured panel,
            # preserving its bezel and anti-aliasing the replacement.
            mask = np.zeros((height, width), np.uint8)
            cv2.fillConvexPoly(mask, np.rint(quad).astype(np.int32), 255)
            inside = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
            coverage = np.clip(inside-1, 0, 1)
            blend = np.clip((index-data['first_overlay_frame'])/data['fade_frames'], 0, 1)
            alpha = (coverage*blend)[..., None]
            result = np.clip(frame*(1-alpha)+overlay*alpha, 0, 255).astype(np.uint8)
            assert np.array_equal(result[mask == 0], frame[mask == 0]), 'Paint escaped the screen.'
            frame = result
            painted += int(blend > 0)
        writer.stdin.write(frame.tobytes())
finally:
    cap.release()
    writer.stdin.close()
assert writer.wait() == 0
staged.replace(out)
report = {'output': 'media-source/camera-prepared.mp4', 'frames': data['frame_count'], 'fps': data['fps'],
          'first_overlay_frame': data['first_overlay_frame'], 'painted_frames': painted,
          'screen_canvas': [width, height], 'outside_display_changes_before_encoding': 0,
          'aspect_correction': 'Complete letterboxed screenshot; no end-of-video Y compression.'}
(root/'docs/screen-composite-check.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps(report))

