#!/usr/bin/python3
"""Turn the homework outputs into fix-list groups (no site code is touched)."""
import json, os, sys, re
K = os.path.dirname(os.path.abspath(__file__)); A = os.path.dirname(K)
def area_of(t):
    t=t.lower()
    for k,a in [('share','Share'),('whatsapp','Share'),('og:image','Share'),('zoom','Accessibility'),('reduce','Accessibility'),('keyboard','Accessibility'),('contrast','Accessibility'),('payload','Speed'),('performance','Speed'),('kb','Speed'),('phone','Mobile'),('font','Layout'),('title','Layout'),('palette','Layout'),('illustration','Layout'),('copy','Copy'),('voice','Copy'),('sound','Game design'),('count up','Game design'),('feedback','Game design'),('result','Game design'),('end-card','Conversion'),('kit','Speed')]:
        if k in t: return a
    return 'Layout'
q = json.load(open(K+'/quality-bar.json')); g = json.load(open(K+'/games-benchmark.json'))
std = {"slug":"_killer-standard","title":"The IFM killer standard (applies to every game)","url":"https://games.investingformummies.com/","file":"killer/quality-bar.md","kind":"site","audience":"Both",
 "verdict":"What IFM's newest work does well, written as rules every game should meet. Build it once as a shared kit (one CSS and one JS file), then upgrade each game against it. The full checklist with examples is in audits/games-2026-10-26/killer/quality-bar.md.",
 "load":"—","share_idea":"","share_moment":"",
 "items":[{"area":area_of(r['rule']),"priority":"High" if i<12 else "Med","effort":"S","text":r['rule']+(" (Why: "+r['why']+")" if r.get('why') else "")} for i,r in enumerate(q['standard'])]}
std['items'][-1]['effort']='M'
pb = {"slug":"_killer-playbook","title":"Games playbook: what the best money games do","url":"https://games.investingformummies.com/","file":"killer/games-benchmark.json","kind":"site","audience":"Both",
 "verdict":"Patterns from 24 of the best money and learning games (Spent, Wordle, NYT 'You Draw It', Duolingo, Nicky Case, Zogo and others), ranked by impact for IFM. Gaps found: rivals break on phones, and no Indian product offers an always-on, 2-minute money game for mums with WhatsApp sharing.",
 "load":"—","share_idea":"","share_moment":"",
 "items":[{"area":"Game design","priority":"High" if i<8 else ("Med" if i<15 else "Low"),"effort":"M","text":p['pattern']+": "+p['how_ifm_could_use']+" (Inspired by "+re.sub(r'\s*https?://\S+','',p['example']).strip()[:80]+")"} for i,p in enumerate(g['playbook'])]
 + [{"area":"Game design","priority":"Med","effort":"S","text":"Avoid: "+a['pattern']+". "+a['why']} for a in g.get('anti_patterns',[])]}
rooms = json.load(open(K+'/rooms.json'))
oldaddr = json.load(open(K+'/oldaddress.json'))
out = {"group":"killer-std","games":[oldaddr, rooms, std, pb]}
json.dump(out, open(A+'/killer-std.json','w'), indent=1, ensure_ascii=False)
for src,grp in [('games-a.json','killer-a'),('games-b.json','killer-b')]:
    p=K+'/'+src
    if os.path.exists(p):
        d=json.load(open(p)); d['group']=grp
        for gm in d['games']:
            if not gm['slug'].startswith('killer-'): gm['slug']='killer-'+gm['slug']
        json.dump(d, open(A+'/'+grp+'.json','w'), indent=1, ensure_ascii=False)
p=K+'/tools-benchmark.json'
if os.path.exists(p):
    d=json.load(open(p)); games=[]
    games.append({"slug":"_tools-playbook","title":"Tools playbook: what the best calculators do","url":"https://www.investingformummies.com/tools","file":"killer/tools-benchmark.json","kind":"tool","audience":"Mummies",
      "verdict":"Patterns from the best Indian and global money calculators (Groww, Zerodha, ET Money, Kuvera, NerdWallet, Vanguard and others), ranked for IFM's tools at www/tools.","load":"—","share_idea":"","share_moment":"",
      "items":[{"area":"Layout","priority":"High" if i<6 else "Med","effort":"M","text":x['pattern']+": "+x['why']+" (e.g. "+re.sub(r'\s*https?://\S+','',x['example']).strip()[:80]+")"} for i,x in enumerate(d['playbook'])]})
    for t in d['tools']:
        games.append({"slug":"killer-tool-"+t['slug'],"title":t['title']+" — killer upgrade","url":"https://www.investingformummies.com/tools/"+t['slug'],"file":"www/tools","kind":"tool","audience":"Mummies","verdict":t.get('vision',''),"load":"","share_idea":"","share_moment":"","items":t['items']})
    json.dump({"group":"tools-bench","games":games}, open(A+'/tools-bench.json','w'), indent=1, ensure_ascii=False)
print('merged', [f for f in ['killer-std.json','killer-a.json','killer-b.json','tools-bench.json'] if os.path.exists(A+'/'+f)])
