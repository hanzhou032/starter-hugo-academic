import { createWorld } from './world.js';

const $ = selector => document.querySelector(selector);
const dialog = $('#content-dialog');
const visited = new Set();
let world, sound, toastTimer, lastFocus, currentDestination;
let navigation=0;
const destinationOrder=['bio','experience','research','publications'];
const normalizeRoute=id=>({about:'bio',journey:'experience'}[id]||id);
let papers=[];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url,text) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${text} ↗</a>`;
const papersReady=fetch('./assets/papers.json').then(r=>{if(!r.ok)throw Error('Cannot load publications');return r.json();}).then(data=>papers=data).catch(()=>{toast('The archive could not load. Please refresh to try again.');return [];});

function toast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}

const sections = {
  bio: () => `<div class="eyebrow">01 · OXFORD · RADIANT</div><h2>Bio</h2><div class="panel-tag">HAN ZHOU · RESEARCH SCIENTIST</div><div style="margin-top:24px"><img class="profile" src="assets/profile.jpg" alt="Han Zhou"><p>I am a Research Scientist at <strong>Mistral AI</strong>, where I work on <strong>coding agents</strong> and <strong>LLM post-training</strong>.</p><p>Previously, I was a Student Researcher at <strong>Google DeepMind</strong>, working on self-improving agents.</p><p>I hold an MEng in Engineering Science from the <strong>University of Oxford</strong> and am a PhD candidate in NLP at the <strong>University of Cambridge</strong>.</p></div><div class="panel-links">${external('https://scholar.google.com/citations?user=7pXfJVgAAAAJ','Google Scholar')}${external('https://github.com/hanzhou032','GitHub')}${external('https://www.linkedin.com/in/hanzhou032','LinkedIn')}<a href="mailto:hz416@cam.ac.uk">Email ↗</a></div><h3>In service of discovery</h3><p>Reviewer and program committee member for ACL (2023–24), EMNLP (2022–24), ICML (2024–26), NeurIPS (2023–26), and ICLR (2025–26).</p>`,
  research: () => `<div class="eyebrow">03 · LEARNING & AGENTS</div><h2>Research</h2><p>How can agents learn to reason, improve their own strategies, and work together? Four connected directions shape my research.</p><div class="interest"><span class="number">I</span><h3>Post-training & reinforcement learning</h3><p>Improving language models beyond pre-training, through feedback, rewards, and better reasoning strategies.</p>${external('https://arxiv.org/abs/2606.09380','Reasoning Arena')}&nbsp; ${external('https://arxiv.org/abs/2512.01945','Policy co-evolution')}</div><div class="interest"><span class="number">II</span><h3>Self-improving agents</h3><p>Systems that refine their own capabilities through iteration, orchestration, and experience.</p>${external('https://arxiv.org/abs/2509.10704','Maestro')}&nbsp; ${external('https://arxiv.org/abs/2502.00330','BRIDGE')}</div><div class="interest"><span class="number">III</span><h3>Automating agent & prompt design</h3><p>Searching for better prompts, agent configurations, and multi-agent collaboration structures.</p>${external('https://arxiv.org/abs/2502.02533','MASS')}&nbsp; ${external('https://arxiv.org/abs/2310.12774','ClaPS')}</div><div class="interest"><span class="number">IV</span><h3>Evaluation & calibration</h3><p>Understanding what models know, where they fall short, and how to make their judgments more reliable.</p>${external('https://arxiv.org/abs/2309.17249','Batch Calibration')}&nbsp; ${external('https://arxiv.org/abs/2406.11370','ZEPO')}</div>`,
  publications: () => `<div class="eyebrow">04 · PAPERS & CODE</div><h2>Publications</h2><p>Research in language, learning, and autonomous agents. Explore the complete archive from my academic site.</p><label for="paper-search" class="sr-only">Search publication titles, authors, or venues</label><input class="paper-search" id="paper-search" type="search" placeholder="Search the archive…" autocomplete="off"><div class="paper-filters" role="group" aria-label="Filter publications"><button data-filter="all" class="active" aria-pressed="true">All papers</button><button data-filter="selected" aria-pressed="false">Selected</button><button data-filter="2026" aria-pressed="false">2026</button><button data-filter="2025" aria-pressed="false">2025</button><button data-filter="2024" aria-pressed="false">2024</button><button data-filter="earlier" aria-pressed="false">Earlier</button></div><div id="paper-count" class="result-count" role="status"></div><div id="paper-list"><p>Opening the archive…</p></div>`,
  experience: () => `<div class="eyebrow">02 · CAMBRIDGE · DIRE</div><h2>Experience</h2><p>From engineering at Oxford to building the next generation of intelligent agents.</p><div class="timeline-title">INDUSTRY</div><div class="timeline-item"><span class="date">PRESENT</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/mistral.png" width="42" height="42" alt=""><h3>Mistral AI</h3></div><p>Research Scientist<br>Previously, AI Scientist Intern</p></div><div class="timeline-item"><div class="timeline-organization"><img class="organization-logo" src="assets/logos/gdm.png" width="42" height="42" alt=""><h3>Google DeepMind</h3></div><p>Student Researcher · Self-improving agents</p></div><div class="timeline-item"><span class="date">FROM JULY 2024</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/gcloud.png" width="42" height="42" alt=""><h3>Google Cloud AI Research</h3></div><p>Student Researcher</p></div><div class="timeline-item"><div class="timeline-organization"><img class="organization-logo" src="assets/google.svg" width="42" height="42" alt=""><h3>Google Research</h3></div><p>Student Researcher</p></div><div class="timeline-title">EDUCATION</div><div class="timeline-item"><span class="date">2022 — 2026</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/cambridge.png" width="42" height="42" alt=""><h3>University of Cambridge</h3></div><p>PhD in Computation, Cognition, and Language (NLP)</p></div><div class="timeline-item"><span class="date">2020 — 2021</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/ucl.png" width="42" height="42" alt=""><h3>University College London</h3></div><p>MSc in Machine Learning · Ranked 1st</p></div><div class="timeline-item"><span class="date">2015 — 2019</span><div class="timeline-organization"><img class="organization-logo" src="assets/logos/oxford.png" width="42" height="42" alt=""><h3>University of Oxford</h3></div><p>BA, MEng in Engineering Science</p></div><div class="timeline-title">RECENT DISPATCHES</div><div class="news-item"><small>APRIL 2026</small>Attended ICLR 2026 in person in Brazil.</div><div class="news-item"><small>JANUARY 2026</small>MASS and Visual Planning accepted at ICLR 2026.</div><div class="news-item"><small>JANUARY 2025</small>BRIDGE accepted at ICLR 2025.</div>`
};

function cleanAuthor(author){return author.replace(/\\'c/g,'ć').replace(/\\v\{s\}/g,'š').replace(/\\"O/g,'Ö').replace(/\\i\b/g,'ı').replace(/[{}]/g,'').replace(/ and /g,' · ');}
async function mountPapers() {
  await papersReady;if(currentDestination!=='publications')return;
  let filter='all';const input=$('#paper-search');if(!input)return;
  function render(){
    const q=input.value.toLowerCase().trim();
    const matching=papers.filter(p=>((filter==='all')||(filter==='selected'&&p.selected==='true')||(filter==='earlier'&&+p.year<2024)||p.year===filter)&&`${p.title} ${p.author} ${p.abbr} ${p.year}`.toLowerCase().includes(q));
    $('#paper-count').textContent=`${matching.length} ${matching.length===1?'paper':'papers'}${q?' matching your search':''}`;
    $('#paper-list').innerHTML=matching.length?matching.map(p=>`<article class="paper"><div class="paper-meta"><span>${escape(p.abbr||'RESEARCH')}</span><span>${escape(p.year)}</span>${p.selected==='true'?'<span>✦ SELECTED</span>':''}</div><h3>${escape(p.title)}</h3><div class="authors">${escape(cleanAuthor(p.author))}</div><div class="paper-links">${p.arxiv?external('https://arxiv.org/abs/'+p.arxiv,'arXiv'):''}${p.html?external(p.html,'Publication'):''}${p.code?external(p.code,'Code'):''}${p.website?external(p.website,'Project'):''}</div></article>`).join(''):'<p>No papers match this search. Try another title, author, or year.</p>';
  }
  input.addEventListener('input',render);
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();}));render();
}

async function visit(id,{opening=false}={}) {
  document.body.classList.remove('watching-battle');
  id=normalizeRoute(id);
  if(!sections[id])return;
  const request=++navigation;
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
  if(!dialog.open)dialog.show();dialog.scrollTop=0;document.body.classList.add('panel-open');
  (opening?$('#panel-title'):$('.close-panel')).focus({preventScroll:true});
  history.replaceState(null,'','#'+id);
  if(id==='publications')mountPapers();
}
function closePanel(reset=true){
  navigation++;document.body.classList.remove('arriving','watching-battle');delete document.body.dataset.activeDestination;$('#base-caption').textContent='';
  if(dialog.open)dialog.close();document.body.classList.remove('panel-open');currentDestination=null;
  document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.hasAttribute('data-home')));
  document.querySelectorAll('.destination-dock button').forEach(b=>b.classList.remove('selected'));
  if(reset)world?.reset($('#intro').classList.contains('explored'));
  history.replaceState(null,'',location.pathname+'#world');if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
document.querySelectorAll('[data-destination]').forEach(b=>b.addEventListener('click',()=>visit(b.dataset.destination)));
$('.close-panel').addEventListener('click',()=>closePanel());dialog.addEventListener('cancel',()=>closePanel());
function watchBattle(){closePanel(false);$('#intro').classList.add('explored');document.body.classList.add('watching-battle');history.replaceState(null,'','#battle');world?.watchBattle();}
$('#watch-battle').addEventListener('click',watchBattle);
function home(){closePanel(false);$('#intro').classList.remove('explored');document.body.dataset.entry='overview';world?.reset();}
addEventListener('hashchange',()=>{
  const route=normalizeRoute(location.hash.slice(1));
  if(route==='world'){home();return;}
  if(route==='battle'){watchBattle();return;}
  if(sections[route]||!route)visit(route||'bio',{opening:!route});
});
document.querySelectorAll('[data-home],.identity').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();home();}));
$('#explore').addEventListener('click',()=>{navigation++;$('#intro').classList.add('explored');world?.reset(true);toast('Choose a glowing landmark to discover the world behind my work.');});
$('#reset-camera').addEventListener('click',()=>{closePanel(false);world?.reset($('#intro').classList.contains('explored'));toast('Returned to the realm overview.');});
$('#time-toggle').addEventListener('click',()=>{if(!world)return;const night=world.toggleNight();$('#realm-time').textContent=night?'NIGHT IN THE REALM':'DUSK IN THE REALM';$('#time-toggle').setAttribute('aria-label',night?'Switch to dusk':'Switch to night');$('#time-toggle').innerHTML=night?'<svg viewBox="0 0 24 24"><path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z"/></svg>':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg>';});

// A quiet synthesized forest ambience. Audio starts only after a user gesture.
function createAmbient(){
  const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw Error('Audio unavailable');
  const context=new AudioContext(),master=context.createGain();master.gain.value=0;master.connect(context.destination);
  const seconds=8,buffer=context.createBuffer(2,context.sampleRate*seconds,context.sampleRate);
  for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.02)/1.02;data[i]=last*3.5;}}
  const source=context.createBufferSource();source.buffer=buffer;source.loop=true;const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=650;source.connect(low);low.connect(master);source.start();
  for(const [frequency,volume] of [[110,.013],[164.81,.009],[220,.005]]){const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=frequency;g.gain.value=volume;o.connect(g);g.connect(master);o.start();}
  let enabled=false;return {async toggle(){enabled=!enabled;await context.resume();master.gain.setTargetAtTime(enabled?.23:0,context.currentTime,.7);return enabled;}};
}
$('#sound-toggle').addEventListener('click',async()=>{try{sound ||= createAmbient();const enabled=await sound.toggle();$('#sound-toggle').setAttribute('aria-pressed',String(enabled));$('#sound-toggle').setAttribute('aria-label',enabled?'Disable ambient sound':'Enable ambient sound');$('#sound-toggle').innerHTML=enabled?'<svg viewBox="0 0 24 24"><path d="M11 4L5 9H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 4L5 9H2v6h3l6 5zM16 9l6 6m0-6-6 6"/></svg>';toast(enabled?'Forest ambience on.':'Ambient sound off.');}catch{toast('Ambient audio is unavailable in this browser.');}});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Use your browser’s fullscreen command to expand the realm.');}catch{toast('Use your browser’s fullscreen command to expand the realm.');}});
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
$('#help').addEventListener('click',()=>$('#help-dialog').showModal());$('.close-help').addEventListener('click',()=>$('#help-dialog').close());
$('#help-dialog').addEventListener('click',e=>{if(e.target===$('#help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#restore-ui').addEventListener('click',()=>document.body.classList.remove('cinematic'));
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea')||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='Escape'){document.body.classList.remove('cinematic');if(dialog.open||document.body.classList.contains('arriving'))closePanel();return;}
  if($('#help-dialog').open)return;
  if(['1','2','3','4'].includes(e.key))visit(destinationOrder[+e.key-1]);
  if(e.key.toLowerCase()==='b')watchBattle();
  if(e.key.toLowerCase()==='r')$('#reset-camera').click();if(e.key.toLowerCase()==='m')$('#sound-toggle').click();
  if(e.key.toLowerCase()==='h'){if(dialog.open)closePanel(false);document.body.classList.toggle('cinematic');}
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
  world=createWorld(visit);
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
