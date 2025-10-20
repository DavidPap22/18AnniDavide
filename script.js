const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');

const cameraStreamEl = document.getElementById('cameraStream');
const holoVideo = document.getElementById('holoVideo');
const videoTapOverlay = document.getElementById('videoTapOverlay');
const tapToPlay = document.getElementById('tapToPlay');

const qr = document.getElementById('qrCode');
const demoVideo = document.getElementById('demoVideo');
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));

startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch(e){}
  startOverlay.style.display = 'none';
  try { await startCameraWithRetries(); } catch(e){ alert('Controlla HTTPS/permessi fotocamera'); return; }

  const CENTER_Y = 1.45, QR_Z = -5.8;
  qr.setAttribute('position', `0 ${CENTER_Y} ${QR_Z}`);
  qr.setAttribute('scale', '1.3 1.3 1');
  demoVideo.setAttribute('position', `0 ${CENTER_Y} ${QR_Z}`);
  replayLogo.setAttribute('position', `-0.9 ${CENTER_Y} ${QR_Z}`);
  whatsappLogo.setAttribute('position', `0.9 ${CENTER_Y} ${QR_Z}`);
  replayLogo.setAttribute('visible','false'); whatsappLogo.setAttribute('visible','false');
  replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

  distributeItems360(3.0);
  createParticles(36);
  createCeilingEffect(20);
  setupInteractions();
});

async function startCameraWithRetries(){
  if(!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia non supportato');
  cameraStreamEl.setAttribute('playsinline',''); cameraStreamEl.setAttribute('webkit-playsinline',''); cameraStreamEl.setAttribute('autoplay',''); cameraStreamEl.setAttribute('muted',''); cameraStreamEl.setAttribute('crossorigin','anonymous'); cameraStreamEl.style.objectFit='cover';

  const attempts = [
    { video:{facingMode:{ideal:'environment'}}, audio:false },
    { video:{facingMode:'environment'}, audio:false },
    { video:true, audio:false }
  ];
  let lastErr=null,stream=null;
  for(const c of attempts){ try{ stream=await navigator.mediaDevices.getUserMedia(c); if(stream) break; } catch(e){ lastErr=e; await wait(180);} }
  if(!stream) throw lastErr||new Error('Nessuno stream camera');

  cameraStreamEl.srcObject=stream; cameraStreamEl.muted=true; cameraStreamEl.playsInline=true;
  try { const p=cameraStreamEl.play(); if(p?.then) await p; } catch{}
  await new Promise(r => { let done=false; function onPlay(){ if(done) return; done=true; cameraStreamEl.removeEventListener('playing',onPlay); r(); } cameraStreamEl.addEventListener('playing',onPlay); setTimeout(()=>{ if(!done){ done=true; cameraStreamEl.removeEventListener('playing',onPlay); r(); }},1800); });

  const sky=document.getElementById('cameraSky'); sky.setAttribute('material','shader: flat; src: #cameraStream');
  forceSkyTextureUpdate(sky,1400,80);
}

function forceSkyTextureUpdate(skyEl,duration=1400,interval=80){
  const start=Date.now();
  const tid=setInterval(()=>{ try{ const m=skyEl.getObject3D('mesh'); if(m?.material?.map){ m.material.map.needsUpdate=true; m.material.needsUpdate=true; } } catch{} if(Date.now()-start>duration) clearInterval(tid); }, interval);
}

/* Distribuzione 360°: left/back/right mai frontale */
function distributeItems360(radius=3.0){
  const sectors = [{from: Math.PI/6, to: 5*Math.PI/6},{from:5*Math.PI/6,to:7*Math.PI/6},{from:7*Math.PI/6,to:11*Math.PI/6}];
  const heights = [1.35,1.6,1.85];
  let idx=0;
  for(const id of itemIds){
    const el=document.getElementById(id); if(!el) continue;
    const sector=sectors[idx%sectors.length];
    const frac=(Math.floor(idx/sectors.length)+Math.random()*0.6)/Math.max(1,Math.ceil(itemIds.length/sectors.length));
    const az=sector.from+frac*(sector.to-sector.from)+(Math.random()*0.08-0.04);
    const y=heights[idx%heights.length];
    const x=radius*Math.sin(az), z=radius*Math.cos(az);
    el.setAttribute('position',`${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale','0.95 0.95 0.95');
    el.setAttribute('look-at','#camera');
    el.classList.add('clickable'); idx++;
  }
}

/* Particles holo */
function createParticles(count=32){
  const root=document.getElementById('particles'); while(root.firstChild) root.removeChild(root.firstChild);
  for(let i=0;i<count;i++){
    const s=document.createElement('a-sphere');
    const px=(Math.random()*2-1)*3,py=Math.random()*2+0.6,pz=(Math.random()*2-1)*3;
    s.setAttribute('position',`${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    s.setAttribute('radius',(0.03+Math.random()*0.04).toFixed(3)); s.setAttribute('color','#ff2b2b');
    const tx=px+(Math.random()*0.6-0.3),ty=py+(Math.random()*0.6-0.3),tz=pz+(Math.random()*0.6-0.3),dur=1600+Math.random()*2600;
    s.setAttribute('animation',`property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);
    root.appendChild(s);
  }
}

/* Effetto tetto rosso oscillante */
function createCeilingEffect(count=20){
  const root=document.getElementById('particles');
  for(let i=0;i<count;i++){
    const s=document.createElement('a-sphere');
    const x=(Math.random()*4-2),z=(Math.random()*4-2),y=3.0+Math.random()*0.2;
    s.setAttribute('position',`${x} ${y} ${z}`);
    s.setAttribute('radius',(0.05+Math.random()*0.05).toFixed(2));
    s.setAttribute('color','#ff1a1a');
    s.setAttribute('animation',`property: position; to: ${x} ${y+0.3} ${z}; dur: 1000; dir: alternate; loop: true; easing: easeInOutSine`);
    root.appendChild(s);
  }
}

/* Interazioni QR/video/items */
function setupInteractions(){
  preserveVideoAspect();
  replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

  qr.addEventListener('click', async ()=>{
    qr.setAttribute('visible','false'); demoVideo.setAttribute('visible','true');
    try{ await holoVideo.play(); bgSavedTime=bgMusic.currentTime; bgMusic.pause(); } catch{ videoTapOverlay.style.display='flex'; }
  });

  tapToPlay?.addEventListener('click', async ()=>{
    videoTapOverlay.style.display='none';
    try{ await holoVideo.play(); bgSavedTime=bgMusic.currentTime; bgMusic.pause(); } catch{ alert('Impossibile avviare il video.'); }
  });

  holoVideo.addEventListener('ended', ()=>{
    demoVideo.setAttribute('visible','false');
    replayLogo.setAttribute('visible','true'); whatsappLogo.setAttribute('visible','true');
    replayLogo.classList.add('clickable'); whatsappLogo.classList.add('clickable');
    try{ bgMusic.currentTime=bgSavedTime||0; bgMusic.play(); } catch{}
  });

  replayLogo.addEventListener('click', async ()=>{
    if(!replayLogo.getAttribute('visible')) return;
    replayLogo.setAttribute('visible','false'); whatsappLogo.setAttribute('visible','false');
    replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');
    demoVideo.setAttribute('visible','true');
    try{ await holoVideo.play(); bgSavedTime=bgMusic.currentTime; bgMusic.pause(); } catch{ videoTapOverlay.style.display='flex'; }
  });

  whatsappLogo.addEventListener('click', ()=>{
    if(!whatsappLogo.getAttribute('visible')) return;
    window.open('https://wa.me/1234567890','_blank');
  });

  const audioMap={'Radio':'radio.mp3','Fantacalcio':'fantacalcio.mp3','Dj':'dj.mp3'};
  const linkMap={'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
                 'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
                 'Catania':'https://www.instagram.com/officialcataniafc/',
                 'Eduverse':'https://www.instagram.com/eduverse___/'};

  itemIds.forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('click', ()=>{
      if(audioMap[id]){ try{ bgSavedTime=bgMusic.currentTime; bgMusic.pause(); } catch{} const a=new Audio(audioMap[id]); a.play(); a.onended=()=>{ try{ bgMusic.currentTime=bgSavedTime||0; bgMusic.play(); } catch{} }; return; }
      if(id==='Tromba'){ window.open('https://youtu.be/AMK10N6wwHM','_blank'); return; }
      if(id==='Ballerino'){ window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return; }
      if(linkMap[id]){ window.open(linkMap[id],'_blank'); return; }
      window.open('https://instagram.com','_blank');
    });
  });
}

function preserveVideoAspect(){
  const src=holoVideo.querySelector('source')?.src||holoVideo.src;
  if(!src) return;
  const probe=document.createElement('video'); probe.preload='metadata'; probe.src=src; probe.muted=true; probe.playsInline=true;
  probe.addEventListener('loadedmetadata', ()=>{
    const w=probe.videoWidth,h=probe.videoHeight;
    if(w&&h){ const aspect=w/h,baseH=1.0; demoVideo.setAttribute('scale',`${baseH*aspect} ${baseH} 1`); }
  });
  probe.load();
}