from pathlib import Path
import cv2,numpy as np,json
root=Path.cwd();items=[]
for i in range(108,120):
 im=cv2.imread(str(root/f'public/media/algyr/platform/frames/f_{i:03d}.webp'))
 b,g,r=cv2.split(im)
 mask=((r>190)&(g>65)&(g<185)&(b<125)).astype('uint8')*255
 mask[:180]=0;mask[340:]=0;mask[:,:190]=0;mask[:,480:]=0
 cc,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 box=cv2.boundingRect(max(cc,key=cv2.contourArea))
 x,y,w,h=box
 items.append({'frame':i,'x':x,'y':y,'width':w,'height':h,'aspect':round(w/h,3)})
assert all(b['height']>=a['height']-1 and b['width']>=a['width']-1 for a,b in zip(items,items[1:])),items
(root/'docs/video-aspect-check.json').write_text(json.dumps({'first_course_card':items,'late_zoom_monotonic':True},indent=2))
print(json.dumps(items))
