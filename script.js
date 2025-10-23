/* script.js - effetti avanzati integrati
   - molte animazioni: luci, fog, particelle (scintille/confetti), smoke, ring/halo, holo text,
   - WebAudio analyzer per sincronizzare luci con musica
   - items sullo stesso piano, non sovrapposti, fluttuanti e rivolti alla camera
   - QR rimane vicino e libero
*/

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

/* ---------- start gesture ---------- */
startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch(e) {}
  startOverlay.style.display = 'none';

  try {
    await startCameraWithRetries();
  } catch (err) {
    console.error('camera start failed', err);
    alert('Impossibile avviare la fotocamera. Controlla permessi/HTTPS.');
    return;
  }

  // QR più vicino e piano basso
  qr.setAttribute('position', '0 1.05 -1.1');
  qr.setAttribute('scale', '1.15 1.15 1');
  demoVideo.setAttribute('position','0 1.05 -1.1');

  // logos (booleans)
  replayLogo.setAttribute('visible', false);
  whatsappLogo.setAttribute('visible', false);
  replayLogo.classList.remove('clickable');
  whatsappLogo.classList.remove('clickable');

  // posiziona items su cerchio unico piano (alto rispetto al QR)
  distributeItemsCirclePlane(2.2, 2.4); // radius, height

  // effetti
  createScintille(40);
  createConfetti(18);
  createSmoke(18);
  createHoloTextAnimation();
  animateLightsSetup();
  setupAudioAnalyzer(); // sincronizza luci con musica (se permesso)
  setupInteractions();
});

/* ---------- camera start + sky mapping ---------- */
async function startCameraWithRetries(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('getUserMedia non supportato');
  cameraStreamEl.setAttribute('playsinline',''); cameraStreamEl.setAttribute('webkit-playsinline','');
  cameraStreamEl.setAttribute('autoplay',''); cameraStreamEl.setAttribute('muted',''); cameraStreamEl.setAttribute('crossorigin','anonymous');
  cameraStreamEl.style.objectFit = 'cover';

  const attempts = [
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    { video: { facingMode: 'environment' }, audio: false },
    { video: true, audio: false }
  ];

  let lastErr = null, stream = null;
  for(const c of attempts){
    try { stream = await navigator.mediaDevices.getUserMedia(c); if(stream) break; }
    catch(e){ lastErr = e; console.warn('attempt failed', e); await wait(180); }
  }
  if(!stream) throw lastErr || new Error('Nessuno stream camera ottenuto');

  cameraStreamEl.srcObject = stream;
  cameraStreamEl.muted = true;
  cameraStreamEl.playsInline = true;
  try { await cameraStreamEl.play(); } catch(e){ console.warn('camera play rejected', e); }

  // wait short while for frames then bind to sky
  await new Promise(resolve => {
    let done = false;
    function onPlay(){ if(done) return; done = true; cameraStreamEl.removeEventListener('playing', onPlay); resolve(); }
    cameraStreamEl.addEventListener('playing', onPlay);
    setTimeout(()=>{ if(!done){ done = true; cameraStreamEl.removeEventListener('playing', onPlay); resolve(); } }, 1800);
  });

  const sky = document.getElementById('cameraSky');
  sky.setAttribute('material', 'shader: flat; src: #cameraStream');
  forceSkyTextureUpdate(sky, 2200, 60);
}

/* helper to nudge three.js texture updates */
function forceSkyTextureUpdate(skyEl, duration = 2200, interval = 60){
  const start = Date.now();
  const tid = setInterval(()=>{
    try {
      const mesh = skyEl.getObject3D('mesh');
      if(mesh && mesh.material && mesh.material.map){
        mesh.material.map.needsUpdate = true;
        mesh.material.needsUpdate = true;
      }
    } catch(e){}
    if(Date.now() - start > duration) clearInterval(tid);
  }, interval);
}

/* ---------- ITEMS: circle on one plane, non-overlapping ---------- */
function distributeItemsCirclePlane(radius = 2.0, height = 2.2){
  const count = itemIds.length;
  const step = (2 * Math.PI) / count;
  for(let i=0;i<count;i++){
    const id = itemIds[i];
    const el = document.getElementById(id);
    if(!el) continue;
    const angle = i * step + (Math.random()*0.14 - 0.07); // small jitter
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = height; // same plane for all items
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale', '0.95 0.95 0.95');
    // always face camera: use look-at component
    el.setAttribute('look-at', '#camera');
    el.classList.add('clickable');

    // subtle animations:
    // vertical float (Y) and slow X/Z drift so they don't look perfectly static
    const ampY = 0.06 + Math.random()*0.04;
    const durY = 1800 + Math.random()*1600;
    // horizontal drift amplitude:
    const ampXZ = 0.06 + Math.random()*0.06;
    const durXZ = 4000 + Math.random()*3000;
    el.setAttribute('animation__float', `property: position; to: ${x.toFixed(3)} ${(y+ampY).toFixed(3)} ${z.toFixed(3)}; dur:${durY}; dir:alternate; loop:true; easing:easeInOutSine`);
    el.setAttribute('animation__drift', `property: position; to: ${(x+ampXZ).toFixed(3)} ${y.toFixed(3)} ${(z+ampXZ).toFixed(3)}; dur:${durXZ}; dir:alternate; loop:true; easing:easeInOutSine`);
    // slow rotate Y for depth (non too fast)
    el.setAttribute('animation__spin', `property: rotation; to: 0 360 0; dur:${10000 + Math.random()*10000}; loop:true; easing:linear`);
    // subtle pointer feedback
    el.addEventListener('mouseenter', ()=> el.setAttribute('scale','1.08 1.08 1.08'));
    el.addEventListener('mouseleave', ()=> el.setAttribute('scale','0.95 0.95 0.95'));
  }
}

/* ---------- PARTICLES: scintille, confetti, smoke ---------- */
function createScintille(count = 40){
  const root = document.getElementById('particles');
  for(let i=0;i<count;i++){
    const s = document.createElement('a-sphere');
    const px = (Math.random()*2 - 1) * 3;
    const py = 1.0 + Math.random()*2.0;
    const pz = (Math.random()*2 - 1) * 3;
    s.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    s.setAttribute('radius', (0.02 + Math.random()*0.03).toFixed(3));
    s.setAttribute('color', '#ffb2b2');
    s.setAttribute('opacity', (0.5 + Math.random()*0.5).toFixed(2));
    const tx = px + (Math.random()*0.4 - 0.2);
    const ty = py + (Math.random()*0.8 - 0.2);
    const tz = pz + (Math.random()*0.4 - 0.2);
    const dur = 1200 + Math.random()*2400;
    s.setAttribute('animation', `property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);
    root.appendChild(s);
  }
}

function createConfetti(count = 18){
  const root = document.getElementById('particles');
  for(let i=0;i<count;i++){
    const p = document.createElement('a-plane');
    const px = (Math.random()*2 - 1) * 2.5;
    const py = 2.6 + Math.random()*1.6;
    const pz = (Math.random()*2 - 1) * 2.5;
    p.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    p.setAttribute('width', 0.14 + Math.random()*0.12);
    p.setAttribute('height', 0.10 + Math.random()*0.08);
    p.setAttribute('rotation', `${Math.random()*360} ${Math.random()*360} ${Math.random()*360}`);
    p.setAttribute('material', `color: #ff9a9a; side: double; transparent: true; opacity: 0.95`);
    const ty = py - (1.6 + Math.random()*1.2);
    const dur = 5000 + Math.random()*4600;
    p.setAttribute('animation', `property: position; to: ${px.toFixed(3)} ${ty.toFixed(3)} ${pz.toFixed(3)}; dur:${dur}; loop:true; easing: linear`);
    root.appendChild(p);
  }
}

function createSmoke(count = 18){
  const root = document.getElementById('particles');
  for(let i=0;i<count;i++){
    const c = document.createElement('a-cylinder');
    const px = (Math.random()*2 - 1) * 3;
    const py = 0.6 + Math.random()*2.2;
    const pz = (Math.random()*2 - 1) * 3;
    c.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    c.setAttribute('radius', 0.03 + Math.random()*0.04);
    c.setAttribute('height', 0.9 + Math.random()*0.9);
    c.setAttribute('material', 'color: #ff4b4b; opacity: 0.18; transparent: true');
    const ty = py + (0.3 + Math.random()*0.8);
    const dur = 4200 + Math.random()*3800;
    c.setAttribute('animation', `property: position; to: ${px.toFixed(3)} ${ty.toFixed(3)} ${pz.toFixed(3)}; dur:${dur}; dir: alternate; loop:true; easing: easeInOutSine`);
    root.appendChild(c);
  }
}

/* ---------- holo text animation (subtle) ---------- */
function createHoloTextAnimation(){
  const textEnt = document.getElementById('holoText');
  textEnt.setAttribute('animation', 'property: rotation; to: 0 20 0; dur: 8000; dir: alternate; loop: true; easing: easeInOutSine');
  // pulse opacity
  textEnt.children[0].setAttribute('animation__pulse','property: components.material.material.opacity; from: 0.5; to: 1.0; dur: 2000; dir: alternate; loop: true; easing: easeInOutSine');
}

/* ---------- lights: rotating directional + spotlight spotlighting hovered item ---------- */
function animateLightsSetup(){
  const dir = document.getElementById('dirLight');
  dir.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 25000; loop: true; easing: linear');

  const spot = document.getElementById('spotLight');
  // slowly sweep spotlight across scene
  spot.setAttribute('animation', 'property: rotation; to: -90 60 0; dur: 10000; dir: alternate; loop: true; easing: easeInOutSine');

  // point light pulse handled by audio analyzer or fallback simple pulse:
  const pulse = document.getElementById('pulseLight');
  pulse.setAttribute('animation', 'property: light.intensity; from: 0.35; to: 0.9; dur: 2000; dir: alternate; loop: true; easing: easeInOutSine');
}

/* ---------- Audio analyzer to sync lights with music (non-blocking) ---------- */
let audioCtx = null, analyser = null, dataArray = null, sourceNode = null;
function setupAudioAnalyzer(){
  try{
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    // connect bgMusic element
    sourceNode = audioCtx.createMediaElementSource(bgMusic);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    // animate loop
    requestAnimationFrame(audioVizLoop);
  } catch(e){
    console.warn('WebAudio not available or blocked:', e);
  }
}
function audioVizLoop(){
  if(analyser && dataArray){
    analyser.getByteFrequencyData(dataArray);
    // take average
    let sum = 0;
    for(let i=0;i<dataArray.length;i++) sum += dataArray[i];
    const avg = sum / dataArray.length;
    // map avg to light intensity (0.2 - 1.4)
    const mapped = 0.2 + Math.min(1, avg/120) * 1.2;
    const pulse = document.getElementById('pulseLight');
    if(pulse){
      pulse.setAttribute('light', `type: point; intensity: ${mapped}; color: #ff4444; distance: 8`);
    }
    // also subtly scale holoText based on beat
    const holo = document.getElementById('holoText');
    if(holo){
      const s = 1 + Math.min(0.08, (avg/255)*0.08);
      holo.setAttribute('scale', `${s} ${s} ${s}`);
    }
  }
  requestAnimationFrame(audioVizLoop);
}

/* ---------- interactions: QR play, logos, items audio/links ---------- */
function setupInteractions(){
  preserveVideoAspect();

  // QR click -> play video
  qr.addEventListener('click', async () => {
    qr.setAttribute('visible', false);
    demoVideo.setAttribute('visible', true);
    try { await holoVideo.play(); try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){} } catch(e) {
      videoTapOverlay.style.display = 'flex';
    }
  });

  // fallback overlay
  tapToPlay && tapToPlay.addEventListener('click', async () => {
    videoTapOverlay.style.display = 'none';
    try { await holoVideo.play(); try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){} } catch(e) { alert('Impossibile avviare il video.'); }
  });

  holoVideo.addEventListener('ended', () => {
    demoVideo.setAttribute('visible', false);
    replayLogo.setAttribute('visible', true);
    whatsappLogo.setAttribute('visible', true);
    replayLogo.classList.add('clickable');
    whatsappLogo.classList.add('clickable');
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
  });

  // replay
  replayLogo.addEventListener('click', async () => {
    const vis = replayLogo.getAttribute('visible');
    if(!vis) return;
    replayLogo.setAttribute('visible', false);
    whatsappLogo.setAttribute('visible', false);
    replayLogo.classList.remove('clickable');
    whatsappLogo.classList.remove('clickable');
    demoVideo.setAttribute('visible', true);
    try { await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){ videoTapOverlay.style.display = 'flex'; }
  });

  // whatsapp
  whatsappLogo.addEventListener('click', () => {
    const vis = whatsappLogo.getAttribute('visible');
    if(!vis) return;
    window.open('https://wa.me/1234567890', '_blank');
  });

  // item clicks (audio or link)
  const audioMap = { 'Radio':'radio.mp3', 'Fantacalcio':'fantacalcio.mp3', 'Dj':'dj.mp3' };
  const linkMap = {
    'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
    'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
    'Catania':'https://www.instagram.com/officialcataniafc/',
    'Eduverse':'https://www.instagram.com/eduverse___/'
  };

  itemIds.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('click', () => {
      if(audioMap[id]){
        try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
        const a = new Audio(audioMap[id]); a.play();
        a.onended = () => { try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){} };
        return;
      }
      if(id === 'Tromba'){ window.open('https://youtu.be/AMK10N6wwHM','_blank'); return; }
      if(id === 'Ballerino'){ window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return; }
      if(linkMap[id]){ window.open(linkMap[id], '_blank'); return; }
      window.open('https://instagram.com','_blank');
    });

    // hover/tap feedback already set in distributeItemsCirclePlane
  });
}

/* ---------- video aspect helper ---------- */
function preserveVideoAspect(){
  const src = holoVideo.querySelector('source') ? holoVideo.querySelector('source').src : holoVideo.src;
  if(!src) return;
  const probe = document.createElement('video');
  probe.preload = 'metadata';
  probe.src = src;
  probe.muted = true;
  probe.playsInline = true;
  probe.addEventListener('loadedmetadata', () => {
    const w = probe.videoWidth, h = probe.videoHeight;
    if(w && h){
      const aspect = w/h;
      const baseH = 1.0;
      const sx = baseH * aspect;
      const sy = baseH;
      demoVideo.setAttribute('scale', `${sx} ${sy} 1`);
    }
  });
  probe.load();
}