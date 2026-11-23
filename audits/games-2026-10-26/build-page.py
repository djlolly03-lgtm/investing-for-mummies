#!/usr/bin/python3
import json,re,os,sys
S=os.path.dirname(os.path.abspath(__file__))
order=['buildorder','requests','reaudit-ipo-jio','killer-std','sitewide','solo-a','solo-b','solo-c','class-a','class-b','classic','killer-a','killer-b','tools-bench']
groups=[]; total=0; seen=set()
def key(s): return re.sub(r'[^A-Za-z0-9_-]+','-',s).strip('-') or 'x'
for g in order:
    p=os.path.join(S,g+'.json')
    if not os.path.exists(p): print('missing',g); continue
    d=json.load(open(p))
    for game in d['games']:
        k=key(game.get('slug') or game.get('title')); base=k; i=2
        while k in seen: k=f'{base}-{i}'; i+=1
        seen.add(k); game['key']=k
        if not game.get('kind'): game['kind']='solo'
        if game['kind'] not in ('site','solo','classroom','tool'): game['kind']='solo'
        for n,it in enumerate(game.get('items',[])):
            it['id']=f'{k}--{n+1}'
            it['priority']=it.get('priority','Med') if it.get('priority') in ('High','Med','Low') else 'Med'
            it['effort']=it.get('effort','M') if it.get('effort') in ('S','M','L') else 'M'
        total+=len(game.get('items',[]))
    groups.append({'group':g,'games':d['games']})
# "Start here" section for a named builder: an ordered list of EXISTING item ids (never new ids).
start=None
sp=os.path.join(S,'narendra.json')
if os.path.exists(sp):
    byid={it['id']:(game,it) for gr in groups for game in gr['games'] for it in game.get('items',[])}
    sd=json.load(open(sp))
    for g in sd['items']:
        missing=[i for i in g['ids'] if i not in byid]
        assert not missing, ('unknown ids in narendra.json', missing)
    start={'games':[{'key':g['key'],'title':g['title'],'url':g.get('url',''),
                     'items':[{k:byid[i][1][k] for k in ('id','text','area','priority','effort')} for i in g['ids']]} for g in sd['items']]}
data=json.dumps({'groups':groups,'start':start},ensure_ascii=False).replace('</','<\\/')
t=open(os.path.join(S,'template.html'),encoding='utf-8').read().replace('/*DATA*/',data)
open(os.path.join(S,'ifm-games-fix-list.html'),'w',encoding='utf-8').write(t)
print('pages',sum(len(g['games']) for g in groups),'items',total,'bytes',len(t))
