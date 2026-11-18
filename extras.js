/* Add-on for the Seating Cargo report. Does not modify the original page logic:
   it wraps renderSelectedMonth() and adds data checks, month comparison, share/export tools. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),N=n=>Number(n).toLocaleString();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const st=document.createElement('style');st.textContent=`
.xt-tag{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700}
.xt-err{background:#FEE2E2;color:#991B1B}.xt-warn{background:#FEF3C7;color:#92400E}.xt-info{background:#DBEAFE;color:#1E40AF}
.xt-ok{background:#ECFDF5;border:1px solid #10B981;color:#065F46;padding:10px 14px;border-radius:8px;font-weight:600}
.xt-bad{background:#FFF7ED;border:1px solid #F59E0B;color:#7C2D12;padding:10px 14px;border-radius:8px;font-weight:600;margin-bottom:10px}
.xt-up{color:#B91C1C;font-weight:700}.xt-dn{color:#15803D;font-weight:700}
#xtSearch{width:100%;padding:9px 12px;border:1px solid #CBD5E1;border-radius:6px;font-size:14px;margin-bottom:8px}
@media print{.header,.upload-zone,.controls,details,.btn-row,#xtras .btn-row,#xtSearch{display:none!important}body{padding:0;background:#fff}.card{box-shadow:none;break-inside:avoid}}`;
document.head.append(st);

const pd=s=>{s=String(s||'').trim();const y=v=>v.length==2?2000+ +v:+v;
 let m=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);if(m)return Date.UTC(+m[1],+m[2]-1,+m[3]);
 m=s.match(/^(\d{1,2})[-/\s.]([A-Za-z]{3,9})[-/\s.,]+(\d{2,4})$/);
 if(m){const i=MONTHS_SHORT.findIndex(x=>x.toLowerCase()===m[2].slice(0,3).toLowerCase());return i<0?null:Date.UTC(y(m[3]),i,+m[1])}
 m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);return m?Date.UTC(y(m[3]),+m[2]-1,+m[1]):null};

function checks(recs){
 const out=[],add=(lv,i,r,msg)=>out.push({lv,sl:i+1,row:r.excelRow||'—',t:r.transportNo||'—',msg}),seen=new Map();
 recs.forEach((r,i)=>{
  if(!r.transportNo)add('err',i,r,'Transport number is blank');
  else{const k=r.transportNo.toUpperCase().replace(/[\s-]/g,'')+'|'+r.cargoIn;
   if(seen.has(k))add('err',i,r,`Duplicate of SL ${seen.get(k)} (same truck, same date)`);else seen.set(k,i+1)}
  if(!(r.billAmount>0))add('err',i,r,'Bill amount is zero or blank');
  if(!r.purpose)add('warn',i,r,'Purpose / Buyer is blank');
  if(!r.source)add('warn',i,r,'Source (vendor) is blank');
  if(!r.billUnit)add('warn',i,r,'Bill unit is blank');
  if(!r.contact)add('warn',i,r,'Contact number is blank');
  else{const bad=r.contact.split(/[\/,;\s]+/).filter(t=>/\d/.test(t)).map(t=>t.replace(/[^\d+]/g,'').replace(/^\+?880/,'0')).filter(t=>!/^01[3-9]\d{8}$/.test(t));
   if(bad.length)add('warn',i,r,`Mobile number looks invalid: ${bad.join(', ')} (expected 01XXXXXXXXX)`)}
  const a=pd(r.cargoIn),b=pd(r.cargoOut);
  if(a===null)add('err',i,r,r.cargoIn?`Cargo-in date not readable ("${r.cargoIn}")`:'Cargo-in date is blank (merged cell? keep "Fill down merged Cargo-in Dates" ticked)');
  if(!r.cargoOut)add('info',i,r,'No cargo-out date — still holding?');
  else if(b===null)add('warn',i,r,`Cargo-out date not readable ("${r.cargoOut}")`);
  else if(a!==null){const d=Math.round((b-a)/864e5);
   if(d<0)add('err',i,r,'Cargo-out date is before cargo-in date');
   else if(r.stayDay!==d&&r.stayDay!==d+1)add('warn',i,r,`Stay day ${r.stayDay} does not match the dates (${d}-day gap)`)}
 });
 const g=new Map();
 recs.forEach((r,i)=>{if(r.stayDay>0&&r.billAmount>0){const k=r.source.toLowerCase();if(!g.has(k))g.set(k,[]);g.get(k).push({i,r,rate:Math.round(r.billAmount/r.stayDay)})}});
 g.forEach(l=>{if(l.length<3)return;const c=new Map();l.forEach(x=>c.set(x.rate,(c.get(x.rate)||0)+1));
  const mode=[...c.entries()].sort((a,b)=>b[1]-a[1])[0][0];
  l.forEach(x=>{if(x.rate!==mode)add('info',x.i,x.r,`Rate ${N(x.rate)}/day differs from usual ${N(mode)}/day for ${x.r.source}`)})});
 return out.sort((a,b)=>a.sl-b.sl)}

const ord={err:0,warn:1,info:2},lbl={err:'ERROR',warn:'CHECK',info:'NOTE'};
function monthTable(){
 const m=new Map();
 allRecords.forEach(r=>{if(/^(Other|Unknown|Unparsed)$/.test(r.monthKey))return;if(!m.has(r.monthKey))m.set(r.monthKey,{k:r.monthKey,l:r.fullMonth,t:0,d:0,c:0});const o=m.get(r.monthKey);o.t++;o.d+=r.stayDay;o.c+=r.billAmount});
 return [...m.values()].sort((a,b)=>a.k.localeCompare(b.k))}
const pct=(a,b)=>b?`<span class="${a>=b?'xt-up':'xt-dn'}">${a>=b?'▲':'▼'} ${Math.abs((a-b)/b*100).toFixed(1)}%</span>`:'—';
const recon=()=>{const c=allRecords.reduce((s,r)=>s+r.billAmount,0),t=allRecords.length,raw=(typeof auditLog==='object'&&auditLog.rawTotalBill)||0,ok=Math.abs(c-raw)<0.01;
 return `<p class="${ok?'xt-ok':'xt-bad'}" style="margin:10px 0">All records in this sheet (every month, incl. undated): <b>${t}</b> trips, BDT <b>${N(c)}</b>${raw?` — ${ok?'matches':'DIFFERS from'} the raw sheet bill total BDT ${N(raw)}.`:''}</p>`};
let trend=null;
function build(){
 let box=$('xtras');if(!box){box=document.createElement('div');box.id='xtras';$('outputSection').append(box)}
 const R=activeMonthRecords,iss=checks(R),cnt={err:0,warn:0,info:0};iss.forEach(x=>cnt[x.lv]++);
 let h=`<div class="card"><h2>6. Data Quality Check (${esc(activeMonthLabel)})</h2>`;
 h+=!iss.length?`<div class="xt-ok">All ${R.length} records passed every check — no duplicates, blanks, bad dates or odd rates.</div>`
  :`<div class="${cnt.err?'xt-bad':'xt-ok'}">${R.length} records checked: <b>${cnt.err}</b> errors, <b>${cnt.warn}</b> to check, <b>${cnt.info}</b> notes. SL = row number in the log below; Excel Row = row in your worksheet.</div>
  <div style="overflow-x:auto"><table><thead><tr><th class="ctr">SL</th><th class="ctr">Excel Row</th><th>Level</th><th>Transport No.</th><th>Issue</th></tr></thead><tbody>${[...iss].sort((a,b)=>ord[a.lv]-ord[b.lv]||a.sl-b.sl).slice(0,200).map(x=>`<tr><td class="ctr">${x.sl}</td><td class="ctr">${x.row}</td><td><span class="xt-tag xt-${x.lv}">${lbl[x.lv]}</span></td><td>${esc(x.t)}</td><td>${esc(x.msg)}</td></tr>`).join('')}</tbody></table></div>`;
 h+='</div>';
 const ms=monthTable();
 if(ms.length>1){h+=`<div class="card"><h2>7. Month-wise Comparison (all months in this sheet)</h2><div style="overflow-x:auto"><table><thead><tr><th>Month</th><th class="ctr">Trips</th><th class="ctr">Stay Days</th><th class="num">Cost (BDT)</th><th class="num">Avg / Trip</th><th class="num">Cost vs Prev</th><th class="num">Trips vs Prev</th></tr></thead><tbody>${ms.map((o,i)=>`<tr><td><b>${esc(o.l)}</b></td><td class="ctr">${o.t}</td><td class="ctr">${o.d}</td><td class="num">${N(o.c)}</td><td class="num">${N(Math.round(o.c/o.t))}</td><td class="num">${i?pct(o.c,ms[i-1].c):'—'}</td><td class="num">${i?pct(o.t,ms[i-1].t):'—'}</td></tr>`).join('')}</tbody></table></div>${recon()}<div class="chart-wrap" style="height:280px;margin-top:12px"><canvas id="xtTrend"></canvas></div></div>`}
 h+=`<div class="card"><h2>8. Quick Share &amp; Export</h2><div class="btn-row">
 <button class="btn-copy" id="xtWa">Copy WhatsApp Summary</button>
 <button class="btn-primary" id="xtPng">Download Summary Image (PNG)</button>
 <button class="btn-secondary" id="xtCsv">Download Log (CSV)</button>
 <button class="btn-secondary" id="xtPrint">Print / Save as PDF</button></div></div>`;
 box.innerHTML=h;
 if(trend){trend.destroy();trend=null}
 if(ms.length>1)trend=new Chart($('xtTrend').getContext('2d'),{type:'bar',data:{labels:ms.map(o=>o.l),datasets:[{label:'Cost (BDT)',data:ms.map(o=>o.c),backgroundColor:'#2C4D75',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,animation:false,layout:{padding:{top:22}},plugins:{legend:{display:false},title:{display:true,text:'Total Billing Cost by Month (BDT)',color:'#1B365D',font:{size:13.5,weight:'bold'}},datalabels:{anchor:'end',align:'top',font:{size:10.5,weight:'bold'},formatter:v=>N(v)}},scales:{y:{beginAtZero:true,grace:'15%'},x:{grid:{display:false}}}}});
 $('xtWa').onclick=()=>navigator.clipboard.writeText(wa()).then(()=>showToast('WhatsApp summary copied!'));
 $('xtPng').onclick=png;$('xtCsv').onclick=csv;$('xtPrint').onclick=()=>window.print();
 let s=$('xtSearch');
 if(!s){s=document.createElement('input');s.id='xtSearch';s.placeholder='Search this log (truck, vendor, buyer, date…)';$('logTableWrap').before(s);s.oninput=filt}
 filt()}
function filt(){const q=($('xtSearch').value||'').toLowerCase();document.querySelectorAll('#logTableWrap tbody tr:not(.tot-row)').forEach(tr=>{tr.style.display=!q||tr.textContent.toLowerCase().includes(q)?'':'none'})}
function sums(){const R=activeMonthRecords;return{R,tot:R.reduce((s,r)=>s+r.billAmount,0),days:R.reduce((s,r)=>s+r.stayDay,0),g:[['Cost by Audit Purpose',groupBy(R,'purpose')],['Vendor Share',groupBy(R,'source')],['Billing Unit',groupBy(R,'billUnit')]]}}
function wa(){const{R,tot,days,g}=sums();const ln=l=>l.map(x=>`• ${x.name}: BDT ${N(x.amount)} (${x.trips})`).join('\n');
 return `*Temporary Cargo Holding – ${activeMonthLabel}*\n\n🚛 Trips: *${R.length}*\n💰 Total Cost: *BDT ${N(tot)}*\n📅 Stay Days: *${days}* (Avg ${R.length?(days/R.length).toFixed(2):0})\n\n*${g[0][0]}*\n${ln(g[0][1])}\n\n*${g[1][0]}*\n${ln(g[1][1])}\n\n*${g[2][0]}*\n${ln(g[2][1])}`}
function dl(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
const fname=()=>'Cargo_'+activeMonthLabel.replace(/\s+/g,'_');
function csv(){const H=['SL','Excel Row','Cargo In','Bring For','Transport No','Contact','Purpose/Buyer','Source','Cargo Out','Stay Day','Bill Amount','Bill Unit'];
 const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
 const rows=activeMonthRecords.map((r,i)=>[i+1,r.excelRow||'',r.cargoIn,r.bringFor,r.transportNo,r.contact,r.purpose,r.source,r.cargoOut,r.stayDay,r.billAmount,r.billUnit].map(q).join(','));
 dl(new Blob(['\ufeff'+[H.map(q).join(',')].concat(rows).join('\r\n')],{type:'text/csv;charset=utf-8'}),fname()+'.csv')}
function png(){const{R,tot,days,g}=sums();if(!R.length)return;
 const W=1080,RH=56,F='Segoe UI,Arial,sans-serif';
 const H=420+g.reduce((h,s)=>h+90+Math.min(s[1].length,6)*RH,0)+70;
 const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 x.fillStyle='#F1F5F9';x.fillRect(0,0,W,H);
 const gr=x.createLinearGradient(0,0,W,0);gr.addColorStop(0,'#1B365D');gr.addColorStop(1,'#2C4D75');x.fillStyle=gr;x.fillRect(0,0,W,190);
 x.fillStyle='#fff';x.font='bold 46px '+F;x.fillText('Temporary Cargo Holding Summary',50,85);
 x.fillStyle='#F5B914';x.font='bold 36px '+F;x.fillText(activeMonthLabel,50,145);
 const fit=(t,w,sz)=>{do{x.font='bold '+sz+'px '+F;sz-=2}while(x.measureText(t).width>w&&sz>12)};
 [['TRIPS',R.length],['TOTAL COST','BDT '+N(tot)],['STAY DAYS',days],['AVG DAYS',(days/R.length).toFixed(2)]].forEach((v,i)=>{
  const bx=50+i*250;x.fillStyle='#fff';x.beginPath();x.roundRect(bx,215,230,150,18);x.fill();
  x.fillStyle='#64748B';x.font='bold 20px '+F;x.fillText(v[0],bx+18,255);
  x.fillStyle='#1B365D';fit(String(v[1]),194,38);x.fillText(String(v[1]),bx+18,320)});
 let y=420;const col=['#1B365D','#2B7A78','#D97706','#3B82F6','#6366F1','#10B981'];
 g.forEach(([t,l])=>{x.fillStyle='#1B365D';x.font='bold 30px '+F;x.fillText(t,50,y+34);x.fillStyle='#F5B914';x.fillRect(50,y+46,120,4);y+=90;
  l.slice(0,6).forEach((it,i)=>{const p=tot?it.amount/tot:0;
   x.fillStyle='#1E293B';fit(it.name,260,26);x.fillText(it.name,50,y+34);
   x.fillStyle='#E2E8F0';x.fillRect(330,y+12,430,28);x.fillStyle=col[i%6];x.fillRect(330,y+12,Math.max(4,430*p),28);
   x.fillStyle='#1E293B';x.font='bold 22px '+F;x.textAlign='right';x.fillText(`${N(it.amount)}  (${(p*100).toFixed(1)}%)`,1030,y+34);x.textAlign='left';y+=RH})});
 x.fillStyle='#64748B';x.font='20px '+F;x.fillText('Amounts in BDT • '+new Date().toLocaleDateString('en-GB'),50,H-28);
 c.toBlob(b=>dl(b,fname()+'_Summary.png'),'image/png')}

const orig=window.renderSelectedMonth;
window.renderSelectedMonth=function(){orig.apply(this,arguments);try{build()}catch(e){console.error('extras',e)}};
window.XT={checks,pd,wa};
const l=document.createElement('link');l.rel='apple-touch-icon';l.href='icons/logo-192.png';document.head.append(l);
const t=document.createElement('meta');t.name='theme-color';t.content='#1B365D';document.head.append(t);
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
