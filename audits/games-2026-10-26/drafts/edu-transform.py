#!/usr/bin/python3
"""Turn the classic hub's Education Planner into a standalone page with per-child
SIP return, per-child existing investments, and per-child SIP + lump sum results."""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (a[:70], c); s = s.replace(a, b)
def cut(start, end, new, keep_end=True):
    global s
    a = s.index(start); b = s.index(end, a)
    s = s[:a] + new + (s[b:] if keep_end else s[b+len(end):])

# ---------- page chrome ----------
rep('<title>Education Planner — Investing for Mummies</title>',
    '<title>Education Planner — Investing for Mummies</title>\n<meta name="description" content="Plan each child\'s education: cost with inflation, what your investments will cover, and the monthly SIP or one-time lump sum needed per child."/>')

# ---------- CSS ----------
css = """
  /* per-child planning (Oct 2026) */
  .pc-sub{font-size:0.72rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--teal);margin:18px 0 8px;padding-top:14px;border-top:1px dashed #d5e6e2;}
  .inv-head{font-size:0.85rem;font-weight:700;color:var(--navy);margin:10px 0 6px;}
  .inv-head span{display:block;font-size:0.72rem;font-weight:600;color:var(--muted);}
  .inv-row{display:grid;grid-template-columns:1.3fr 1fr 74px 1fr 32px;gap:8px;align-items:center;margin-bottom:8px;}
  .inv-row .inp-wrap{width:auto !important;min-width:0;}
  .inv-row .inv-name{width:100%;min-width:0;border:1.5px solid #d5e6e2;border-radius:10px;padding:9px 10px;font:600 0.85rem 'Nunito',sans-serif;color:var(--navy);background:#fff;}
  .inv-row .btn-rm-dyn{position:static;}
  .inv-fv{font-size:0.8rem;color:#16a34a;font-weight:700;margin:6px 0 0;min-height:1em;}
  @media (max-width:620px){
    .inv-row{grid-template-columns:1fr 74px 32px;grid-template-areas:"name name rm" "amt rate rate" "mon mon mon";}
    .inv-row .inv-name{grid-area:name}.inv-row .w-amt{grid-area:amt}.inv-row .w-rate{grid-area:rate}.inv-row .w-mon{grid-area:mon}.inv-row .btn-rm-dyn{grid-area:rm}
  }
  .pc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;margin:8px 0 22px;}
  .pc-card{background:#fff;border-radius:18px;padding:18px 20px;box-shadow:0 3px 18px rgba(26,58,92,0.08);border-top:5px solid var(--teal);min-width:0;}
  .pc-card h4{font-family:'Lora',serif;font-size:1.15rem;color:var(--navy);margin:0;}
  .pc-when{font-size:0.8rem;color:var(--muted);margin:2px 0 12px;}
  .pc-card dl{margin:0;display:grid;gap:6px;}
  .pc-card dl div{display:flex;justify-content:space-between;gap:10px;font-size:0.86rem;}
  .pc-card dt{color:var(--muted);} .pc-card dd{margin:0;font-weight:800;color:var(--navy);font-variant-numeric:tabular-nums;text-align:right;}
  .pc-card dd.gap{color:#D94040;}
  .pc-need{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:stretch;margin-top:14px;}
  .pc-need > div:not(.or){background:#f1f8f6;border-radius:12px;padding:10px 12px;text-align:center;}
  .pc-need span{display:block;font-size:0.68rem;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:var(--teal);}
  .pc-need b{display:block;font-family:'Lora',serif;font-size:1.35rem;color:var(--navy);margin:2px 0;}
  .pc-need small{display:block;font-size:0.7rem;color:var(--muted);}
  .pc-need .or{align-self:center;font-size:0.75rem;font-weight:800;color:var(--muted);}
  .pc-need .na b{font-size:0.9rem;font-family:'Nunito',sans-serif;}
  .pc-ok{margin:14px 0 0;padding:10px 12px;border-radius:12px;background:#e8f7ef;color:#16743f;font-weight:800;font-size:0.86rem;}
  .pc-assume{font-size:0.7rem;color:var(--muted);margin:10px 0 0;}
  .pc-total{grid-column:1/-1;background:linear-gradient(135deg,#1a3a5c,#245a7c);color:#fff;border-radius:18px;padding:16px 20px;display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline;}
  .pc-total b{font-family:'Lora',serif;font-size:1.25rem;color:#f0d9a8;}
"""
i = s.index('</style>'); s = s[:i] + css + s[i:]

# ---------- remove the shared SIP-return card and the shared "Existing invested" card ----------
a = s.index('<!-- SIP RETURN ASSUMPTION (for gap bridging) -->'); b = s.index('<!-- EXISTING SAVINGS', a)
s = s[:a] + '</div>\n\n  ' + s[b:]
cut('<!-- EXISTING SAVINGS', '<button class="btn-go"', '')
rep('<div class="grid-2" style="margin-bottom:20px;">', '<div style="margin-bottom:20px;">')
rep('<p style="font-size:0.8rem;color:var(--muted);margin-bottom:14px;">Adjust based on your outlook.</p>',
    '<p style="font-size:0.8rem;color:var(--muted);margin-bottom:14px;">These apply to every child. Each child\'s own investments and expected return are set in their card above.</p>')

# ---------- results: per-child section + SIP card wording ----------
rep('<div class="section-title" style="margin-top:48px;">Your Education Dashboard</div>',
    '<div class="section-title" style="margin-top:48px;">Your Education Dashboard</div>\n    <div id="perChildOut"></div>')
rep('<div class="sip-label">Monthly SIP Needed to Bridge the Gap</div>', '<div class="sip-label" id="sip_label">Monthly SIP Needed to Bridge the Gap</div>')
a = s.index('<div class="sip-desc">'); b = s.index('</div>', a) + len('</div>')
s = s[:a] + '<div class="sip-desc" id="sip_desc">Each child\'s SIP starts today and runs until that child\'s education begins, at the return you set for that child.</div>' + s[b:]
rep('<div class="sip-tag">per month starting today</div>',
    '<div class="sip-tag">per month starting today</div>\n        <div class="sip-tag" id="t_lump_line" style="margin-top:12px;font-size:0.8rem;letter-spacing:0.5px;"></div>')
rep('What your invested surplus could grow to by the first education year, compounded at each asset\'s own return rate',
    'What each child\'s existing investments could grow to by the time their education starts, at each investment\'s own return')

# ---------- child card: per-child return + investments ----------
rep("""    <input type="hidden" id="loc_val_${id}" value="india">""",
"""    <div class="pc-sub">Saving for this child</div>
    <div class="field"><label>Expected return on new investments</label><div class="inp-group"><div class="inp-wrap narrow"><input type="text" inputmode="decimal" id="sipret_${id}" value="11"></div><span class="inp-short">% a year</span></div></div>
    <div class="inv-head">Already invested for this child<span>Amount today · expected return % a year · still adding each month (optional)</span></div>
    <div id="invs_${id}"></div>
    <button type="button" class="btn-add-row" onclick="addChildInv(${id})">+ Add another investment</button>
    <p class="inv-fv" id="invfv_${id}"></p>
    <input type="hidden" id="loc_val_${id}" value="india">""")
rep("""  document.getElementById('children_container').insertAdjacentHTML('beforeend', html);
}""", """  document.getElementById('children_container').insertAdjacentHTML('beforeend', html);
  addChildInv(id);
  refreshChild(id);
}""")
rep("""    children.push({name, cage, startAge, dur, cost, loc, id});""",
    """    children.push({name: (document.getElementById('name_'+id)?.value || '').trim() || ('Child ' + (children.length + 1)), cage, startAge, dur, cost, loc, id, sipRet: gv('sipret_'+id)/100, invs: getChildInvs(id)});""")

# ---------- calculation: replace the shared-pot maths with per-child plans ----------
a = s.index("  const sipRet = gv('sip_ret') / 100;")
end_marker = "  const sipNeeded = fvGapAtStart > 0 ? pmtForFV(fvGapAtStart, monthlyRateDisc, sipMonthsDisc) : 0;"
b = s.index(end_marker, a) + len(end_marker)
new_calc = r"""  const usdInr = gv('usd_inr');
  const children = getChildren();
  if(children.length === 0){ return; }
  const thisYear = new Date().getFullYear();
  const plans = children.map(function(c, ci){ return planChild(c, ci, eduInfl, usdInr, thisYear); });
  let totalCostToday = 0, totalInflatedCost = 0, gap = 0, totalSavings = 0, totalSavingsFVAtStart = 0, sipNeeded = 0, lumpTotal = 0;
  let earliestYearsFromNow = Infinity;
  const allRows = [];
  plans.forEach(function(p){
    totalCostToday += p.costToday; totalInflatedCost += p.inflated; gap += p.gapFuture;
    totalSavings += p.investedToday; totalSavingsFVAtStart += p.fvAtStart;
    sipNeeded += p.sip; lumpTotal += p.lump;
    if(p.T < earliestYearsFromNow) earliestYearsFromNow = p.T;
    p.rows.forEach(function(r){ allRows.push(r); });
  });
  if(earliestYearsFromNow === Infinity) earliestYearsFromNow = 0;
  // Family view by calendar year (charts). Funded/gap are summed child by child, so one
  // child's savings never "pay" for another child's fees.
  var yfns = Array.from(new Set(allRows.map(function(r){ return r.yearsFromNow; }))).sort(function(x,y){ return x-y; });
  var simRows = yfns.map(function(k){
    var o = {yearsFromNow:k, year:thisYear+k, cost:0, funded:0, gapAmt:0, opening:0, closing:0};
    plans.forEach(function(p){
      var v = p.valueAt(k); o.opening += v.before; o.closing += v.after;
      p.rows.forEach(function(r){ if(r.yearsFromNow === k){ o.cost += r.cost; o.funded += Math.min(r.cost, r.opening); o.gapAmt += r.short; } });
    });
    return o;
  });
  // Year table: one row per child per education year, expandable into that child's investments
  var multiChild = plans.length > 1;
  var eduAccentColors = ['#2a9d8f','#1a3a5c','#e76f51','#457b9d','#6d6875','#2d6a4f','#e9c46a','#264653'];
  var tRows = allRows.slice().sort(function(x,y){ return x.yearsFromNow - y.yearsFromNow || x.childIdx - y.childIdx; });
  var colSpan = multiChild ? 3 : 2;
  var hdr = '<th>Year</th><th style="text-align:center;">Age</th>' + (multiChild ? '<th>Child</th>' : '') + '<th style="text-align:right;">Ed. Cost</th><th style="text-align:right;">Corpus Before</th><th style="text-align:right;">Corpus After</th>';
  var tHtml = '<p style="font-size:0.78rem;color:#5a7d8a;margin:0 0 8px;">Each child’s existing investments only — the SIP or lump sum suggested above is not included here.</p><table class="year-table"><thead><tr>'+hdr+'</tr></thead><tbody>';
  tRows.forEach(function(r,i){
    var key = r.year + '-' + r.childIdx;
    var bg = i%2===0 ? '#fff9f7' : '#ffffff';
    var closingCol = r.closing <= 0 ? '#D94040' : '#1a3a5c';
    tHtml += '<tr onclick="toggleEduDetail(\''+key+'\')" style="background:'+bg+';cursor:pointer;">'
      +'<td style="padding:7px 10px;font-weight:700;color:#7b3a2a;white-space:nowrap;"><span id="echev-'+key+'" style="margin-right:5px;font-size:0.65rem;cursor:pointer;">▶</span>'+r.year+'</td>'
      +'<td style="padding:7px 10px;text-align:center;">'+r.age+'</td>'
      +(multiChild ? '<td style="padding:7px 10px;font-size:0.82rem;color:var(--muted);">'+eduEsc(r.child)+'</td>' : '')
      +'<td style="padding:7px 10px;text-align:right;color:#bf360c;font-weight:700;">'+fmtBig(r.cost)+'</td>'
      +'<td style="padding:7px 10px;text-align:right;">'+fmtBig(r.opening)+'</td>'
      +'<td style="padding:7px 10px;text-align:right;font-weight:800;color:'+closingCol+';">'+fmtBig(r.closing)+'</td></tr>';
    r.assets.forEach(function(a,ai){
      if(a.opening <= 0 && a.withdrawn <= 0) return;
      var ac = eduAccentColors[ai % eduAccentColors.length];
      tHtml += '<tr class="edu-det edu-det-'+key+'" style="display:none;background:#fdf3f0;border-left:4px solid '+ac+';">'
        +'<td style="padding:4px 10px 4px 24px;font-size:0.8rem;font-weight:700;color:#1a3a5c;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+ac+';margin-right:6px;vertical-align:middle;"></span>'+eduEsc(a.name)+'</td><td></td>'
        +(multiChild ? '<td></td>' : '')
        +'<td style="padding:4px 10px;text-align:right;font-size:0.8rem;color:#bf360c;font-weight:600;">'+fmtBig(a.withdrawn)+'</td>'
        +'<td style="padding:4px 10px;text-align:right;font-size:0.8rem;font-weight:600;color:'+ac+';">'+fmtBig(a.opening)+'</td>'
        +'<td style="padding:4px 10px;text-align:right;font-size:0.8rem;font-weight:800;color:'+ac+';">'+fmtBig(a.closing)+'</td></tr>';
    });
  });
  var totalCostAll = allRows.reduce(function(t,r){ return t+r.cost; }, 0);
  var finalCorpus = plans.reduce(function(t,p){ return t + (p.rows.length ? p.rows[p.rows.length-1].closing : 0); }, 0);
  tHtml += '<tr class="total-row"><td colspan="'+colSpan+'" style="padding:9px 12px;font-weight:800;">Total</td>'
    +'<td style="padding:9px 12px;text-align:right;font-weight:800;color:#bf360c;">'+fmtBig(totalCostAll)+'</td><td></td>'
    +'<td style="padding:9px 12px;text-align:right;font-weight:800;">'+fmtBig(finalCorpus)+'</td></tr></tbody></table>';
  document.getElementById('yearTableContainer').innerHTML = tHtml;
  const fundedPct = totalInflatedCost > 0 ? Math.min(100, Math.max(0, (totalInflatedCost - gap) / totalInflatedCost * 100)) : 0;
  const gapPct = 100 - fundedPct;"""
s = s[:a] + new_calc + s[b:]

# results text that used the old single rate
rep("  document.getElementById('ret_rate_display').textContent = gv('sip_ret');",
    """  renderPerChild(plans, lumpTotal);
  document.getElementById('sip_label').textContent = plans.length > 1 ? 'Total Monthly SIP Needed (all children)' : 'Monthly SIP Needed to Bridge the Gap';
  document.getElementById('t_lump_line').textContent = lumpTotal > 0 ? 'or a one-time lump sum of ' + fmtBig(lumpTotal) + ' invested today' : '';""")
# bar chart: per-child funded / gap
rep("  const fundedData = simRows.map(r => Math.min(r.cost, r.opening));", "  const fundedData = simRows.map(r => r.funded);")
rep("  const gapData = simRows.map(r => Math.max(0, r.cost - r.opening));", "  const gapData = simRows.map(r => r.gapAmt);")

# ---------- new helper functions + start-up ----------
helpers = r"""
// ── Per-child planning (Oct 2026): each child has their own expected return on new
// investments and their own existing investments; results give each child's monthly SIP
// (from today until that child's education starts) or one-time lump sum (invested today).
var childInvSeq = 0;
var CHILD_COLORS = ['#2a9d8f','#c9a84c','#1a3a5c','#9B59B6'];
function eduEsc(t){ return String(t==null?'':t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function addChildInv(id){
  childInvSeq++; var n = childInvSeq;
  var row = document.createElement('div'); row.className = 'inv-row';
  row.innerHTML =
    '<input type="text" class="inv-name" placeholder="e.g. Mutual fund, PPF, Sukanya" aria-label="Investment name">'+
    '<div class="inp-wrap w-amt"><span class="sym">₹</span><input type="text" inputmode="numeric" class="inv-amt" id="iva_'+n+'" placeholder="Amount today" aria-label="Amount invested today" oninput="handleInput(this)"></div>'+
    '<div class="inp-wrap w-rate"><input type="text" inputmode="decimal" class="inv-rate" value="11" aria-label="Expected return, % a year" style="padding-left:10px;padding-right:22px;text-align:center;"><span class="sym" style="left:auto;right:8px;">%</span></div>'+
    '<div class="inp-wrap w-mon"><span class="sym">₹</span><input type="text" inputmode="numeric" class="inv-mon" id="ivm_'+n+'" placeholder="Adding / month" aria-label="Still adding each month" oninput="handleInput(this)"></div>'+
    '<button type="button" class="btn-rm-dyn" onclick="removeChildInv(this)" aria-label="Remove this investment">✕</button>';
  document.getElementById('invs_'+id).appendChild(row);
}
function removeChildInv(btn){
  var card = btn.closest('.child-card'); btn.closest('.inv-row').remove();
  if(card) refreshChild(card.id.replace('child_',''));
}
function numIn(el){ return el ? (parseFloat(String(el.value).replace(/[^0-9.]/g,''))||0) : 0; }
function getChildInvs(id){
  var out = [];
  document.querySelectorAll('#invs_'+id+' .inv-row').forEach(function(row){
    var val = numIn(row.querySelector('.inv-amt')), contrib = numIn(row.querySelector('.inv-mon'));
    if(val <= 0 && contrib <= 0) return;
    out.push({ name: (row.querySelector('.inv-name').value||'').trim() || 'Investment', val: val, rate: numIn(row.querySelector('.inv-rate'))/100, contrib: contrib });
  });
  return out;
}
function invFVAt(invs, k, T){
  // value of a child's investments k years from now, with monthly additions only until education starts (T)
  return invs.reduce(function(t,a){ var cy = Math.min(k, T); return t + eduAssetFV(a.val, a.rate, cy > 0 ? a.contrib : 0, cy, k, true); }, 0);
}
function refreshChild(id){
  var out = document.getElementById('invfv_'+id); if(!out) return;
  var cage = gv('cage_'+id), sa = gv('start_age_'+id), T = Math.max(0, sa - cage);
  var invs = getChildInvs(id);
  if(!invs.length){ out.textContent = ''; return; }
  var nm = ((document.getElementById('name_'+id)||{}).value||'').trim() || 'this child';
  out.textContent = T > 0 ? ('These could grow to ' + fmtBig(invFVAt(invs, T, T)) + ' by ' + (new Date().getFullYear()+T) + ', when ' + nm + '’s education starts.') : 'Education starts this year, so these count at today’s value.';
}
function planChild(c, ci, infl, usdInr, thisYear){
  var T = Math.max(0, Math.round(c.startAge - c.cage)), dur = Math.max(1, Math.round(c.dur || 1));
  var rm = (c.sipRet || 0) / 12;
  var costINR = c.loc === 'abroad' ? c.cost * usdInr : c.cost;
  var invs = c.invs;
  var rem = invs.map(function(a){ return a.val; }), simY = 0, rows = [], costToday = 0, inflated = 0;
  for(var y = 0; y < dur; y++){
    var k = T + y, el = k - simY, left = Math.max(0, T - simY);
    var open = invs.map(function(a, i){ var con = left > 0 ? a.contrib : 0; return eduAssetFV(rem[i], a.rate, con, con > 0 ? left : 0, el, true); });
    var tot = open.reduce(function(t,v){ return t+v; }, 0);
    var cost = costINR * Math.pow(1 + infl, k);
    costToday += costINR; inflated += cost;
    var det = open.map(function(o, i){ var w = tot > 0 ? Math.min(o, cost * o / tot) : 0; return {name: invs[i].name, opening: o, withdrawn: w, closing: o - w}; });
    det.forEach(function(d, i){ rem[i] = d.closing; });
    rows.push({child: c.name, childIdx: ci, yearsFromNow: k, year: thisYear + k, age: Math.round(c.cage + k), cost: cost, opening: tot,
               closing: det.reduce(function(t,d){ return t + d.closing; }, 0), short: Math.max(0, cost - tot), assets: det});
    simY = k;
  }
  var gapFuture = rows.reduce(function(t,r){ return t + r.short; }, 0);
  // the gap, valued at the year education starts, at this child's expected return
  var gAtStart = rows.reduce(function(t,r){ return t + r.short / Math.pow(1 + rm, 12 * (r.yearsFromNow - T)); }, 0);
  var n = 12 * T;
  var sip = gAtStart > 0 && n > 0 ? pmtForFV(gAtStart, rm, n) : 0;
  var lump = gAtStart > 0 ? gAtStart / Math.pow(1 + rm, n) : 0;
  var last = rows[rows.length-1];
  return {
    name: c.name, color: CHILD_COLORS[(Number(c.id)-1) % CHILD_COLORS.length], T: T, dur: dur, startYear: thisYear + T, rate: c.sipRet,
    costToday: costToday, inflated: inflated, investedToday: invs.reduce(function(t,a){ return t + a.val; }, 0),
    fvAtStart: invFVAt(invs, T, T), gapFuture: gapFuture, sip: sip, sipPossible: n > 0, lump: lump, rows: rows,
    valueAt: function(k){
      if(k < T){ var v = invFVAt(invs, k, T); return {before: v, after: v}; }
      for(var i = 0; i < rows.length; i++){ if(rows[i].yearsFromNow === k) return {before: rows[i].opening, after: rows[i].closing}; }
      return {before: last.closing, after: last.closing};
    }
  };
}
function renderPerChild(plans, lumpTotal){
  var pct = function(r){ return (Math.round(r * 1000) / 10).toString().replace(/\.0$/, '') + '%'; };
  var h = '<div class="pc-grid">' + plans.map(function(p){
    var need;
    if(p.gapFuture <= 0.5){
      need = '<p class="pc-ok">✓ Fully covered by the investments you already have for ' + eduEsc(p.name) + '.</p>';
    } else {
      need = '<div class="pc-need">'
        + (p.sipPossible
            ? '<div><span>Monthly SIP</span><b>' + fmtBig(p.sip) + '</b><small>from now until ' + p.startYear + '</small></div>'
            : '<div class="na"><span>Monthly SIP</span><b>Not possible</b><small>education starts this year</small></div>')
        + '<div class="or">or</div>'
        + '<div><span>One-time lump sum</span><b>' + fmtBig(p.lump) + '</b><small>invested today</small></div></div>'
        + '<p class="pc-assume">Both assume ' + pct(p.rate) + ' a year on new investments. Illustrative only — returns are not guaranteed.</p>';
    }
    return '<div class="pc-card" style="border-top-color:' + p.color + ';">'
      + '<h4>' + eduEsc(p.name) + '</h4>'
      + '<p class="pc-when">' + (p.T > 0 ? 'Education starts in ' + p.startYear + ' (' + p.T + ' yr' + (p.T === 1 ? '' : 's') + ' away)' : 'Education starts this year') + ' · ' + p.dur + ' yr' + (p.dur === 1 ? '' : 's') + '</p>'
      + '<dl><div><dt>Cost in today’s money</dt><dd>' + fmtBig(p.costToday) + '</dd></div>'
      + '<div><dt>Cost with inflation</dt><dd>' + fmtBig(p.inflated) + '</dd></div>'
      + '<div><dt>Your investments could grow to</dt><dd>' + fmtBig(p.fvAtStart) + '</dd></div>'
      + '<div><dt>Funding gap</dt><dd class="' + (p.gapFuture > 0.5 ? 'gap' : '') + '">' + (p.gapFuture > 0.5 ? fmtBig(p.gapFuture) : '₹0') + '</dd></div></dl>'
      + need + '</div>';
  }).join('');
  if(plans.length > 1){
    var sipTot = plans.reduce(function(t,p){ return t + p.sip; }, 0);
    h += '<div class="pc-total"><span>All children together:</span> <span><b>' + fmtBig(sipTot) + '</b> a month in SIPs</span> <span>or</span> <span><b>' + fmtBig(lumpTotal) + '</b> as a lump sum today</span></div>';
  }
  document.getElementById('perChildOut').innerHTML = h + '</div>';
}
"""
init_old = "// Initialize\nrecalcSavings();\naddChild();\nrecalcEduFVs();"
a = s.index(init_old)
b = s.index("});\n", s.index("['sav1','sav2','sav3','sav4'].forEach", a)) + len("});\n")
s = s[:a] + helpers + """// Initialize — the shared "existing invested" card is gone; these now do nothing
recalcSavings = function(){};
recalcEduFVs = function(){};
addChild();
document.getElementById('children_container').addEventListener('input', function(e){
  var card = e.target.closest('.child-card'); if(card) refreshChild(card.id.replace('child_',''));
});
""" + s[b:]
# old toggle used a numeric year; keys are now strings like "2034-0"
rep("function toggleEduDetail(yr){", "function toggleEduDetail(yr){ yr = String(yr);")
open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
