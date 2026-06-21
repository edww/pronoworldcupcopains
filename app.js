const STORAGE_KEY = 'prono-world-cup-copains-v1';
let state = load();
let deferredPrompt = null;

function load(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {matches:[], picks:[]}; }
  catch { return {matches:[], picks:[]}; }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); }
function id(){ return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()); }
function outcome(a,b){ return Number(a)===Number(b) ? 'draw' : Number(a)>Number(b) ? 'A' : 'B'; }
function points(pick, match){
  if(match.realA === null || match.realA === undefined || match.realB === null || match.realB === undefined) return 0;
  const pa=Number(pick.a), pb=Number(pick.b), ra=Number(match.realA), rb=Number(match.realB);
  if(pa===ra && pb===rb) return 3;
  return outcome(pa,pb)===outcome(ra,rb) ? 1 : 0;
}
function fmtDate(value){ if(!value) return 'Date non renseignée'; return new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'}); }

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab,.view').forEach(el=>el.classList.remove('active'));
  btn.classList.add('active'); document.getElementById(btn.dataset.view).classList.add('active');
}));

document.getElementById('matchForm').addEventListener('submit', e=>{
  e.preventDefault();
  state.matches.push({id:id(), teamA:teamA.value.trim(), teamB:teamB.value.trim(), date:matchDate.value, realA:null, realB:null});
  e.target.reset(); save();
});

document.getElementById('pickForm').addEventListener('submit', e=>{
  e.preventDefault();
  const matchId = matchSelect.value;
  const name = playerName.value.trim();
  state.picks = state.picks.filter(p=>!(p.matchId===matchId && p.player.toLowerCase()===name.toLowerCase()));
  state.picks.push({id:id(), matchId, player:name, a:Number(pickA.value), b:Number(pickB.value)});
  pickA.value=''; pickB.value=''; save();
});

document.getElementById('exportBtn').addEventListener('click',()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pronos-copains.json'; a.click();
});
document.getElementById('importFile').addEventListener('change', async e=>{
  const file=e.target.files[0]; if(!file) return;
  state=JSON.parse(await file.text()); save();
});
document.getElementById('resetBtn').addEventListener('click',()=>{
  if(confirm('Tout effacer sur ce téléphone ?')){ state={matches:[],picks:[]}; save(); }
});

window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; installBtn.hidden=false; });
installBtn.addEventListener('click', async()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; installBtn.hidden=true; }});
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }

function render(){ renderMatches(); renderSelect(); renderPicks(); renderRanking(); }
function renderMatches(){
  const list=document.getElementById('matchList'); list.innerHTML='';
  if(!state.matches.length){ list.innerHTML='<div class="card"><p class="muted">Aucun match pour le moment.</p></div>'; return; }
  const tpl=document.getElementById('matchTemplate');
  state.matches.forEach(m=>{
    const node=tpl.content.cloneNode(true);
    node.querySelector('h3').textContent=`${m.teamA} - ${m.teamB}`;
    node.querySelector('.date').textContent=fmtDate(m.date);
    node.querySelector('.realA').value=m.realA ?? '';
    node.querySelector('.realB').value=m.realB ?? '';
    node.querySelector('.saveResult').onclick=()=>{
      const card=event.target.closest('.card'); m.realA=Number(card.querySelector('.realA').value); m.realB=Number(card.querySelector('.realB').value); save();
    };
    node.querySelector('.delete').onclick=()=>{ state.matches=state.matches.filter(x=>x.id!==m.id); state.picks=state.picks.filter(p=>p.matchId!==m.id); save(); };
    list.appendChild(node);
  });
}
function renderSelect(){
  matchSelect.innerHTML='';
  state.matches.forEach(m=>{ const opt=document.createElement('option'); opt.value=m.id; opt.textContent=`${m.teamA} - ${m.teamB}`; matchSelect.appendChild(opt); });
}
function renderPicks(){
  const list=document.getElementById('pickList'); list.innerHTML='';
  const byMatch = state.matches.map(m=>({match:m,picks:state.picks.filter(p=>p.matchId===m.id)}));
  if(!state.picks.length){ list.innerHTML='<div class="card"><p class="muted">Aucun prono pour le moment.</p></div>'; return; }
  byMatch.forEach(group=>{
    if(!group.picks.length) return;
    const card=document.createElement('div'); card.className='card'; card.innerHTML=`<h2>${group.match.teamA} - ${group.match.teamB}</h2>`;
    group.picks.forEach(p=>{
      const div=document.createElement('div'); div.className='pick';
      div.innerHTML=`<div><strong>${p.player}</strong><p class="muted">${p.a} - ${p.b}</p></div><span class="badge">${points(p,group.match)} pt</span>`;
      card.appendChild(div);
    });
    list.appendChild(card);
  });
}
function renderRanking(){
  const scores={};
  state.picks.forEach(p=>{ const m=state.matches.find(x=>x.id===p.matchId); if(!m) return; scores[p.player]=(scores[p.player]||0)+points(p,m); });
  const rows=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const box=document.getElementById('rankingList'); box.innerHTML='';
  const card=document.createElement('div'); card.className='card';
  if(!rows.length){ card.innerHTML='<p class="muted">Classement vide.</p>'; }
  rows.forEach(([name,score],i)=>{ const r=document.createElement('div'); r.className='rankRow'; r.innerHTML=`<strong>#${i+1}</strong><span>${name}</span><span class="badge">${score} pts</span>`; card.appendChild(r); });
  box.appendChild(card);
}
render();
