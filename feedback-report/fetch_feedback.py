#!/usr/bin/python3
"""Pull the IFM feedback tabs from the public admin Google Sheet, normalise them, and write
data/clean.json, data/all-responses.csv and data/stats.json.

Handles the two known defects in the sheet:
  * rows from August 2026 onward are shifted one column left (detected per row, corrected)
  * test entries (test emails, answer "Test") are dropped and listed in stats.json
No login needed: the sheet is shared "anyone with the link".
"""
import csv, io, json, re, sys, urllib.request, collections, datetime, os

SHEET = '1cKjzjbmPfFJq3wjTJnGTKW4rUJNIHpZltfL1jKau9Uk'
GIDS = {'feedback':332313533,'iya':1183926362,'ift':1184692538,
        'ifmreg':855165962,'iyareg':1497102767,'iftreg':1875230536}
RECS = ['Highly recommend!','Likely','Maybe','Not likely']
TEST_EMAILS = {'test@example.com','asba@moogaworld.com'}
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE,'data')

def fetch(name):
    url=f'https://docs.google.com/spreadsheets/d/{SHEET}/export?format=csv&gid={GIDS[name]}'
    raw=urllib.request.urlopen(url,timeout=60).read().decode('utf-8')
    rows=list(csv.DictReader(io.StringIO(raw)))
    if not rows: raise SystemExit(f'{name}: empty download, refusing to continue')
    return rows

def col(row, prefix):
    nk=re.sub(r'[\s_\-]','',prefix.lower())
    for k,v in row.items():
        if k and re.sub(r'[\s_\-]','',k.lower()).startswith(nk): return (v or '').strip()
    return ''

def month_of(batch):
    return (batch or '').split(' ')[0].split('-')[0].strip()

def short_batch(b):
    b=(b or '').strip()
    m=re.match(r'^(\w+)\s*[-·]\s*(Batch\s*\d|B\d)',b)
    if m: return f'{m.group(1)} · {m.group(2)}'
    m=re.match(r'^(\w+)\s+(B\d)',b)
    if m: return f'{m.group(1)} · {m.group(2)}'
    return b.split(' · ')[0] if b else '—'

def clean_text(s): return re.sub(r'\s*\r?\n\s*',' / ',(s or '').strip())

def main():
    os.makedirs(DATA,exist_ok=True)
    fb,iya,ift=fetch('feedback'),fetch('iya'),fetch('ift')
    ifmreg,iyareg,iftreg=fetch('ifmreg'),fetch('iyareg'),fetch('iftreg')

    # ---- enrolment + email→batch maps
    batch_of={}; name_batch={}; enrol=collections.Counter()
    for r in ifmreg:
        ok=(r.get('Payment Status','').lower()=='payment successful') or (r.get('Admin Status','').lower()=='paid')
        if not ok: continue
        e=(r.get('Email') or '').lower().strip(); b=r.get('Batch Selected','')
        batch_of[e]=short_batch(b); enrol[month_of(b) or '—']+=1
        nm=((r.get('First Name') or '')+' '+(r.get('Last Name') or '')).lower().split(); name_batch[' '.join(nm)]=short_batch(b)
    teen_enrol={}
    for prog,rows,bk,pk,ek in (('IYA',iyareg,'Selected Batch','Payment Status','Student Email'),('IFT',iftreg,'Batch','Status','Email')):
        n=0
        for r in rows:
            if 'uccess' not in r.get(pk,'') and 'onfirm' not in r.get(pk,'') and r.get(pk,'').lower()!='paid': continue
            n+=1; e=(r.get(ek) or '').lower().strip()
            bb=prog+' '+(r.get(bk,'').split(' · ')[0].split(' - ')[0].strip() or '?'); batch_of[e]=bb; name_batch[' '.join((r.get('Student Name') or '').lower().split())]=bb
        teen_enrol[prog]=n

    rows=[]; tests=[]; dash_literal=collections.Counter(); dash_wa=0
    for r in fb:
        name=col(r,'Name'); email=col(r,'Email').lower()
        if not (name or email): continue
        g=lambda k: col(r,k)
        course,q1,q2,q3,q4,fut,wa_or_journey,testi=g('Course'),g('Q1'),g('Q2'),g('Q3'),g('Q4'),g('Future Interests'),g('Investment Journey'),g('Testimonial')
        dash_literal[q2]+=1   # what the dashboard counts, uncorrected
        if email in TEST_EMAILS or q1.strip().lower()=='test' or name.lower().startswith(('test ','deploy test')):
            tests.append(name); continue
        o={'programme':'IFM','name':name,'email':email,'batch':batch_of.get(email) or name_batch.get(' '.join(name.lower().split()),'—'),
           'submitted':(g('Submitted At') or g('Timestamp'))[:19]}
        if q2 in RECS:
            o.update(q1_learning=q1,q2_recommend=q2,q3_enjoyed=q3,q4_improve=q4,future=fut,wa='',testimonial=testi,shifted='')
            # the WhatsApp question only exists on the newer form; on old rows the column is the testimonial
        elif q1 in RECS:
            o.update(q1_learning=course,q2_recommend=q1,q3_enjoyed=q2,q4_improve=q3,future=q4,wa=fut,testimonial='',shifted='yes')
        else:
            o.update(q1_learning=q1,q2_recommend=q2,q3_enjoyed=q3,q4_improve=q4,future=fut,wa='',testimonial=testi,shifted='unknown layout')
            print('WARN unknown layout:',name,file=sys.stderr)
        rows.append(o)
    for prog,src in (('IYA',iya),('IFT',ift)):
        for r in src:
            name=col(r,'Name'); email=col(r,'Email').lower()
            if not (name or email): continue
            if email in TEST_EMAILS: tests.append(name); continue
            ge=col(r,'Game Enjoyment'); fav=col(r,'Favorite Game')
            rows.append({'programme':prog,'name':name,'email':email,'batch':batch_of.get(email) or name_batch.get(' '.join(name.lower().split()),'—'),
                'submitted':col(r,'Timestamp')[:19],
                'q1_learning':col(r,'Concept to Learn in Detail') or col(r,'Topics Found Useful'),
                'q2_recommend':(col(r,'Overall Rating') or '?')+'/5',
                'q3_enjoyed':(ge+(' — favourite: '+fav if fav else '')) if ge else '',
                'q4_improve':col(r,'Improvement Ideas') or col(r,'Suggestions'),
                'future':col(r,'Attend More'),'wa':'','testimonial':'','shifted':''})
    for o in rows:
        for k in ('q1_learning','q3_enjoyed','q4_improve'): o[k]=clean_text(o[k])

    # ---- diff against last run
    prev=set()
    pp=os.path.join(DATA,'clean.json')
    if os.path.exists(pp):
        prev={(x['email'],x['name']) for x in json.load(open(pp))}
    new=[o for o in rows if (o['email'],o['name']) not in prev]

    ifm=[o for o in rows if o['programme']=='IFM']; teen=[o for o in rows if o['programme']!='IFM']
    ratings=[int(o['q2_recommend'][0]) for o in teen if o['q2_recommend'][0].isdigit()]
    cov=[]
    for m in ['March','April','May','June','July','August','September','October','November','December']:
        if enrol.get(m): cov.append({'label':f'{m} 2026','n':sum(1 for o in ifm if o['batch'].startswith(m)),'e':enrol[m]})
    for prog in ('IYA','IFT'):
        cov.append({'label':f'{prog} (teens)','n':sum(1 for o in teen if o['programme']==prog),'e':teen_enrol.get(prog,0)})
    total_enrol=sum(enrol.values())+sum(teen_enrol.values())
    stats={
      'generated':datetime.datetime.now().strftime('%-d %B %Y'),
      'n_real':len(rows),'n_ifm':len(ifm),'n_teen':len(teen),'n_tests':len(tests),'tests':tests,
      'enrolled':total_enrol,'rate_pct':round(len(rows)/total_enrol*100) if total_enrol else 0,'pending':total_enrol-len(rows),
      'rec':collections.Counter(o['q2_recommend'] for o in ifm),
      'teen_avg':round(sum(ratings)/len(ratings),1) if ratings else None,'teen_ratings':collections.Counter(ratings),
      'teen_again':collections.Counter(o['future'] for o in teen),
      'wa':collections.Counter(o['wa'] for o in ifm if o['wa']),'testimonial_yes':sum(1 for o in ifm if o['testimonial'].lower().startswith('yes')),
      'future':{t:sum(1 for o in ifm if t in o['future']) for t in ('Specific Topic','Guest Lecturer','Refresher')},
      'dashboard_literal':{'total':sum(dash_literal.values())+len(iya)+len(ift),'highly':dash_literal['Highly recommend!'],'likely':dash_literal['Likely'],'maybe':dash_literal['Maybe'],'wa':0},
      'coverage':cov,'shifted_rows':sum(1 for o in ifm if o['shifted']),
      'new_since_last_run':[{'name':o['name'],'programme':o['programme'],'batch':o['batch']} for o in new],
    }
    json.dump(rows,open(pp,'w'),indent=1,ensure_ascii=False)
    json.dump(stats,open(os.path.join(DATA,'stats.json'),'w'),indent=1,ensure_ascii=False)
    cols=['programme','batch','name','email','submitted','q1_learning','q2_recommend','q3_enjoyed','q4_improve','future','wa','testimonial','shifted']
    with open(os.path.join(DATA,'all-responses.csv'),'w',newline='') as f:
        w=csv.writer(f); w.writerow(cols); [w.writerow([o[c] for c in cols]) for o in rows]
    print(json.dumps({k:stats[k] for k in ('generated','n_real','n_ifm','n_teen','n_tests','rate_pct','pending','rec','teen_avg','shifted_rows')},ensure_ascii=False))
    print('new since last run:',len(new),[x['name'] for x in new])
    print('coverage:',[(c['label'],c['n'],c['e']) for c in cov])
main()
