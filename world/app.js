import { createWorld } from './world.js';
import { createWorldAudio } from './audio.js';
import { createPanelTypewriter } from './panel-typewriter.js';

const $ = selector => document.querySelector(selector);
const dialog = $('#content-dialog');
const panelTypewriter = createPanelTypewriter($('#panel-content'), dialog);
const visited = new Set();
let world, sound, toastTimer, lastFocus, currentDestination;
let navigation=0;
let gameEnding=false,restarting=false;
const gameOverDialog=$('#game-over-dialog');
const destinationOrder=['bio','experience','research','publications'];
const normalizeRoute=id=>({about:'bio',journey:'experience'}[id]||id);
let papers=[];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url,text) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${text} ↗</a>`;
const papersReady=fetch('./assets/papers.json').then(r=>{if(!r.ok)throw Error('Cannot load publications');return r.json();}).then(data=>papers=data).catch(()=>{toast('The archive could not load. Please refresh to try again.');return [];});

function toast(message) {
  clearTimeout(toastTimer);
  const notice=$('#toast');notice.textContent=message;notice.classList.add('visible');
  toastTimer=setTimeout(()=>{
    notice.classList.remove('visible');
    // Keep mobile panel space until the notification finishes fading out.
    toastTimer=setTimeout(()=>notice.textContent='',320);
  },4200);
}
// Reserve the notification's actual height above mobile reading panels.
new ResizeObserver(()=>document.documentElement.style.setProperty('--toast-height',`${$('#toast').offsetHeight}px`)).observe($('#toast'));

const sections = {
  bio: () => `<div class="eyebrow">01 · OXFORD · RADIANT</div><h2>Bio</h2><div class="panel-tag">HAN ZHOU · RESEARCH SCIENTIST</div><div style="margin-top:24px"><img class="profile" src="assets/profile.jpg" alt="Han Zhou"><p>I am a Research Scientist at <strong>Mistral AI</strong>, where I work on <strong>coding agents</strong> and <strong>LLM post-training</strong>.</p><p>Previously, I was a Student Researcher at <strong>Google DeepMind</strong>, working on self-improving agents.</p><p>I hold an MEng in Engineering Science from the <strong>University of Oxford</strong> and am a PhD candidate in NLP at the <strong>University of Cambridge</strong>.</p></div><div class="panel-links">${external('https://scholar.google.com/citations?user=7pXfJVgAAAAJ','Google Scholar')}${external('https://github.com/hanzhou032','GitHub')}${external('https://www.linkedin.com/in/hanzhou032','LinkedIn')}<a href="mailto:hz416@cam.ac.uk">Email ↗</a></div><h3>In service of discovery</h3><p>Reviewer and program committee member for ACL (2023–24), EMNLP (2022–24), ICML (2024–26), NeurIPS (2023–26), and ICLR (2025–26).</p>`,
  research: () => `<div class="eyebrow">03 · LEARNING & AGENTS</div><h2>Research</h2><div class="interest"><span class="number">I</span><h3>Post-training & reinforcement learning</h3><p>Improving language models beyond pre-training, through feedback, rewards, and better reasoning strategies.</p>${external('https://arxiv.org/abs/2606.09380','Reasoning Arena')}&nbsp; ${external('https://arxiv.org/abs/2512.01945','Policy co-evolution')}</div><div class="interest"><span class="number">II</span><h3>Self-improving agents</h3><p>Systems that refine their own capabilities through iteration, orchestration, and experience.</p>${external('https://arxiv.org/abs/2509.10704','Maestro')}&nbsp; ${external('https://arxiv.org/abs/2502.00330','BRIDGE')}</div><div class="interest"><span class="number">III</span><h3>Automating agent & prompt design</h3><p>Searching for better prompts, agent configurations, and multi-agent collaboration structures.</p>${external('https://arxiv.org/abs/2502.02533','MASS')}&nbsp; ${external('https://arxiv.org/abs/2310.12774','ClaPS')}</div><div class="interest"><span class="number">IV</span><h3>Evaluation & calibration</h3><p>Understanding what models know, where they fall short, and how to make their judgments more reliable.</p>${external('https://arxiv.org/abs/2309.17249','Batch Calibration')}&nbsp; ${external('https://arxiv.org/abs/2406.11370','ZEPO')}</div>`,
  publications: () => `<div class="eyebrow">04 · PAPERS & CODE</div><h2>Publications</h2><label for="paper-search" class="sr-only">Search publication titles, authors, or venues</label><input class="paper-search" id="paper-search" type="search" placeholder="Search the archive…" autocomplete="off"><div class="paper-filters" role="group" aria-label="Filter publications"><button data-filter="all" class="active" aria-pressed="true">All papers</button><button data-filter="selected" aria-pressed="false">Selected</button><button data-filter="2026" aria-pressed="false">2026</button><button data-filter="2025" aria-pressed="false">2025</button><button data-filter="2024" aria-pressed="false">2024</button><button data-filter="earlier" aria-pressed="false">Earlier</button></div><div id="paper-count" class="result-count" role="status"></div><div id="paper-list"><p>Opening the archive…</p></div>`,
  experience: () => `<div class="eyebrow">02 · CAMBRIDGE · DIRE</div><h2>Experience</h2><div class="timeline-title">INDUSTRY</div><div class="timeline-item"><span class="date">PRESENT</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/mistral.png" width="42" height="42" alt=""><h3>Mistral AI</h3></div><p>Research Scientist<br>Previously, AI Scientist Intern</p></div><div class="timeline-item"><div class="timeline-organization"><img class="organization-logo" src="assets/logos/gdm.png" width="42" height="42" alt=""><h3>Google DeepMind</h3></div><p>Student Researcher · Self-improving agents</p></div><div class="timeline-item"><span class="date">FROM JULY 2024</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/gcloud.png" width="42" height="42" alt=""><h3>Google Cloud AI Research</h3></div><p>Student Researcher</p></div><div class="timeline-item"><div class="timeline-organization"><img class="organization-logo" src="assets/google.svg" width="42" height="42" alt=""><h3>Google Research</h3></div><p>Student Researcher</p></div><div class="timeline-title">EDUCATION</div><div class="timeline-item"><span class="date">2022 — 2026</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/cambridge.png" width="42" height="42" alt=""><h3>University of Cambridge</h3></div><p>PhD in Computation, Cognition, and Language (NLP)</p></div><div class="timeline-item"><span class="date">2020 — 2021</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/ucl.png" width="42" height="42" alt=""><h3>University College London</h3></div><p>MSc in Machine Learning · Ranked 1st</p></div><div class="timeline-item"><span class="date">2015 — 2019</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/oxford.png" width="42" height="42" alt=""><h3>University of Oxford</h3></div><p>BA, MEng in Engineering Science</p></div><div class="timeline-title">RECENT DISPATCHES</div><div class="news-item"><small>APRIL 2026</small>Attended ICLR 2026 in person in Brazil.</div><div class="news-item"><small>JANUARY 2026</small>MASS and Visual Planning accepted at ICLR 2026.</div><div class="news-item"><small>JANUARY 2025</small>BRIDGE accepted at ICLR 2025.</div>`
};

function cleanAuthor(author){return author.replace(/\\'c/g,'ć').replace(/\\v\{s\}/g,'š').replace(/\\"O/g,'Ö').replace(/\\i\b/g,'ı').replace(/[{}]/g,'').replace(/ and /g,' · ');}
function mountPapers() {
  if(currentDestination!=='publications')return;
  let filter='all';const input=$('#paper-search');if(!input)return;
  function render(){
    panelTypewriter.finish();
    const q=input.value.toLowerCase().trim();
    const matching=papers.filter(p=>((filter==='all')||(filter==='selected'&&p.selected==='true')||(filter==='earlier'&&+p.year<2024)||p.year===filter)&&`${p.title} ${p.author} ${p.abbr} ${p.year}`.toLowerCase().includes(q));
    $('#paper-count').textContent=`${matching.length} ${matching.length===1?'paper':'papers'}${q?' matching your search':''}`;
    $('#paper-list').innerHTML=matching.length?matching.map(p=>`<article class="paper"><div class="paper-meta"><span>${escape(p.abbr||'RESEARCH')}</span><span>${escape(p.year)}</span>${p.selected==='true'?'<span>✦ SELECTED</span>':''}</div><h3>${escape(p.title)}</h3><div class="authors">${escape(cleanAuthor(p.author))}</div><div class="paper-links">${p.arxiv?external('https://arxiv.org/abs/'+p.arxiv,'arXiv'):''}${p.html?external(p.html,'Publication'):''}${p.code?external(p.code,'Code'):''}${p.website?external(p.website,'Project'):''}</div></article>`).join(''):'<p>No papers match this search. Try another title, author, or year.</p>';
  }
  input.addEventListener('input',render);
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();}));render();
}

async function visit(id,{opening=false}={}) {
  if(gameEnding)return;
  document.body.classList.remove('watching-battle');
  id=normalizeRoute(id);
  if(!sections[id])return;
  const request=++navigation;
  panelTypewriter.finish();
  lastFocus=document.activeElement;
  $('#intro').classList.add('explored');
  const arrival=world?.focus(id,{opening});
  if(opening&&world){
    document.body.classList.add('arriving');
    const arrived=await arrival;
    if(request!==navigation)return;
    document.body.classList.remove('arriving');
    if(!arrived)return;
  }
  if(id==='publications'){
    await papersReady;
    if(request!==navigation)return;
  }
  document.body.classList.remove('arriving');
  currentDestination=id;
  document.body.dataset.activeDestination=id;
  $('#base-caption').innerHTML=id==='bio'?'<small>OXFORD · THE RADIANT</small>Radcliffe Camera & Tom Tower':id==='experience'?'<small>CAMBRIDGE · THE DIRE</small>King’s College Chapel & Trinity Gate':id==='research'?'<small>RESEARCH · MISTRAL</small>The pixel laboratory':'<small>PUBLICATIONS · GOOGLE</small>The Google archive';
  const isNew=!visited.has(id);visited.add(id);$('#visited-count').textContent=visited.size;
  if(isNew&&visited.size===4)toast('The realm is yours. All four landmarks discovered.');
  document.querySelectorAll('.progress-pips i').forEach((p,i)=>p.classList.toggle('visited',i<visited.size));
  document.querySelectorAll('[data-destination]').forEach(b=>{b.classList.toggle('selected',b.dataset.destination===id);if(b.classList.contains('landmark'))b.classList.toggle('visited',visited.has(b.dataset.destination));});
  document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.destination===id));
  $('#panel-content').innerHTML=sections[id]();$('#panel-content h2').id='panel-title';$('#panel-title').tabIndex=-1;
  if(id==='publications')mountPapers();
  if(!dialog.open)dialog.show();dialog.scrollTop=0;document.body.classList.add('panel-open');
  (opening?$('#panel-title'):$('.close-panel')).focus({preventScroll:true});
  history.replaceState(null,'','#'+id);
  panelTypewriter.start(isNew);
}
function closePanel(reset=true){
  panelTypewriter.finish();
  navigation++;document.body.classList.remove('arriving','watching-battle');delete document.body.dataset.activeDestination;$('#base-caption').textContent='';
  if(dialog.open)dialog.close();document.body.classList.remove('panel-open');currentDestination=null;
  document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.hasAttribute('data-home')));
  document.querySelectorAll('.destination-dock button').forEach(b=>b.classList.remove('selected'));
  if(reset)world?.reset($('#intro').classList.contains('explored'));
  history.replaceState(null,'',location.pathname+'#world');if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
function selectDestination(id){
  if(gameEnding)return;
  id=normalizeRoute(id);
  const side=id==='bio'?0:id==='experience'?1:null;
  visit(id);
  if(side!==null&&world?.reinforce(side))toast(`+1 ${side?'Cambridge':'Oxford'} Meepo`);
}
document.querySelectorAll('[data-destination]').forEach(b=>b.addEventListener('click',()=>selectDestination(b.dataset.destination)));
$('.close-panel').addEventListener('click',()=>closePanel());dialog.addEventListener('cancel',()=>closePanel());
function watchBattle(){if(gameEnding)return;closePanel(false);$('#intro').classList.add('explored');document.body.classList.add('watching-battle');history.replaceState(null,'','#battle');world?.watchBattle();}
$('#watch-battle').addEventListener('click',watchBattle);
function home(){if(gameEnding)return;closePanel(false);$('#intro').classList.remove('explored');document.body.dataset.entry='overview';world?.reset();}
addEventListener('hashchange',()=>{
  const route=normalizeRoute(location.hash.slice(1));
  if(route==='world'){home();return;}
  if(route==='battle'){watchBattle();return;}
  if(sections[route]||!route)visit(route||'bio',{opening:!route});
});
document.querySelectorAll('[data-home],.identity').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();home();}));
$('#explore').addEventListener('click',()=>{if(gameEnding)return;navigation++;$('#intro').classList.add('explored');world?.reset(true);toast('Choose a glowing landmark to discover the world behind my work.');});
$('#reset-camera').addEventListener('click',()=>{if(gameEnding)return;closePanel(false);world?.reset($('#intro').classList.contains('explored'));toast('Returned to the realm overview.');});
$('#time-toggle').addEventListener('click',()=>{if(!world)return;const night=world.toggleNight();$('#realm-time').textContent=night?'NIGHT IN THE REALM':'DUSK IN THE REALM';$('#time-toggle').setAttribute('aria-label',night?'Switch to dusk':'Switch to night');$('#time-toggle').innerHTML=night?'<svg viewBox="0 0 24 24"><path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z"/></svg>':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg>';});

// Every page visit starts silent. Only the sound button or M enables audio.
function updateSoundControls(enabled){
  document.querySelectorAll('#sound-toggle,[data-sound-toggle]').forEach(button=>{
    button.setAttribute('aria-pressed',String(enabled));
    button.setAttribute('aria-label',enabled?'Mute music and battle sounds':'Enable music and battle sounds');
    button.innerHTML=enabled?'<svg viewBox="0 0 24 24"><path d="M11 4L5 9H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 4L5 9H2v6h3l6 5zM16 9l6 6m0-6-6 6"/></svg>';
  });
}
function updateMusicStatus(state){
  const status=$('#music-status');
  status.textContent={playing:'Playing Islands of Discovery',loading:'Loading Islands of Discovery…',paused:'Muted',unavailable:'Music could not play. Toggle sound to retry; battle sounds remain available.'}[state];
}
document.querySelectorAll('#sound-toggle,[data-sound-toggle]').forEach(button=>button.addEventListener('click',async()=>{
  try{
    sound ||= createWorldAudio({onMusicState:updateMusicStatus});const enabled=await sound.toggle();updateSoundControls(enabled);
    toast(enabled?'Music and battle sounds on.':'Music and battle sounds muted.');
  }catch{toast('Audio is unavailable in this browser.');}
}));
updateSoundControls(false);
addEventListener('pagehide',event=>{
  if(event.persisted){sound?.setEnabled(false);updateSoundControls(false);}
  else sound?.dispose();
});
function combatSound(event,state){
  const side=state.units.find(u=>u.id===event.attacker)?.side||0;
  sound?.hit({critical:event.critical,base:event.type==='base-hit',pan:side ? .22 : -.22,quiet:dialog.open});
}
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Use your browser’s fullscreen command to expand the realm.');}catch{toast('Use your browser’s fullscreen command to expand the realm.');}});
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
$('#help').addEventListener('click',()=>{if(!gameEnding)$('#help-dialog').showModal();});$('.close-help').addEventListener('click',()=>$('#help-dialog').close());
$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#restore-ui').addEventListener('click',()=>document.body.classList.remove('cinematic'));
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea')||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key.toLowerCase()==='m'&&!e.repeat){$('#sound-toggle').click();return;}
  if(gameEnding||gameOverDialog.open)return;
  if(e.key==='Escape'){document.body.classList.remove('cinematic');if(dialog.open||document.body.classList.contains('arriving'))closePanel();return;}
  if($('#help-dialog').open)return;
  if(['1','2','3','4'].includes(e.key)&&!e.repeat)selectDestination(destinationOrder[+e.key-1]);
  if(e.key.toLowerCase()==='b')watchBattle();
  if(e.key.toLowerCase()==='r')$('#reset-camera').click();
  if(e.key.toLowerCase()==='h'){if(dialog.open)closePanel(false);document.body.classList.toggle('cinematic');}
});

function baseDestroyed(event){
  gameEnding=true;
  closePanel(false);$('#help-dialog').close();
  document.body.classList.remove('cinematic');document.body.classList.add('base-collapsing');
  clearTimeout(toastTimer);$('#toast').classList.remove('visible');$('#toast').textContent='';
  $('#intro').classList.add('explored');
  $('#game-outcome').textContent=`${event.side?'Cambridge':'Oxford'} has fallen`;
}
function gameOver(event){
  if(event.fallen.length===2)$('#game-outcome').textContent='Both bases have fallen';
  if(!gameOverDialog.open)gameOverDialog.showModal();
}
gameOverDialog.querySelectorAll('[data-restart-world]').forEach(button=>button.addEventListener('click',()=>gameOverDialog.close()));
gameOverDialog.addEventListener('close',()=>{
  if(restarting)return;
  restarting=true;
  // A fresh document resets the simulation, GPU scene, camera and panel reveals.
  location.replace(location.pathname+location.search);
});

async function enterInitialDestination(){
  await world.ready;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,300));
  if(navigation!==0)return;
  const route=normalizeRoute(location.hash.slice(1));
  if(route==='world'){document.body.dataset.entry='overview';return;}
  if(route==='battle'){watchBattle();document.body.dataset.entry='battle';return;}
  await visit(sections[route]?route:'bio',{opening:true});
  document.body.dataset.entry='complete';
}
try {
  world=createWorld(selectDestination,{onBaseDestroyed:baseDestroyed,onGameOver:gameOver,onHit:combatSound});
  window.realm={visit,watchBattle,get battle(){return world.battle;},get lane(){return world.lane;},reset:()=>world.reset(),get scene(){return world.scene;},get renderer(){return world.renderer;},get camera(){return world.camera;}};
  enterInitialDestination();
}catch(error){
  console.error('World initialization failed',error);
  $('#watch-battle').disabled=true;
  document.body.classList.add('fallback');$('#loading').classList.add('loaded');
  toast('3D is unavailable in this browser. Bio, experience, research, and publications are available below.');
  const route=normalizeRoute(location.hash.slice(1));
  visit(sections[route]?route:'bio');
  $('#explore').textContent='Open Bio';$('#explore').addEventListener('click',()=>visit('bio'));
}
