#!/usr/bin/python3
"""Fill template.html with data/clean.json, data/stats.json and themes.json → out/feedback-insights.html."""
import json, os, re
HERE=os.path.dirname(os.path.abspath(__file__))
rows=json.load(open(f'{HERE}/data/clean.json')); st=json.load(open(f'{HERE}/data/stats.json')); T=json.load(open(f'{HERE}/themes.json'))
for r in rows: r.pop('email',None); r.pop('submitted',None)   # never publish emails
h=open(f'{HERE}/template.html').read()
rec=st['rec']; hr=rec.get('Highly recommend!',0)
others=[f'{v} said "{k}"' for k,v in rec.items() if k!='Highly recommend!']
tr=st['teen_ratings']; again=sum(v for k,v in st['teen_again'].items() if 'yes' in k.lower())
wa=st['wa']; wa_txt=' · '.join(f'{v} {k.lower().replace("!","")}' for k,v in wa.items()) or 'none asked yet'
V={'GENERATED':st['generated'],'N_REAL':st['n_real'],'N_IFM':st['n_ifm'],'N_TEEN':st['n_teen'],'N_TESTS':st['n_tests'],
   'N_IYA':sum(1 for r in rows if r['programme']=='IYA'),'N_IFT':sum(1 for r in rows if r['programme']=='IFT'),
   'DASH_TOTAL':st['dashboard_literal']['total'],'DASH_HR':st['dashboard_literal']['highly'],'DASH_MAYBE':st['dashboard_literal']['maybe'],
   'HR':hr,'MAYBE':rec.get('Maybe',0),'REC_OTHERS':(', '.join(others)+'.' if others else 'Everyone.')+(' Nobody said maybe or no.' if not rec.get('Maybe') and not rec.get('Not likely') else ''),
   'TEEN_AVG':st['teen_avg'],'TEEN_SPLIT':', '.join(f'{v} gave {k}' for k,v in sorted(tr.items(),key=lambda x:-int(x[0])))+'.','TEEN_AGAIN':again,
   'RATE':st['rate_pct'],'RATE_CLASS':'bad' if st['rate_pct']<40 else 'warn' if st['rate_pct']<60 else 'good','ENROLLED':st['enrolled'],'PENDING':st['pending'],'WA':wa_txt}
for k,v in V.items(): h=h.replace('{{'+k+'}}',str(v))
left=re.findall(r'\{\{[A-Z_]+\}\}',h); assert not left, left
h=h.replace('__DATA__',json.dumps(rows,ensure_ascii=False)).replace('__THEMES__',json.dumps(T,ensure_ascii=False)).replace('__COVERAGE__',json.dumps(st['coverage'],ensure_ascii=False))
os.makedirs(f'{HERE}/out',exist_ok=True); open(f'{HERE}/out/feedback-insights.html','w').write(h)
# names referenced in themes.json but missing from the data → the tags need updating
names={r['name'] for r in rows}; missing=sorted({n for k in T for it in T[k] if isinstance(it[2],list) for n in it[2] if n not in names})
untagged=sorted(r['name'] for r in rows if r['programme']=='IFM' and not any(r['name'] in it[2] for k in ('q1','q3','q4') for it in T[k] if isinstance(it[2],list)))
print('built out/feedback-insights.html'); print('theme names not in data:',missing); print('IFM rows with no theme tags yet:',untagged)
