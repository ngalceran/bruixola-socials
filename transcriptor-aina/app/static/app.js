/* Transcriptor AINA — interfície. Envia l'àudio a l'API, consulta l'estat i mostra els segments a mesura que arriben. */
'use strict';
const $ = s => document.querySelector(s);
let fitxer = null, urlAudio = null, segments = [], feina = null, models = [];

/* ---------- utilitats ---------- */
function ts(seg, sep = '.', ambHores = false) {
  const ms = Math.max(0, Math.round(seg * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  const p = (n, l = 2) => String(n).padStart(l, '0');
  const base = p(m) + ':' + p(s);
  return (ambHores || h ? p(h) + ':' : '') + base + (sep ? sep + p(r, 3) : '');
}
const ESTATS = { 'a-la-cua': 'A la cua', 'carregant-model': 'Carregant el model…', 'transcrivint': 'Transcrivint…', 'acabada': 'Acabada', 'error': 'Error' };

/* ---------- models ---------- */
async function carregaModels() {
  try {
    const r = await fetch('/api/models'); const d = await r.json();
    models = d.models;
    $('#model').innerHTML = models.map(m => `<option value="${m.id}"${m.id === d.per_defecte ? ' selected' : ''}>${m.nom}</option>`).join('');
    $('#avis-simulat').hidden = !d.simulat;
    mostraDescModel();
  } catch (e) { mostraError('No es pot connectar amb el servidor.'); $('#resultat').hidden = false; }
}
function mostraDescModel() { const m = models.find(x => x.id === $('#model').value); $('#desc-model').textContent = m ? m.descripcio + ' (' + m.repo + ')' : ''; }

/* ---------- selecció de fitxer ---------- */
function triaFitxer(f) {
  if (!f) return;
  fitxer = f;
  if (urlAudio) URL.revokeObjectURL(urlAudio);
  urlAudio = URL.createObjectURL(f);
  $('#reproductor').src = urlAudio;
  $('#nom-fitxer').textContent = f.name + ' · ' + (f.size / 1048576).toFixed(1) + ' MB';
  $('#seleccionat').hidden = false;
  $('#comenca').disabled = false;
}
$('#fitxer').addEventListener('change', e => triaFitxer(e.target.files[0]));
const drop = $('#drop');
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('sobre'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('sobre'); }));
drop.addEventListener('drop', e => triaFitxer(e.dataTransfer.files[0]));
$('#treu').addEventListener('click', () => {
  fitxer = null; $('#fitxer').value = ''; $('#reproductor').removeAttribute('src'); $('#seleccionat').hidden = true; $('#comenca').disabled = true;
});
$('#model').addEventListener('change', mostraDescModel);

/* ---------- gravació ---------- */
let gravador = null, trossos = [], rellotge = null;
$('#grava').addEventListener('click', async () => {
  if (gravador && gravador.state === 'recording') { gravador.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tipus = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    gravador = new MediaRecorder(stream, tipus ? { mimeType: tipus } : undefined);
    trossos = [];
    gravador.ondataavailable = e => e.data.size && trossos.push(e.data);
    gravador.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      clearInterval(rellotge); $('#temps-gravacio').hidden = true;
      $('#grava').classList.remove('gravant'); $('#grava span:last-child').textContent = 'Grava amb el micròfon';
      const mime = gravador.mimeType || 'audio/webm';
      const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
      const ara = new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', 'h');
      triaFitxer(new File(trossos, `gravacio ${ara}.${ext}`, { type: mime }));
    };
    gravador.start(1000);
    const inici = Date.now();
    $('#temps-gravacio').hidden = false; $('#temps-gravacio').textContent = '00:00';
    rellotge = setInterval(() => { $('#temps-gravacio').textContent = ts((Date.now() - inici) / 1000, ''); }, 500);
    $('#grava').classList.add('gravant'); $('#grava span:last-child').textContent = 'Atura la gravació';
  } catch (e) {
    alert('No es pot accedir al micròfon: ' + (e.message || e.name));
  }
});

/* ---------- transcripció ---------- */
function mostraError(txt) { $('#error').textContent = txt; $('#error').hidden = !txt; }
function posaEstat(f) {
  let txt = ESTATS[f.estat] || f.estat;
  if (f.estat === 'a-la-cua' && f.posicio_cua > 1) txt += ' (posició ' + f.posicio_cua + ')';
  if (f.estat === 'transcrivint' && f.progres) txt += ' ' + Math.round(f.progres * 100) + '%';
  $('#estat').textContent = txt;
  const barra = $('#progres');
  const indeterminat = f.estat === 'carregant-model' || f.estat === 'a-la-cua' || (f.estat === 'transcrivint' && !f.progres);
  barra.classList.toggle('indeterminat', indeterminat);
  barra.firstElementChild.style.width = indeterminat ? '' : Math.round((f.progres || 0) * 100) + '%';
  barra.hidden = f.estat === 'acabada' || f.estat === 'error';
}
function afegeixSegment(s, i) {
  const li = document.createElement('li');
  li.dataset.i = i;
  const b = document.createElement('button'); b.className = 't'; b.type = 'button'; b.textContent = ts(s.inici, ''); b.title = 'Escolta des d\'aquí';
  b.addEventListener('click', () => { const a = $('#reproductor'); a.currentTime = s.inici; a.play(); });
  const t = document.createElement('span'); t.className = 'text'; t.contentEditable = 'true'; t.spellcheck = true; t.lang = 'ca'; t.textContent = s.text;
  t.addEventListener('input', () => { segments[i].text = t.textContent; });
  li.append(b, t); $('#segments').append(li);
}

$('#comenca').addEventListener('click', async () => {
  if (!fitxer) return;
  segments = []; $('#segments').innerHTML = ''; mostraError(''); $('#accions').hidden = true;
  $('#resultat').hidden = false; $('#comenca').disabled = true;
  posaEstat({ estat: 'a-la-cua' }); $('#estat').textContent = 'Pujant l\'àudio…';
  const fd = new FormData();
  fd.append('fitxer', fitxer, fitxer.name);
  fd.append('model', $('#model').value);
  fd.append('idioma', $('#idioma').value);
  fd.append('vad', $('#vad').checked);
  fd.append('context', $('#context').value);
  try {
    const r = await fetch('/api/transcripcions', { method: 'POST', body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail || 'Error ' + r.status);
    feina = d.id;
    consulta(feina);
  } catch (e) { acaba(); mostraError(e.message); $('#progres').hidden = true; $('#estat').textContent = 'Error'; }
  $('#resultat').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

async function consulta(id) {
  if (id !== feina) return;
  try {
    const r = await fetch(`/api/transcripcions/${id}?des_de=${segments.length}`);
    const f = await r.json();
    if (!r.ok) throw new Error(f.detail || 'Error ' + r.status);
    for (const s of f.segments) { segments.push(s); afegeixSegment(s, segments.length - 1); }
    posaEstat(f);
    if (f.estat === 'acabada') {
      if (!segments.length) mostraError('No s\'ha detectat cap paraula en aquest àudio.');
      $('#accions').hidden = !segments.length; acaba(); return;
    }
    if (f.estat === 'error') { mostraError(f.error); acaba(); return; }
    setTimeout(() => consulta(id), 1200);
  } catch (e) { mostraError(e.message); acaba(); }
}
function acaba() { $('#comenca').disabled = !fitxer; }

/* Ressalta el segment que sona. */
$('#reproductor').addEventListener('timeupdate', e => {
  const t = e.target.currentTime;
  document.querySelectorAll('#segments li').forEach(li => {
    const s = segments[li.dataset.i]; li.classList.toggle('actiu', !!s && t >= s.inici && t < s.final);
  });
});

/* ---------- exportació (inclou les correccions fetes a mà) ---------- */
const net = () => segments.filter(s => s.text.trim());
const EXPORT = {
  txt: () => net().map(s => s.text.trim()).join('\n') + '\n',
  srt: () => net().map((s, i) => `${i + 1}\n${ts(s.inici, ',', true)} --> ${ts(s.final, ',', true)}\n${s.text.trim()}\n`).join('\n'),
  vtt: () => 'WEBVTT\n\n' + net().map(s => `${ts(s.inici, '.', true)} --> ${ts(s.final, '.', true)}\n${s.text.trim()}\n`).join('\n'),
  json: () => JSON.stringify({ model: (models.find(m => m.id === $('#model').value) || {}).repo, segments: net() }, null, 2),
};
document.querySelectorAll('#accions a[data-fmt]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const fmt = a.dataset.fmt;
  const blob = new Blob([EXPORT[fmt]()], { type: 'text/plain;charset=utf-8' });
  const u = URL.createObjectURL(blob);
  const enllac = document.createElement('a');
  enllac.href = u; enllac.download = (fitxer ? fitxer.name.replace(/\.[^.]+$/, '') : 'transcripcio') + '.' + fmt;
  enllac.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}));
$('#copia').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(EXPORT.txt()); $('#copia').textContent = 'Copiat!'; setTimeout(() => $('#copia').textContent = 'Copia el text', 1500); }
  catch (e) { alert('No s\'ha pogut copiar.'); }
});

carregaModels();
