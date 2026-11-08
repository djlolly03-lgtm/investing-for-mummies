"""Text-free editorial stills on fal (Nano Banana Pro, text-to-image), 9:16 2K. usage: gen_stills.py"""
import subprocess,json,time,sys,urllib.request
K=subprocess.check_output(["security","find-generic-password","-s","fal-key","-w"]).decode().strip()
def call(url,data=None):
    req=urllib.request.Request(url,data=json.dumps(data).encode() if data is not None else None,method="POST" if data is not None else "GET")
    req.add_header("Authorization","Key "+K); req.add_header("Content-Type","application/json")
    with urllib.request.urlopen(req,timeout=180) as r: return json.load(r)
SHOTS={
 "datacentre":"Cinematic editorial photograph inside a modern AI data centre: long aisle of dark server racks with rows of small blue and white status LEDs, cool blue-white light, slight haze, shallow depth of field, premium corporate documentary look, deep navy and steel tones. No people. No text, no logos, no labels, no signage, no numbers anywhere.",
 "chips":"Macro editorial photograph of a bare AI accelerator chip on a dark circuit board, gold contact pads, subtle blue rim light, shallow depth of field, premium tech documentary look, deep navy background. No text, no logos, no labels, no markings on the chip, no numbers.",
 "capitol":"Neutral editorial photograph of the United States Capitol building at dusk, slightly low angle, pale stone dome against a deep blue-navy sky, soft lighting, calm and non-partisan, premium news-magazine look. No people, no flags in focus, no text, no signage, no watermarks.",
}
jobs={}
for tag,p in SHOTS.items():
    r=call("https://queue.fal.run/fal-ai/nano-banana-pro",{"prompt":p,"num_images":1,"resolution":"2K","aspect_ratio":"9:16","output_format":"png"})
    jobs[tag]=r; print("queued",tag,r["request_id"])
for tag,r in jobs.items():
    while True:
        s=call(r["status_url"])
        if s["status"]=="COMPLETED": break
        if s["status"] not in("IN_QUEUE","IN_PROGRESS"): print(tag,s); break
        time.sleep(4)
    out=call(r["response_url"]); urllib.request.urlretrieve(out["images"][0]["url"],f"{tag}.png"); print("saved",tag)
