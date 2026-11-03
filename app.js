/* Brúixola de Socials — app de l'alumne (sense IA). Dades a Firebase; mode de prova amb el navegador si no hi ha configuració. */
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function todayISO(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function daysUntil(iso){if(!iso)return null;const a=new Date(todayISO()+'T00:00:00'),b=new Date(iso+'T00:00:00');return Math.round((b-a)/86400000)}
const DIES=['dg','dl','dt','dc','dj','dv','ds'];
const MESOS=['gen','febr','març','abr','maig','juny','jul','ag','set','oct','nov','des'];
function fmtDate(iso){if(!iso)return '';const d=new Date(iso+'T00:00:00');if(isNaN(d))return '';return DIES[d.getDay()]+' '+d.getDate()+' '+MESOS[d.getMonth()]}
function addDays(iso,n){const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+n);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function inDays(n){if(n===0)return 'avui';if(n===1)return 'demà';if(n===-1)return 'ahir';return n>0?'d\'aquí a '+n+' dies':'fa '+(-n)+' dies'}

function md(src){
  const inline=t=>t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/(^|[\s(])\*(\S[^*]*?)\*/g,'$1<em>$2</em>');
  const lines=esc(src).split('\n');let out='',open=null;
  const close=()=>{if(open){out+='</'+open+'>';open=null}};
  for(const raw of lines){
    const line=raw.replace(/\s+$/,'');let m;
    if(!line.trim()){close();continue}
    if((m=line.match(/^(#{1,4})\s+(.*)$/))){close();const h=m[1].length<=2?'h3':'h4';out+='<'+h+'>'+inline(m[2])+'</'+h+'>';continue}
    if((m=line.match(/^(\s*)[-*•]\s+(.*)$/))){if(open!=='ul'){close();out+='<ul>';open='ul'}const lv=Math.min(4,Math.floor(m[1].replace(/\t/g,'  ').length/2));out+='<li style="margin-left:'+(lv*1.1)+'em">'+inline(m[2])+'</li>';continue}
    if((m=line.match(/^\s*\d+[.)]\s+(.*)$/))){if(open!=='ol'){close();out+='<ol>';open='ol'}out+='<li>'+inline(m[1])+'</li>';continue}
    close();out+='<p>'+inline(line)+'</p>';
  }
  close();return out;
}

/* ---------- pla per defecte (igual que a la Brúixola de la família) ---------- */
const SEED=[
 ['El medi físic','Eines de la geografia, relleu, aigües, climes i paisatges del món, d\'Europa, d\'Espanya i de Catalunya.',['Les eines de la geografia: mapes i gràfics','El relleu i les aigües del planeta','Climes i paisatges de la Terra','El medi físic d\'Europa','El medi físic d\'Espanya i de Catalunya']],
 ['L\'organització política del món','Què és un estat, com s\'organitza, la cooperació i els conflictes, la Unió Europea, l\'Estat espanyol i l\'autogovern de Catalunya.',['Els estats actuals','Organització política i territorial dels estats','Cooperació i conflictes entre estats','La Unió Europea','L\'Estat espanyol i les comunitats autònomes','Catalunya: territori i autogovern']],
 ['La població mundial','Com s\'estudia la població, com ha evolucionat, l\'envelliment i les migracions.',['L\'estudi de la població','L\'evolució de la població mundial','Un món cada vegada més envellit','Les migracions','La població d\'Europa, d\'Espanya i de Catalunya']],
 ['Una economia globalitzada','L\'activitat econòmica, els agents, els sistemes econòmics i la globalització.',['L\'activitat econòmica i els seus agents','Els sistemes econòmics','La globalització: factors i efectes','Potències tradicionals i noves potències (Xina i Índia)']],
 ['El sector primari','Agricultura, ramaderia i pesca al món i a prop nostre.',['El sector primari avui','Factors físics i humans de l\'agricultura','Agricultura de mercat i agricultura tradicional','La ramaderia i la pesca','El sector primari a la UE, a Espanya i a Catalunya']],
 ['Mineria, energia i indústria','Recursos, fonts d\'energia i la indústria: origen, localització i deslocalització.',['Els recursos minerals i la mineria','Fonts d\'energia renovables i no renovables','Naixement i evolució de la indústria','Localització i deslocalització industrial','La indústria a la UE, a Espanya i a Catalunya']],
 ['Els serveis','Comerç, transport, turisme i altres serveis.',['Les activitats de serveis','El comerç','El transport','El turisme','Els serveis a Espanya i a Catalunya']],
 ['Les desigualtats al món','Desenvolupament humà, frens al desenvolupament i com avançar.',['El desenvolupament humà (IDH)','Els frens al desenvolupament','Pobresa, fam i accés a l\'aigua','Com avançar cap al desenvolupament']],
 ['La sostenibilitat ambiental','Problemes ambientals, canvi climàtic i respostes.',['El deteriorament ambiental','Contaminació atmosfèrica i canvi climàtic','Aigua, desforestació i biodiversitat','Catalunya i el medi ambient']],
];
const STUDY_TASKS=[['esquema','Fer l\'esquema de la unitat (a mà)'],['vocab','Vocabulari clau amb definicions pròpies'],['activitats','Activitats del llibre / Classroom lliurades a temps'],['test','Test d\'autoavaluació amb 8/10 o més'],['examen','Respondre preguntes tipus examen per escrit'],['repas','Repàs final amb la fitxa d\'examen']];
const readTask=s=>({id:nid(),kind:'llegir',label:'Llegir i subratllar: '+s,done:false});
function makeTasks(sections,done){const t=sections.map(s=>({...readTask(s),done:!!done}));STUDY_TASKS.forEach(([k,l])=>t.push({id:nid(),kind:k,label:l,done:!!done}));return t}
function makeUnit(num,title,summary,sections,done){return {id:'u'+nid(),num,title,summary:summary||'',sections:sections||[],tasks:makeTasks(sections||[],done),examDate:'',deadlines:[],materials:[],generated:[]}}
function defaultPlan(){const units=SEED.map((s,i)=>makeUnit(i+1,s[0],s[1],s[2],i===0));return {v:1,units,currentUnitId:units[1].id,grades:[],settings:{sessions:4,minutes:40},updatedAt:Date.now()}}

/* ---------- Firebase / mode de prova ---------- */
const CFG=window.BRUIXOLA_CONFIG||{firebase:{}};
const DEMO=!CFG.firebase||!CFG.firebase.apiKey||/^POSA/.test(CFG.firebase.apiKey);
const NO_FIREBASE=!DEMO&&!window.firebase;
let fb=null,auth=null,fdb=null,currentUser=null;
if(!DEMO&&!NO_FIREBASE){fb=firebase.initializeApp(CFG.firebase);auth=firebase.auth();fdb=firebase.firestore();try{fdb.enablePersistence({synchronizeTabs:true}).catch(()=>{})}catch(e){}}
const isFamily=()=>!!currentUser&&(CFG.familia||[]).map(s=>s.toLowerCase()).includes((currentUser.email||'').toLowerCase());

let plan=null;
const Store={
  unsub:null,dirty:false,writing:false,timer:null,
  start(){
    if(DEMO){plan=lsGet('bruixola.alumne.plan')||defaultPlan();setSync(false,'Mode de prova: es desa en aquest navegador');route();return}
    setSync(false,'Connectant');
    this.unsub=fdb.doc('bruixola/pla').onSnapshot({includeMetadataChanges:true},snap=>{
      if(!snap.metadata.fromCache)setSync(true,'Desat al núvol');else if(!navigator.onLine)setSync(false,'Sense connexió: es desarà quan tornis a tenir internet');
      if(!snap.exists){if(!plan){plan=defaultPlan();this.save();route()}return}
      if(this.dirty)return;
      const d=snap.data();if(!d||!d.plan)return;
      if(JSON.stringify(d.plan)!==JSON.stringify(plan)){const first=!plan;plan=d.plan;first?route():render()}
    },err=>{setSync(false,err.code==='permission-denied'?'Aquest usuari no té permís per veure les dades':'Error de connexió');if(!plan){$('#main').innerHTML='<div class="panel"><h3>No es poden carregar les dades</h3><p class="muted" style="margin-top:6px">'+(err.code==='permission-denied'?'Aquest usuari encara no té permís. Cal afegir-lo a les regles de Firestore.':'Torna-ho a provar d\'aquí a una estona.')+'</p></div>'}});
  },
  stop(){if(this.unsub){this.unsub();this.unsub=null}plan=null},
  save(){
    plan.updatedAt=Date.now();
    if(DEMO){lsSet('bruixola.alumne.plan',plan);return}
    this.dirty=true;clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),600);
  },
  async flush(){
    if(this.writing){this.timer=setTimeout(()=>this.flush(),400);return}
    this.writing=true;
    try{await fdb.doc('bruixola/pla').set({plan:clone(plan)})}catch(e){setSync(false,'No s\'ha pogut desar')}
    finally{this.writing=false;this.dirty=false}
  },
  async putText(id,obj){if(DEMO){lsSet('bruixola.alumne.t.'+id,obj);return}try{await fdb.doc('bruixola/pla/textos/'+id).set(obj)}catch(e){}},
  async getText(id){if(DEMO)return lsGet('bruixola.alumne.t.'+id);try{const s=await fdb.doc('bruixola/pla/textos/'+id).get();return s.exists?s.data():null}catch(e){return null}},
  async delText(id){if(DEMO){lsDel('bruixola.alumne.t.'+id);return}try{await fdb.doc('bruixola/pla/textos/'+id).delete()}catch(e){}}
};
function setSync(on,txt){const el=$('#sync');if(!el)return;el.classList.toggle('on',on);el.querySelector('span').textContent=txt}

/* ---------- login ---------- */
function showLogin(){$('#app').hidden=true;$('#login').hidden=false}
function showApp(){$('#login').hidden=true;$('#app').hidden=false;$('#who').textContent=DEMO?'mode de prova':(currentUser.email||'');Store.start()}
$('#loginform').addEventListener('submit',async e=>{
  e.preventDefault();const err=$('#lg-err');err.hidden=true;$('#lg-b').disabled=true;
  try{await auth.signInWithEmailAndPassword($('#lg-u').value.trim(),$('#lg-p').value)}
  catch(x){err.hidden=false;err.textContent=({'auth/invalid-credential':'Usuari o clau incorrectes.','auth/wrong-password':'Usuari o clau incorrectes.','auth/user-not-found':'Usuari o clau incorrectes.','auth/invalid-email':'L\'usuari ha de ser un correu (nom@domini).','auth/too-many-requests':'Massa intents. Espera uns minuts.','auth/network-request-failed':'No hi ha connexió a internet.'})[x.code]||'No s\'ha pogut entrar.'}
  finally{$('#lg-b').disabled=false}
});
$('#lg-reset').addEventListener('click',async()=>{
  const u=$('#lg-u').value.trim();const err=$('#lg-err');err.hidden=false;
  if(!u){err.textContent='Escriu primer el teu usuari (correu).';return}
  try{await auth.sendPasswordResetEmail(u);err.textContent='T\'hem enviat un correu per canviar la clau. Si no t\'arriba, demana-la a casa.'}catch(x){err.textContent='No s\'ha pogut enviar. Demana a casa que te la canviïn.'}
});
$('#logout').addEventListener('click',async()=>{if(DEMO)return;Store.stop();await auth.signOut()});

/* ---------- derived ---------- */
const unitById=id=>plan.units.find(u=>u.id===id);
const pct=u=>u.tasks.length?Math.round(100*u.tasks.filter(t=>t.done).length/u.tasks.length):0;
const isDone=u=>u.tasks.length>0&&u.tasks.every(t=>t.done);
function currentUnit(){const c=unitById(plan.currentUnitId);if(c&&!isDone(c))return c;return plan.units.find(u=>!isDone(u))||plan.units[plan.units.length-1]}
function status(u){if(isDone(u))return['ok','Feta'];if(u===currentUnit())return['cur','En curs'];if(pct(u)>0)return['cur','Començada'];return['todo','Pendent']}
function scaleBar(p){const f=Math.round(p/10);let s='<div class="scale" aria-label="'+p+'% fet"><div class="bar">';for(let i=0;i<10;i++)s+='<span class="'+(i<f?'f':'')+'"></span>';return s+'</div><div class="lbl"><span>0</span><span>'+p+'%</span><span>100</span></div></div>'}
const KIND_LABEL={llegir:'Lectura',esquema:'Esquema',vocab:'Vocabulari',activitats:'Activitats',test:'Test',examen:'Tipus examen',repas:'Repàs',altre:'Tasca'};
const TIPS={
  llegir:'Primer llegeix l\'apartat sencer sense subratllar. A la segona lectura, subratlla només les idees clau i escriu al marge una o dues paraules que resumeixin cada paràgraf. Mira bé els mapes i gràfics: també surten a l\'examen.',
  esquema:'Fes l\'esquema a mà: títol de la unitat a dalt, els apartats com a branques i, a sota, paraules clau (no frases copiades). Si hi ha un esquema model a la unitat, compara\'l quan acabis el teu.',
  vocab:'Escriu cada terme amb una definició amb les teves paraules i un exemple. El professor vol que coneguis el vocabulari que fas servir, i compta l\'ortografia dels termes específics.',
  activitats:'Fes-les amb redacció pròpia: copiar d\'internet està prohibit. Revisa l\'ortografia abans de lliurar. Si arribes tard tens 48 h, però la nota màxima és un 5; després ja no s\'accepten.',
  test:'Fes el test sense mirar els apunts. L\'objectiu és un 8/10 o més. Apunta les preguntes que falles i torna a llegir aquell apartat.',
  examen:'Contesta per escrit com si fos l\'examen, amb frases completes i vocabulari de la unitat. Després compara amb la resposta model.',
  repas:'La vigília només repassa l\'esquema i la fitxa d\'examen; no estudiïs coses noves. Dorm bé: compta més del que sembla.',
  altre:'Divideix-ho en passos petits i comença pel més fàcil.'
};
const GEN_NAME={resum:'Resum',esquema:'Esquema model',vocab:'Vocabulari',test:'Test',examen:'Tipus examen',repas:'Fitxa d\'examen'};
const GEN_FOR_KIND={esquema:'esquema',vocab:'vocab',test:'test',examen:'examen',repas:'repas',llegir:'resum'};
function examDayPlan(dd){
  if(dd>=7)return 'Acaba les lectures pendents i fes l\'esquema';
  if(dd>=5)return 'Vocabulari: fes les fitxes i repassa-les';
  if(dd===4)return 'Test d\'autoavaluació sense apunts';
  if(dd===3)return 'Preguntes tipus examen per escrit';
  if(dd===2)return 'Repassa els errors i refés l\'esquema de memòria';
  if(dd===1)return 'Repàs curt amb la fitxa d\'examen i a dormir d\'hora';
  return 'Examen: llegeix bé cada pregunta i respon amb frases completes';
}
function tutorAlerts(){
  const out=[];
  plan.units.forEach(u=>{
    u.deadlines.filter(d=>!d.done&&d.date).forEach(d=>{
      const dd=daysUntil(d.date);
      if(dd<0&&dd>=-2)out.push({cls:'bad',p:0,html:'<b>Lliurament endarrerit:</b> '+esc(d.label)+' (U'+u.num+'). Encara tens fins '+(dd===-1?'demà':'avui')+' per lliurar-lo, però la nota màxima serà un 5.',unit:u.id});
      else if(dd<-2)out.push({cls:'bad',p:1,html:'<b>Fora de termini:</b> '+esc(d.label)+' (U'+u.num+'). Ja han passat les 48 h. Parla amb el professor i marca-ho com a resolt.',unit:u.id});
      else if(dd<=3)out.push({cls:'warn',p:2,html:'<b>Lliura '+inDays(dd)+':</b> '+esc(d.label)+' (U'+u.num+', '+fmtDate(d.date)+').',unit:u.id});
    });
    if(u.examDate){const dd=daysUntil(u.examDate);if(dd>=0&&dd<=10)out.push({cls:'info',p:3,html:'<b>Examen '+inDays(dd)+'</b> de la unitat '+u.num+' ('+fmtDate(u.examDate)+'). Avui toca: '+esc(examDayPlan(dd)).toLowerCase()+'.',unit:u.id,exam:dd})}
  });
  return out.sort((a,b)=>a.p-b.p);
}
const nextTasks=(u,n)=>u.tasks.filter(t=>!t.done).slice(0,n);

/* ---------- routing ---------- */
let ui={tab:'avui',unitId:null};
function route(){
  if(!plan)return;
  const h=(location.hash||'#avui').slice(1);
  if(h.startsWith('u-')&&unitById(h.slice(2))){ui.tab='unitats';ui.unitId=h.slice(2)}
  else{ui.tab=['avui','unitats','pla','notes'].includes(h)?h:'avui';ui.unitId=null}
  render();window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
function render(){
  if(!plan)return;
  document.querySelectorAll('#tabs a').forEach(a=>{if(a.dataset.tab===ui.tab)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  const m=$('#main');
  if(ui.tab==='avui')m.innerHTML=viewToday();
  else if(ui.tab==='unitats')m.innerHTML=ui.unitId&&unitById(ui.unitId)?viewUnit(unitById(ui.unitId)):viewUnits();
  else if(ui.tab==='pla')m.innerHTML=viewPlan();
  else m.innerHTML=viewNotes();
}
const greeting=()=>{const h=new Date().getHours();return h<13?'Bon dia':h<20?'Bona tarda':'Bona nit'};

function viewToday(){
  const u=currentUnit();const alerts=tutorAlerts();const next=nextTasks(u,4);const first=next[0];
  const examAlert=alerts.find(a=>a.exam!=null);let countdown='';
  if(examAlert){const ex=unitById(examAlert.unit);const dd0=daysUntil(ex.examDate);let cells='';
    for(let d=Math.min(dd0,7);d>=0;d--){cells+='<div class="'+(d===dd0?'today':'')+'"><b>'+(d===0?'EXAMEN':'D-'+d)+' · '+fmtDate(addDays(ex.examDate,-d))+'</b>'+esc(examDayPlan(d))+'</div>'}
    countdown='<div class="countdown">'+cells+'</div>'}
  const gen=first&&GEN_FOR_KIND[first.kind]&&u.generated.find(g=>g.type===GEN_FOR_KIND[first.kind]);
  return `<div class="stack">
  <section class="tutor">
    <div class="head"><div style="flex:1;min-width:0"><div class="eyebrow">${greeting()} · ${esc(fmtDate(todayISO()))}</div>
      <p class="muted small" style="margin-top:4px">Ara estàs a la <a href="#u-${u.id}">unitat ${u.num}: ${esc(u.title)}</a></p></div>${scaleBar(pct(u))}</div>
    <div class="now">
      ${first?`<div class="eyebrow">Ara toca · ${esc(KIND_LABEL[first.kind]||'Tasca')}</div><h3>${esc(first.label)}</h3>
      <div class="row"><button class="btn primary" data-act="toggle" data-u="${u.id}" data-t="${first.id}">Fet</button>
      ${gen?`<button class="btn" data-act="open-gen" data-u="${u.id}" data-g="${gen.id}">${esc(GEN_NAME[gen.type])}</button>`:''}
      <a class="btn ghost" href="#u-${u.id}">Obre la unitat</a></div>
      <div class="tip"><b>Com fer-ho:</b> ${esc(TIPS[first.kind]||TIPS.altre)}</div>`
      :`<h3>Unitat ${u.num} completada</h3><p>Bona feina. Passa a la següent unitat.</p>`}
      ${countdown}
    </div>
    ${next.length>1?`<div class="queue"><div class="eyebrow">Després</div>${next.slice(1).map(t=>`<label class="q"><input type="checkbox" data-act="toggle" data-u="${u.id}" data-t="${t.id}"> <span>${esc(t.label)}</span></label>`).join('')}</div>`:''}
  </section>
  ${alerts.length?`<section class="alerts">${alerts.map(a=>`<div class="alert ${a.cls}"><div style="flex:1">${a.html}</div><a class="btn ghost sm" href="#u-${a.unit}">Veure</a></div>`).join('')}</section>`:
   (!u.examDate?`<div class="note">Encara no has apuntat la data de l'examen de la unitat ${u.num}. Pregunta-la a classe i apunta-la a la unitat: el tutor et prepararà un compte enrere.</div>`:'')}
  <section class="panel">
    <div class="spread"><div><h3>Novetats de Classroom</h3><p class="muted small" style="margin-top:4px">Ha penjat res de nou el professor? Apunta-ho aquí i anirà a la unitat que toca.</p></div>
    <div class="row"><button class="btn primary" data-act="news">Afegeix novetat</button><button class="btn sm" data-act="import">Codi de la Brúixola</button></div></div>
  </section>
  <section class="panel">
    <h3>Com et posen la nota</h3>
    <div class="weights" style="margin-top:10px"><div class="w1">Proves 70%</div><div class="w2">Activ. 20%</div><div class="w3">10%</div></div>
    <ul class="rules">
      <li>Mínim dues proves per trimestre. Avaluen comprensió, no memòria pura.</li>
      <li>Tasques fora de termini: 48 h de marge i com a màxim un 5. Després, no presentada.</li>
      <li>Res de copiar i enganxar d'internet: redacció pròpia i saber què vol dir cada paraula.</li>
      <li>Actitud (10%): escoltar, treballar a classe, fer els deures, participar i portar el material.</li>
      <li>No hi ha recuperacions: la nota final és la mitjana dels tres trimestres.</li>
    </ul>
  </section></div>`;
}
function viewUnits(){
  return `<div class="stack"><div class="spread"><div><h2>Unitats</h2><p class="muted small">Marca el que tens fet de cada unitat. Toca una unitat per veure-la.</p></div><button class="btn primary" data-act="new-unit">+ Nova unitat</button></div>
  <div class="units">${plan.units.map(u=>{const [c,l]=status(u);const dd=u.examDate?daysUntil(u.examDate):null;
    return `<a class="unit-row" href="#u-${u.id}"><div class="num">${u.num}</div><div class="t"><h3>${esc(u.title)}</h3><div class="meta"><span class="pill ${c}">${l}</span>${u.examDate?`<span class="pill ${dd!=null&&dd>=0&&dd<=7?'warn':'todo'}">Examen ${esc(fmtDate(u.examDate))}</span>`:''}${u.generated.length?`<span class="muted small">${u.generated.length} material${u.generated.length>1?'s':''} de repàs</span>`:''}</div></div><div class="right">${scaleBar(pct(u))}</div></a>`}).join('')}</div></div>`;
}
function viewUnit(u){
  const [c,l]=status(u);
  const taskLi=t=>`<li class="${t.done?'done':''}"><input type="checkbox" id="t-${t.id}" ${t.done?'checked':''} data-act="toggle" data-u="${u.id}" data-t="${t.id}"><label class="lbl" for="t-${t.id}"><span class="kind">${esc(KIND_LABEL[t.kind]||'Tasca')}</span><br>${esc(t.label)}</label><button class="x" data-act="del-task" data-u="${u.id}" data-t="${t.id}" aria-label="Esborra la tasca">✕</button></li>`;
  const groups=[['llegir','Lectures del llibre'],['study','Estudi i pràctica']];
  return `<div class="stack"><a href="#unitats" class="btn ghost sm" style="align-self:flex-start">← Totes les unitats</a>
  <section class="ud-head"><div class="row" style="align-items:flex-start;flex:1;min-width:0;flex-wrap:nowrap"><div class="num">${u.num}</div>
    <div style="min-width:0"><h2>${esc(u.title)}</h2><p class="muted small" style="margin-top:4px">${esc(u.summary)}</p>
    <div class="row" style="margin-top:8px"><span class="pill ${c}">${l}</span>${u.id!==plan.currentUnitId&&!isDone(u)?`<button class="btn sm" data-act="set-current" data-u="${u.id}">Treballo aquesta ara</button>`:''}<button class="btn ghost sm" data-act="edit-unit" data-u="${u.id}">Edita</button></div></div></div>${scaleBar(pct(u))}</section>
  <section class="panel"><div class="spread"><h3>Material de repàs</h3></div>
    ${u.generated.length?`<div class="gen-btns" style="margin-top:10px">${u.generated.slice().reverse().map(g=>`<button class="gen-btn" data-act="open-gen" data-u="${u.id}" data-g="${g.id}"><b>${esc(GEN_NAME[g.type]||g.type)}</b><span>${esc(fmtDate(g.date))}${g.score!=null?' · última nota '+g.score+'/'+g.total:''}</span></button>`).join('')}</div>`:'<p class="muted small" style="margin-top:6px">Encara no hi ha material de repàs per a aquesta unitat. A casa el poden preparar amb la Brúixola i te\'l passaran amb un codi.</p>'}
  </section>
  <div class="grid2">
    <section class="panel"><h3>Tasques</h3>
      ${groups.map(([g,name])=>{const list=u.tasks.filter(t=>g==='llegir'?t.kind==='llegir':t.kind!=='llegir');return list.length?`<div class="eyebrow" style="margin-top:12px">${name}</div><ul class="tasks">${list.map(taskLi).join('')}</ul>`:''}).join('')}
      <form class="row" data-form="add-task" data-u="${u.id}" style="margin-top:12px;flex-wrap:nowrap"><input type="text" id="addtask-${u.id}" placeholder="Afegeix una tasca (ex: Activitat 5 pàg. 42)"><button class="btn sm">Afegeix</button></form>
    </section>
    <section class="panel"><h3>Dates</h3>
      <label class="f" style="margin-top:10px">Data de l'examen<input type="date" id="exam-${u.id}" value="${esc(u.examDate)}" data-act="exam-date" data-u="${u.id}"></label>
      <div class="eyebrow" style="margin-top:14px">Lliuraments</div>
      ${u.deadlines.length?u.deadlines.map(d=>{const dd=daysUntil(d.date);return `<div class="deadline"><input type="checkbox" ${d.done?'checked':''} data-act="toggle-dl" data-u="${u.id}" data-d="${d.id}" aria-label="Lliurat"><span style="flex:1;min-width:0;${d.done?'text-decoration:line-through;color:var(--muted)':''}">${esc(d.label)}</span><span class="pill ${d.done?'ok':dd<0?'bad':dd<=3?'warn':'todo'}">${esc(fmtDate(d.date))}</span><button class="btn ghost sm" data-act="del-dl" data-u="${u.id}" data-d="${d.id}" aria-label="Esborra">✕</button></div>`}).join(''):'<p class="muted small">Cap lliurament apuntat.</p>'}
      <form data-form="add-dl" data-u="${u.id}" class="row" style="margin-top:8px"><input type="text" id="dl-l-${u.id}" placeholder="Què s'ha de lliurar" style="flex:2 1 160px"><input type="date" id="dl-d-${u.id}" style="flex:1 1 130px"><button class="btn sm">Afegeix</button></form>
    </section>
  </div>
  <section class="panel"><h3>Materials</h3>
    <div class="mats" style="margin-top:10px">${u.materials.length?u.materials.map(m=>`<div class="mat"><span class="k">${esc(m.kind)}</span><span class="n">${m.url?`<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a>`:esc(m.title)}</span>${m.chars?`<button class="btn ghost sm" data-act="open-mat" data-u="${u.id}" data-m="${m.id}">Llegeix</button>`:''}<button class="btn ghost sm" data-act="del-mat" data-u="${u.id}" data-m="${m.id}" aria-label="Esborra">✕</button></div>`).join(''):'<p class="muted small">Encara no hi ha materials.</p>'}</div>
    <form class="row" data-form="add-link" data-u="${u.id}" style="margin-top:12px"><input type="text" id="ml-t-${u.id}" placeholder="Títol" style="flex:1 1 140px"><input type="url" id="ml-u-${u.id}" placeholder="Enllaç (https://…)" style="flex:2 1 200px"><button class="btn sm">Afegeix enllaç</button></form>
  </section>
  <div class="row" style="justify-content:flex-end">${ui.confirmDel===u.id?`<span class="small">Segur que vols esborrar la unitat ${u.num}?</span><button class="btn danger sm" data-act="del-unit" data-u="${u.id}">Sí, esborra-la</button><button class="btn sm" data-act="cancel-del">No</button>`:`<button class="btn ghost sm danger" data-act="ask-del" data-u="${u.id}">Esborra la unitat</button>`}</div>
  </div>`;
}
function viewPlan(){
  const s=plan.settings||{sessions:4,minutes:40};const remaining=plan.units.filter(u=>!isDone(u)).length;
  const end='2027-06-18';const weeks=Math.max(1,Math.round((daysUntil(end)-14)/7));const pace=remaining?Math.max(1,Math.round(weeks/remaining*10)/10):0;
  const sessions=Math.max(2,Math.min(6,s.sessions||4));const day=(t,b)=>`<div><b>${t}</b>${b}</div>`;
  const blocks=[day('Dia de classe','10 min: repassa el que s\'ha fet avui i marca les tasques.'),day('Sessió de lectura',s.minutes+' min: un o dos apartats del llibre, subratllar i notes al marge.'),day('Sessió de fixar',s.minutes+' min: esquema o vocabulari de la unitat.'),day('Sessió de practicar',s.minutes+' min: test, preguntes tipus examen i activitats.'),day('Sessió de lliuraments',s.minutes+' min: acabar i revisar tasques del Classroom abans del termini.'),day('Repàs setmanal','20 min: torna a mirar l\'esquema de les unitats anteriors.')].slice(0,sessions+1).join('');
  return `<div class="stack"><div><h2>Pla d'estudi</h2><p class="muted small">El mètode és el mateix per a cada unitat. L'app et diu cada dia quin pas toca.</p></div>
  <section class="panel"><h3>El mètode per unitat</h3><ol class="phases" style="margin-top:12px">
    <li><div><b>Llegir i subratllar</b><br><span class="muted">Un apartat per sessió. Segueix el que s'ha fet a classe.</span></div></li>
    <li><div><b>Esquema a mà</b><br><span class="muted">Quan acabes les lectures. Després el compares amb l'esquema model.</span></div></li>
    <li><div><b>Vocabulari</b><br><span class="muted">Definicions amb les teves paraules. L'ortografia dels termes compta.</span></div></li>
    <li><div><b>Activitats i lliuraments</b><br><span class="muted">El 20% de la nota. Sempre dins del termini i amb redacció pròpia.</span></div></li>
    <li><div><b>Practicar com a l'examen</b><br><span class="muted">Test (objectiu 8/10) i preguntes de desenvolupament.</span></div></li>
    <li><div><b>Repàs final</b><br><span class="muted">Fitxa d'examen la vigília. Res de nou l'últim dia.</span></div></li></ol></section>
  <section class="panel"><div class="spread"><h3>Setmana tipus</h3><div class="row">
    <label class="f" style="flex-direction:row;align-items:center;gap:6px">Sessions<select id="set-sessions" data-act="set-sessions">${[2,3,4,5,6].map(n=>`<option ${n===sessions?'selected':''}>${n}</option>`).join('')}</select></label>
    <label class="f" style="flex-direction:row;align-items:center;gap:6px">Minuts<select id="set-minutes" data-act="set-minutes">${[25,30,40,50,60].map(n=>`<option ${n===s.minutes?'selected':''}>${n}</option>`).join('')}</select></label></div></div>
    <div class="week" style="margin-top:12px">${blocks}</div></section>
  <section class="panel"><h3>Compte enrere d'examen</h3><p class="muted small" style="margin-top:4px">Quan apuntes la data d'un examen, la pantalla Avui et mostra aquest pla dia a dia.</p>
    <div class="countdown">${[7,6,5,4,3,2,1,0].map(d=>`<div><b>${d===0?'EXAMEN':'D-'+d}</b>${esc(examDayPlan(d))}</div>`).join('')}</div></section>
  <section class="panel"><h3>Ritme del curs</h3><p style="margin-top:6px">Queden <b>${remaining}</b> unitats i unes <b>${weeks}</b> setmanes lectives fins al ${esc(fmtDate(end))}: una unitat cada <b>${String(pace).replace('.',',')}</b> setmanes, més o menys.</p></section></div>`;
}
function viewNotes(){
  const tri=ui.tri||1;const g=plan.grades.filter(x=>(x.tri||1)===tri);
  const avg=k=>{const a=g.filter(x=>x.kind===k).map(x=>+x.value);return a.length?a.reduce((s,v)=>s+v,0)/a.length:null};
  const p=avg('prova'),a=avg('activitat'),t=avg('actitud');const est=p!=null?p*0.7+(a!=null?a:p)*0.2+(t!=null?t:p)*0.1:null;
  const fmt=v=>v==null?'–':v.toFixed(1).replace('.',',');
  return `<div class="stack"><div><h2>Notes</h2><p class="muted small">Apunta les notes que et donin i mira com va el trimestre (70% proves, 20% activitats, 10% actitud).</p></div>
  <div class="tabs-inline">${[1,2,3].map(n=>`<button data-act="tri" data-n="${n}" aria-pressed="${n===tri}">${n}r trimestre</button>`).join('')}</div>
  <section class="panel"><div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">Estimació del trimestre</div><div class="big">${fmt(est)}</div>${est!=null?`<span class="pill ${est>=5?'ok':'bad'}">${est>=5?'Aprovat':'Per sota de 5'}</span>`:'<p class="muted small">Afegeix almenys una nota de prova.</p>'}</div>
  <div class="row small mono"><span>Proves ${fmt(p)}</span><span>Activitats ${fmt(a)}</span><span>Actitud ${fmt(t)}</span></div></div></section>
  <section class="panel"><form class="row" data-form="add-grade" style="align-items:flex-end">
    <label class="f" style="flex:1 1 120px">Tipus<select id="g-k"><option value="prova">Prova escrita</option><option value="activitat">Activitat / treball</option><option value="actitud">Actitud</option></select></label>
    <label class="f" style="flex:3 1 180px">Què<input type="text" id="g-l" placeholder="Ex: Examen unitat 1"></label>
    <label class="f" style="flex:1 1 80px">Nota<input type="number" id="g-v" min="0" max="10" step="0.1"></label><button class="btn primary">Afegeix</button></form>
  ${g.length?`<div class="tablewrap" style="margin-top:12px"><table class="grades"><thead><tr><th>Tipus</th><th>Què</th><th style="text-align:right">Nota</th><th></th></tr></thead><tbody>${g.map(x=>`<tr><td>${esc({prova:'Prova',activitat:'Activitat',actitud:'Actitud'}[x.kind])}</td><td>${esc(x.label)}</td><td class="v">${fmt(+x.value)}</td><td><button class="btn ghost sm" data-act="del-grade" data-g="${x.id}" aria-label="Esborra">✕</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted small" style="margin-top:10px">Encara no hi ha notes en aquest trimestre.</p>'}</section></div>`;
}

/* ---------- modals ---------- */
function openModal(html){$('#modal').innerHTML=html;$('#overlay').hidden=false;document.body.style.overflow='hidden'}
function closeModal(){$('#overlay').hidden=true;$('#modal').innerHTML='';document.body.style.overflow=''}
$('#overlay').addEventListener('click',e=>{if(e.target.id==='overlay')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#overlay').hidden)closeModal()});
const unitOptions=n=>plan.units.map(u=>`<option value="${u.num}" ${u.num===n?'selected':''}>U${u.num} · ${esc(u.title)}</option>`).join('');

function unitFormModal(u){
  openModal(`<div class="spread"><h3>${u?'Edita la unitat':'Nova unitat'}</h3><button class="btn ghost" data-act="close">Tanca</button></div>
  <form class="stack" data-form="unit" data-u="${u?u.id:''}">
    <div class="row"><label class="f" style="flex:0 0 80px">Núm.<input type="number" id="nu-n" value="${u?u.num:plan.units.length+1}"></label>
    <label class="f" style="flex:1 1 220px">Títol<input type="text" id="nu-t" value="${u?esc(u.title):''}" required></label></div>
    <label class="f">De què va (opcional)<input type="text" id="nu-s" value="${u?esc(u.summary):''}"></label>
    <label class="f">Apartats del llibre, un per línia<textarea id="nu-a" style="min-height:130px">${u?esc(u.sections.join('\n')):''}</textarea></label>
    <button class="btn primary" style="align-self:flex-start">${u?'Desa els canvis':'Crea la unitat'}</button></form>`);
}
function newsModal(){
  const cu=currentUnit().num;
  openModal(`<div class="spread"><h3>Novetat de Classroom</h3><button class="btn ghost" data-act="close">Tanca</button></div>
  <form class="stack" data-form="news">
    <div class="tabs-inline" id="nw-kind">${[['lliurament','Tasca per lliurar'],['examen','Examen'],['material','Material'],['tasca','Feina sense data']].map(([k,l],i)=>`<button type="button" data-act="nw-kind" data-k="${k}" aria-pressed="${i===0}">${l}</button>`).join('')}</div>
    <label class="f">Unitat<select id="nw-u">${unitOptions(cu)}</select></label>
    <label class="f">Títol<input type="text" id="nw-t" placeholder="Ex: Mapa polític d'Europa" required></label>
    <label class="f" id="nw-dw">Data<input type="date" id="nw-d"></label>
    <label class="f" id="nw-lw" hidden>Enllaç (opcional)<input type="url" id="nw-l" placeholder="https://classroom.google.com/…"></label>
    <label class="f">Instruccions o notes (opcional)<textarea id="nw-x" placeholder="Copia aquí què demana el professor"></textarea></label>
    <button class="btn primary" style="align-self:flex-start">Afegeix</button></form>`);
  ui.nwKind='lliurament';
}
function importModal(){
  openModal(`<div class="spread"><h3>Codi de la Brúixola</h3><button class="btn ghost" data-act="close">Tanca</button></div>
  <p class="small muted">Enganxa aquí el codi que t'han passat des de la Brúixola (material de repàs, novetats o una unitat sencera).</p>
  <form class="stack" data-form="import"><textarea class="code" id="imp-x" placeholder='{"bruixola":1,…}'></textarea><p id="imp-st" class="small"></p><button class="btn primary" style="align-self:flex-start">Importa</button></form>`);
}
async function openMaterial(u,mid){
  const m=u.materials.find(x=>x.id===mid);if(!m)return;openModal('<p class="thinking">Obrint</p>');
  const t=await Store.getText('m'+m.id);
  openModal(`<div class="spread"><h3>${esc(m.title)}</h3><button class="btn ghost" data-act="close">Tanca</button></div><div class="doc">${t&&t.text?md(t.text):'<p class="muted">No hi ha text guardat.</p>'}</div>`);
}
let quizState=null;
async function openGenerated(u,gid){
  const g=u.generated.find(x=>x.id===gid);if(!g)return;openModal('<p class="thinking">Obrint</p>');
  const t=await Store.getText('g'+g.id);
  if(!t){openModal('<div class="spread"><h3>No trobat</h3><button class="btn ghost" data-act="close">Tanca</button></div><p>Aquest material no s\'ha pogut carregar.</p>');return}
  const content=t.content;let body='';
  if(g.type==='test'&&Array.isArray(content)){
    quizState={u:u.id,g:g.id,answered:0,right:0,total:content.length};
    body='<p class="muted small">Contesta sense mirar els apunts. Objectiu: 8 de 10.</p><div class="quiz">'+content.map((q,i)=>`<div class="qq" data-c="${+q.correcta}"><b>${i+1}. ${esc(q.pregunta)}</b><div class="opts">${(q.opcions||[]).map((o,j)=>`<button data-act="quiz-ans" data-j="${j}">${esc(o)}</button>`).join('')}</div><div class="why" hidden>${esc(q.explicacio)}</div></div>`).join('')+'</div><div id="quiz-score" class="note" hidden></div>';
  }else if(g.type==='vocab'&&Array.isArray(content)){
    body='<p class="muted small">Toca una targeta per veure la definició. Intenta dir-la abans en veu alta.</p><div class="cards">'+content.map(c=>`<button class="card" data-act="flip"><span class="front"><b>${esc(c.terme)}</b></span><span class="back" hidden><b>${esc(c.terme)}</b><span>${esc(c.definicio)}</span><span class="muted small">Ex: ${esc(c.exemple)}</span></span></button>`).join('')+'</div>';
  }else if(g.type==='examen'&&Array.isArray(content)){
    body='<p class="muted small">Escriu la resposta com a l\'examen i després compara-la amb la resposta model. Fixa\'t en el que t\'ha faltat.</p><div class="quiz">'+content.map((q,i)=>`<div class="qq"><span class="eyebrow">${esc(q.tipus||'')}</span><br><b>${i+1}. ${esc(q.pregunta)}</b>
      <textarea id="ans-${i}" style="margin-top:8px" placeholder="La teva resposta"></textarea>
      <div class="row" style="margin-top:6px"><button class="btn ghost sm" data-act="show" data-target="pista-${i}">Pista</button><button class="btn sm" data-act="show" data-target="model-${i}">Resposta model</button></div>
      <div class="why" id="pista-${i}" hidden><b>Pista:</b> ${esc(q.pista)}</div><div class="why" id="model-${i}" hidden><b>Resposta model:</b> ${esc(q.resposta_model)}</div></div>`).join('')+'</div>';
  }else body='<div class="doc">'+md(typeof content==='string'?content:JSON.stringify(content,null,2))+'</div>';
  openModal(`<div class="spread"><div><div class="eyebrow">Unitat ${u.num} · ${esc(fmtDate(g.date))}</div><h3>${esc(GEN_NAME[g.type]||g.type)}: ${esc(u.title)}</h3></div><button class="btn ghost" data-act="close">Tanca</button></div>${body}`);
}
function quizAnswer(btn){
  const qq=btn.closest('.qq');if(qq.dataset.done)return;qq.dataset.done='1';
  const c=+qq.dataset.c,j=+btn.dataset.j;const bs=qq.querySelectorAll('.opts button');
  if(bs[c])bs[c].classList.add('right');if(j!==c)btn.classList.add('wrong');qq.querySelector('.why').hidden=false;
  quizState.answered++;if(j===c)quizState.right++;
  if(quizState.answered===quizState.total){
    const s=$('#quiz-score');s.hidden=false;const ok=quizState.right>=Math.ceil(quizState.total*0.8);
    s.innerHTML='<b>'+quizState.right+' de '+quizState.total+'.</b> '+(ok?'Objectiu aconseguit: he marcat la tasca del test com a feta.':'Torna a llegir els apartats de les preguntes fallades i torna-ho a provar un altre dia.');
    const u=unitById(quizState.u);const g=u&&u.generated.find(x=>x.id===quizState.g);
    if(g){g.score=quizState.right;g.total=quizState.total}
    if(ok&&u){const t=u.tasks.find(t=>t.kind==='test'&&!t.done);if(t)t.done=true}
    Store.save();render();
  }
}

/* ---------- import from Brúixola ---------- */
async function importCode(raw){
  let data;try{data=JSON.parse(raw.trim())}catch(e){throw 'El codi no és vàlid. Copia\'l sencer, des de la primera { fins a l\'última }.'}
  if(!data||data.bruixola!==1)throw 'Aquest codi no és de la Brúixola.';
  let n=0;
  const unitFor=info=>{
    let u=plan.units.find(x=>x.num===+info.num);
    if(!u){u=makeUnit(+info.num||plan.units.length+1,info.title||'Unitat nova',info.summary||'',Array.isArray(info.sections)?info.sections:[],false);plan.units.push(u);plan.units.sort((a,b)=>a.num-b.num);n++}
    return u;
  };
  if(data.kind==='unitat'||data.kind==='material'){
    const u=unitFor(data.unit||{});
    if(data.kind==='unitat'){
      const info=data.unit;if(info.title)u.title=info.title;if(info.summary)u.summary=info.summary;
      if(Array.isArray(info.sections)){const add=info.sections.filter(s=>!u.sections.includes(s));const last=u.tasks.map(t=>t.kind).lastIndexOf('llegir');u.tasks.splice(last+1,0,...add.map(readTask));u.sections=u.sections.concat(add);n+=add.length}
      if(info.examDate){u.examDate=info.examDate;n++}
      (info.deadlines||[]).forEach(d=>{if(d.label&&d.date&&!u.deadlines.some(x=>x.label===d.label&&x.date===d.date)){u.deadlines.push({id:nid(),label:d.label,date:d.date,done:!!d.done});n++}});
      u.deadlines.sort((a,b)=>a.date.localeCompare(b.date));
      for(const m of (data.materials||[])){if(u.materials.some(x=>x.src===m.src))continue;const mm={id:nid(),src:m.src,kind:m.kind||'material',title:m.title||'Material',url:m.url||'',chars:m.text?m.text.length:0,date:todayISO()};if(m.text)await Store.putText('m'+mm.id,{text:m.text});u.materials.push(mm);n++}
    }
    for(const g of (data.generated||[])){if(u.generated.some(x=>x.src===g.src))continue;const gg={id:nid(),src:g.src,type:g.type,title:g.title||GEN_NAME[g.type]||'Material',date:g.date||todayISO()};await Store.putText('g'+gg.id,{content:g.content});u.generated.push(gg);n++}
  }else if(data.kind==='novetats'){
    for(const it of (data.items||[])){applyNewsItem(it);n++}
  }else throw 'Aquest codi és d\'un tipus que l\'app no coneix.';
  Store.save();render();return n;
}
function applyNewsItem(it){
  const u=plan.units.find(x=>x.num===+it.unitat)||currentUnit();const date=/^\d{4}-\d{2}-\d{2}$/.test(it.data||'')?it.data:'';const title=String(it.titol||'Sense títol');
  if(it.tipus==='lliurament'){
    if(!u.deadlines.some(d=>d.label===title&&d.date===date)){u.deadlines.push({id:nid(),label:title,date:date||todayISO(),done:false});u.deadlines.sort((a,b)=>a.date.localeCompare(b.date))}
    if(!u.tasks.some(t=>t.label==='Classroom: '+title))u.tasks.push({id:nid(),kind:'activitats',label:'Classroom: '+title,done:false});
  }else if(it.tipus==='examen'){if(date)u.examDate=date}
  else if(it.tipus==='material'){
    if(!u.materials.some(m=>m.title===title)){const m={id:nid(),kind:'classroom',title,url:it.url||'',chars:it.detall?it.detall.length:0,date:todayISO()};if(it.detall)Store.putText('m'+m.id,{text:it.detall});u.materials.push(m)}
  }else if(!u.tasks.some(t=>t.label===title))u.tasks.push({id:nid(),kind:'altre',label:title,done:false});
}

/* ---------- events ---------- */
const findTask=(uid,tid)=>{const u=unitById(uid);return u&&u.tasks.find(t=>t.id===tid)};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el||!plan)return;
  if(el.tagName==='INPUT'||el.tagName==='SELECT')return;
  const act=el.dataset.act,u=el.dataset.u?unitById(el.dataset.u):null;
  switch(act){
    case 'toggle':{const t=findTask(el.dataset.u,el.dataset.t);if(t){t.done=!t.done;Store.save();render()}break}
    case 'del-task':u.tasks=u.tasks.filter(t=>t.id!==el.dataset.t);Store.save();render();break;
    case 'del-dl':u.deadlines=u.deadlines.filter(d=>d.id!==el.dataset.d);Store.save();render();break;
    case 'set-current':plan.currentUnitId=u.id;Store.save();render();break;
    case 'new-unit':unitFormModal(null);break;
    case 'edit-unit':unitFormModal(u);break;
    case 'close':closeModal();break;
    case 'ask-del':ui.confirmDel=u.id;render();break;
    case 'cancel-del':ui.confirmDel=null;render();break;
    case 'del-unit':{[...u.materials.map(m=>'m'+m.id),...u.generated.map(g=>'g'+g.id)].forEach(id=>Store.delText(id));plan.units=plan.units.filter(x=>x.id!==u.id);ui.confirmDel=null;Store.save();location.hash='#unitats';break}
    case 'del-mat':{u.materials=u.materials.filter(x=>x.id!==el.dataset.m);Store.delText('m'+el.dataset.m);Store.save();render();break}
    case 'open-mat':openMaterial(u,el.dataset.m);break;
    case 'open-gen':openGenerated(u,el.dataset.g);break;
    case 'tri':ui.tri=+el.dataset.n;render();break;
    case 'del-grade':plan.grades=plan.grades.filter(g=>g.id!==el.dataset.g);Store.save();render();break;
    case 'flip':{const f=el.classList.toggle('flip');el.querySelector('.front').hidden=f;el.querySelector('.back').hidden=!f;break}
    case 'quiz-ans':quizAnswer(el);break;
    case 'show':{const t=document.getElementById(el.dataset.target);if(t)t.hidden=!t.hidden;break}
    case 'news':newsModal();break;
    case 'import':importModal();break;
    case 'nw-kind':{ui.nwKind=el.dataset.k;document.querySelectorAll('#nw-kind button').forEach(b=>b.setAttribute('aria-pressed',b===el));const dated=['lliurament','examen'].includes(ui.nwKind);$('#nw-dw').hidden=!dated;$('#nw-lw').hidden=ui.nwKind!=='material';break}
  }
});
document.addEventListener('change',e=>{
  const el=e.target;const act=el.dataset.act;if(!act||!plan)return;const u=el.dataset.u?unitById(el.dataset.u):null;
  if(act==='toggle'){const t=findTask(el.dataset.u,el.dataset.t);if(t){t.done=el.checked;Store.save();render()}}
  else if(act==='toggle-dl'){const d=u.deadlines.find(x=>x.id===el.dataset.d);if(d){d.done=el.checked;Store.save();render()}}
  else if(act==='exam-date'){u.examDate=el.value;Store.save();render()}
  else if(act==='set-sessions'){plan.settings=plan.settings||{};plan.settings.sessions=+el.value;Store.save();render()}
  else if(act==='set-minutes'){plan.settings=plan.settings||{};plan.settings.minutes=+el.value;Store.save();render()}
});
document.addEventListener('submit',async e=>{
  const f=e.target;if(f.id==='loginform'||!f.dataset.form)return;e.preventDefault();
  const u=f.dataset.u?unitById(f.dataset.u):null;const v=id=>(document.getElementById(id)||{}).value||'';
  switch(f.dataset.form){
    case 'add-task':{const l=v('addtask-'+u.id).trim();if(!l)return;u.tasks.push({id:nid(),kind:'altre',label:l,done:false});break}
    case 'add-dl':{const l=v('dl-l-'+u.id).trim(),d=v('dl-d-'+u.id);if(!l||!d)return;u.deadlines.push({id:nid(),label:l,date:d,done:false});u.deadlines.sort((a,b)=>a.date.localeCompare(b.date));break}
    case 'add-link':{const url=v('ml-u-'+u.id).trim();if(!url)return;u.materials.push({id:nid(),kind:'enllaç',title:v('ml-t-'+u.id).trim()||url,url,chars:0,date:todayISO()});break}
    case 'add-grade':{const val=parseFloat(String(v('g-v')).replace(',','.'));if(isNaN(val)||val<0||val>10)return;plan.grades.push({id:nid(),kind:v('g-k'),label:v('g-l').trim()||'Nota',value:val,tri:ui.tri||1});break}
    case 'news':{const t=v('nw-t').trim();if(!t)return;const k=ui.nwKind||'lliurament';const d=v('nw-d');if((k==='lliurament'||k==='examen')&&!d){$('#nw-d').focus();return}
      applyNewsItem({tipus:k,unitat:+v('nw-u'),titol:t,data:d,detall:v('nw-x').trim(),url:v('nw-l').trim()});closeModal();break}
    case 'import':{const st=$('#imp-st');try{const n=await importCode(v('imp-x'));closeModal();setSync(true,n?n+' element'+(n>1?'s':'')+' importat'+(n>1?'s':''):'Ja ho tenies tot');return}catch(x){st.className='small err';st.textContent=typeof x==='string'?x:'No s\'ha pogut importar.';return}}
    case 'unit':{const title=v('nu-t').trim();if(!title)return;const num=parseInt(v('nu-n'))||plan.units.length+1;const secs=v('nu-a').split('\n').map(s=>s.replace(/^[-*\d.)\s]+/,'').trim()).filter(Boolean);
      if(f.dataset.u){const ex=unitById(f.dataset.u);ex.title=title;ex.num=num;ex.summary=v('nu-s').trim();const add=secs.filter(s=>!ex.sections.includes(s));const last=ex.tasks.map(t=>t.kind).lastIndexOf('llegir');ex.tasks.splice(last+1,0,...add.map(readTask));ex.sections=secs}
      else{const nu=makeUnit(num,title,v('nu-s').trim(),secs,false);plan.units.push(nu);plan.units.sort((a,b)=>a.num-b.num);closeModal();Store.save();location.hash='#u-'+nu.id;return}
      plan.units.sort((a,b)=>a.num-b.num);closeModal();break}
    default:return;
  }
  Store.save();render();
});

/* ---------- boot ---------- */
if(NO_FIREBASE){$('#login').hidden=false;$('#loginform').innerHTML='<h3>No es pot connectar</h3><p class="muted">Comprova que tens internet i torna a carregar la pàgina.</p>'}
else if(DEMO){currentUser={email:'prova'};showApp();const d=document.createElement('div');d.className='demo';d.textContent='Mode de prova: encara falta connectar-la a Firebase (config.js).';$('#app header').after(d)}
else auth.onAuthStateChanged(user=>{currentUser=user;if(user)showApp();else{Store.stop();showLogin()}});
