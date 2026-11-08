"""Animate the stills with Kling 3 Pro image-to-video (5s, silent). usage: gen_clips.py"""
import subprocess,json,time,sys,urllib.request
K=subprocess.check_output(["security","find-generic-password","-s","fal-key","-w"]).decode().strip()
def call(url,data=None):
    req=urllib.request.Request(url,data=json.dumps(data).encode() if data is not None else None,method="POST" if data is not None else "GET")
    req.add_header("Authorization","Key "+K); req.add_header("Content-Type","application/json")
    with urllib.request.urlopen(req,timeout=180) as r: return json.load(r)
def upload(path):
    r=call("https://rest.alpha.fal.ai/storage/upload/initiate",{"content_type":"image/png","file_name":path})
    req=urllib.request.Request(r["upload_url"],data=open(path,"rb").read(),method="PUT"); req.add_header("Content-Type","image/png")
    urllib.request.urlopen(req,timeout=180).read(); return r["file_url"]
P={"datacentre":"Slow, smooth dolly forward down the aisle of server racks, status LEDs blinking softly, faint haze drifting in the cool light. Cinematic, steady, no people, no text.",
   "chips":"Very slow push-in on the chip with a subtle rotating rim light sweeping across the gold contacts, shallow focus shifting gently. Cinematic macro, no text.",
   "capitol":"Slow, gentle push-in toward the Capitol dome at dusk, clouds drifting slowly, calm and editorial, no people, no text."}
jobs={}
for tag,p in P.items():
    u=upload(f"{tag}.png")
    r=call("https://queue.fal.run/fal-ai/kling-video/v3/pro/image-to-video",{"prompt":p,"start_image_url":u,"duration":"5","cfg_scale":0.5,"generate_audio":False,"negative_prompt":"text, letters, logos, watermark, people, flicker, distortion, low quality"})
    jobs[tag]=r; print("queued",tag)
for tag,r in jobs.items():
    while True:
        s=call(r["status_url"])
        if s["status"]=="COMPLETED": break
        if s["status"] not in("IN_QUEUE","IN_PROGRESS"): print(tag,s); break
        time.sleep(8)
    out=call(r["response_url"]); urllib.request.urlretrieve(out["video"]["url"],f"{tag}.mp4"); print("saved",tag)
