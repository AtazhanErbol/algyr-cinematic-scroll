"""Measure the visible display per frame of this saved take (OpenCV + NumPy).

The first 96 frames show the lid/edge/reflections. They stay unpainted.
This detector is calibrated for camera-original.mp4, not arbitrary footage.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
source = root / 'media-source/camera-original.mp4'
cap = cv2.VideoCapture(str(source))
assert cap.isOpened()
fps = cap.get(cv2.CAP_PROP_FPS)
count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
assert (fps, count) == (24, 240), 'Recalibrate tracking for a different camera take.'
first = 96
previous = np.array([[912, 346], [1028, 373], [986, 561], [874, 507]], np.float32)
frames = []
for index in range(count):
    ok, frame = cap.read()
    assert ok and frame.shape[:2] == (720, 1280)
    if index < first:
        frames.append(None)
        continue
    # Follow the previously measured display, never the old sparse anchors.
    x0, y0 = np.maximum(0, previous.min(0) - 40).astype(int)
    x1, y1 = np.minimum([1280, 720], previous.max(0) + 40).astype(int)
    b, g, r = cv2.split(frame.astype(np.int16))
    white = (b > 170) & (g > 170) & (r > 170)
    navy = (b-r > 8) & (b-g > 3) & (b > 35) & (b < 110) & (g < 100)
    mask = ((white | navy).astype(np.uint8)) * 255
    mask[:y0] = 0; mask[y1:] = 0; mask[:, :x0] = 0; mask[:, x1:] = 0
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    assert contours, f'No display in frame {index}'
    contour = max(contours, key=cv2.contourArea)
    hull = cv2.convexHull(contour)
    quad = cv2.approxPolyDP(hull, .012 * cv2.arcLength(hull, True), True).reshape(-1, 2)
    assert len(quad) == 4, f'Ambiguous display boundary in frame {index}; inspect before export.'
    total = quad.sum(1); difference = np.diff(quad, axis=1).ravel()
    quad = np.array([quad[np.argmin(total)], quad[np.argmin(difference)],
                     quad[np.argmax(total)], quad[np.argmax(difference)]], np.float32)
    assert cv2.isContourConvex(quad) and cv2.contourArea(quad) > 20000
    assert np.max(np.linalg.norm(quad-previous, axis=1)) < 25, f'Tracking jump at {index}'
    frames.append(quad.tolist())
    previous = quad
cap.release()
data = {
    'source': source.name, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'frame_size': [1280, 720], 'fps': fps, 'frame_count': count,
    'coordinates': 'Measured per decoded frame; TL, TR, BR, BL. Null means preserve source.',
    'first_overlay_frame': first, 'fade_frames': 4,
    'method': 'White content plus navy sidebar; local contour hull of entire display. No sparse keyframe interpolation.',
    'frames': frames,
}
(root / 'media-source/screen-tracking.json').write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'tracked_frames': count-first, 'untouched_frames': first, 'source_sha256': data['source_sha256']}))
