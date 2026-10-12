"""Audit the exported compositing against the untouched camera take.

Check every decoded frame for new paint outside the measured panel, including
the whole frame before it is visible. Save contact sheets for visual review.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
out = root/'output/tracking-review'; out.mkdir(parents=True, exist_ok=True)
data = json.loads((root/'media-source/screen-tracking.json').read_text(encoding='utf-8'))
source = cv2.VideoCapture(str(root/'media-source/camera-original.mp4'))
result = cv2.VideoCapture(str(root/'media-source/camera-prepared.mp4'))
items = []
for n, quad in enumerate(data['frames']):
    ok, a = source.read(); ok2, b = result.read()
    assert ok and ok2
    panel = np.zeros((720, 1280), np.uint8)
    if quad is not None:
        cv2.fillConvexPoly(panel, np.array(quad, np.int32), 255)
        # Permit the unavoidable chroma/compression ringing immediately at edges.
        panel = cv2.dilate(panel, np.ones((9, 9), np.uint8))
    difference = np.max(cv2.absdiff(a, b), axis=2)[panel == 0]
    stats = {'frame': n, 'outside_mean': round(float(difference.mean()), 4) if len(difference) else 0,
             'outside_over_24': int((difference > 24).sum()), 'outside_pixels': len(difference)}
    # H.264 chroma conversion shifts low-amplitude channel values. Floating
    # white UI creates large (>24) errors, unlike this encoding noise.
    assert stats['outside_mean'] < 6, stats
    assert stats['outside_over_24'] < max(10, len(difference)*.0005), stats
    items.append(stats)
    # Show the problem interval at native aspect and enlarge the laptop for review.
    if 72 <= n < 108:
        cv2.imwrite(str(out/f'frame-{n:03}.jpg'), b)
    if n >= 72:
        if quad is not None:
            q = np.array(quad)
            x0, y0 = np.maximum(0, q.min(0)-20).astype(int)
            x1, y1 = np.minimum([1280,720], q.max(0)+20).astype(int)
        else:
            x0,y0,x1,y1 = 830,300,1060,615
        crop = b[y0:y1,x0:x1]
        scale = min(320/crop.shape[1], 250/crop.shape[0])
        crop = cv2.resize(crop, None, fx=scale, fy=scale)
        tile = np.full((280,340,3),245,np.uint8)
        tile[28:28+crop.shape[0],10:10+crop.shape[1]] = crop
        cv2.putText(tile, f'{n} / {n/24:.3f}s', (10,20), cv2.FONT_HERSHEY_SIMPLEX,.5,(0,0,0),1)
        cv2.imwrite(str(out/f'tile-{n:03}.jpg'),tile)
source.release(); result.release()
for start in range(72,240,24):
    sheet=Image.new('RGB',(6*340,4*280),'white')
    for i,n in enumerate(range(start,min(start+24,240))):
        sheet.paste(Image.open(out/f'tile-{n:03}.jpg'),(i%6*340,i//6*280))
    sheet.save(out/f'review-{start:03}.jpg')
report={'decoded_frames':len(items),'preserved_opening_frames':data['first_overlay_frame'],
        'max_outside_mean_channel_error':max(v['outside_mean'] for v in items),
        'max_outside_pixels_over_24':max(v['outside_over_24'] for v in items),'frames':items}
(root/'docs/screen-tracking-check.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='frames'}))
