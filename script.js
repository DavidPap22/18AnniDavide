/* script.js — versione robusta completa:
   - robust getUserMedia attempts (ideal/exact/fallback)
   - ensure camera DOM video attributes for mobile autoplay
   - force a-sky texture updates until camera frames show
   - QR placed far front (z = -5.8), items placed left/right/back only and closer
   - QR -> holoVideo DOM play with promise handling and fallback overlay
   - bgMusic pause/resume behavior for item audio
   - logos clickable only when visible
*/

/* ELEMENTS */
const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');

const cameraStreamEl = document.getElementById('cameraStream');
const holoVideo = document.getElementById('holoVideo');
const videoTapOverlay = document.getElementById('videoTapOverlay');
const tapToPlay = document.getElementById('tapToPlay');

const qr = document.getElementById('qrCode');
const demoVideo = document.getElementById('demoVideo'); // a-video mapping to #holoVideo
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;

/* small util */
const wait = ms => new Promise(r => setTimeout(r, ms));

/* START: ENTRA button (user gesture) */
startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch(e){ console.warn('bgMusic blocked', e); }

  startOverlay.style.display = 'none';

  try {
    await startCameraWithRetries();
  } catch (err) {
    console.error('camera start failed', err);
    alert('Impossibile avviare la fotocamera. Controlla HTTPS/permessi e riprova.');
    return;
  }

  // ensure QR and center elements are at far Z
  const CENTER_Y = 1.45;
  const QR_Z = -5.8;
  qr.setAttribute('position', `0 ${CENTER_Y} ${QR_Z}`);
  qr.setAttribute('scale', '1.3 1.3 1');
  demoVideo.setAttribute('position', `0 ${CENTER_Y} ${QR_Z}`);
  replayLogo.setAttribute('position', `-0.9 ${CENTER_Y} ${QR_Z}`);
  whatsappLogo.setAttribute('position', `0.9 ${CENTER_Y} ${QR_Z}`);
  replayLogo.setAttribute('visible','false');
  whatsappLogo.setAttribute('visible','false');
  replayLogo.classList.remove('clickable');
  whatsappLogo.classList.remove('clickable');

  // place items LEFT/RIGHT/BACK only, at radius < |QR_Z| so they stay closer and never front
  distributeItemsLeftRightBack(Math.min(Math.abs(QR_Z) - 1.0, 3.5));

  // particles visual
  createParticles(36);

  // wire up interactions
  setupInteractions();
});

/* Robust camera start: tries multiple constraints and forces video attributes */
async function startCameraWithRetries(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('getUserMedia non supportato');
  }

  // prepare DOM video element attributes for mobile acceptance
  cameraStreamEl.setAttribute('playsinline','');
  cameraStreamEl.setAttribute('webkit-playsinline','');
  cameraStreamEl.setAttribute('autoplay','');
  cameraStreamEl.setAttribute('muted','');
  cameraStreamEl.setAttribute('crossorigin','anonymous');
  cameraStreamEl.style.objectFit = 'cover';

  const attempts = [
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    { video: { facingMode: 'environment' }, audio: false },
    { video: true, audio: false }
  ];

  let lastErr = null;
  let stream = null;
  for(const c of attempts){
    try{
      stream = await navigator.mediaDevices.getUserMedia(c);
      if(stream) break;
    } catch(e){
      lastErr = e;
      console.warn('getUserMedia attempt failed', c, e);
      await wait(180); // backoff small
    }
  }
  if(!stream) throw lastErr || new Error('Nessuno stream camera ottenuto');

  cameraStreamEl.srcObject = stream;
  cameraStreamEl.muted = true;
  cameraStreamEl.playsInline = true;

  // attempt play and wait for frames
  try {
    const p = cameraStreamEl.play();
    if(p && p.then) await p;
  } catch(playErr){
    console.warn('cameraStream.play() rejected', playErr);
  }

  // wait for 'playing' event or short timeout
  await new Promise((resolve) => {
    let done = false;
    function onPlay(){ if(done) return; done=true; cameraStreamEl.removeEventListener('playing', onPlay); resolve(); }
    cameraStreamEl.addEventListener('playing', onPlay);
    setTimeout(()=> { if(!done){ done=true; cameraStreamEl.removeEventListener('playing', onPlay); resolve(); } }, 1800);
  });

  // attach to a-sky with flat shader so lighting doesn't wash it
  const sky = document.getElementById('cameraSky');
  sky.setAttribute('material', 'shader: flat; src: #cameraStream');

  // repeatedly force texture update on three.js material for a short while
  forceSkyTextureUpdate(sky, 1400, 80);
}

/* Force three.js texture updates to help devices that don't immediately map video */
function forceSkyTextureUpdate(skyEl, duration = 1400, interval = 80){
  const start = Date.now();
  const tid = setInterval(() => {
    try {
      const mesh = skyEl.getObject3D('mesh');
      if(mesh && mesh.material && mesh.material.map){
        mesh.material.map.needsUpdate = true;
        mesh.material.needsUpdate = true;
      }
    } catch(e){ /* ignore */ }
    if(Date.now() - start > duration) clearInterval(tid);
  }, interval);
}

/* Distribute items left / back / right only (never in front) */
function distributeItemsLeftRightBack(radius = 3.1){
  const sectors = [
    {from: Math.PI/6, to: 5*Math.PI/6},    // left sector
    {from: 5*Math.PI/6, to: 7*Math.PI/6},  // back sector
    {from: 7*Math.PI/6, to: 11*Math.PI/6}  // right sector
  ];
  let idx = 0;
  for(const id of itemIds){
    const el = document.getElementById(id);
    if(!el) continue;
    const sector = sectors[idx % sectors.length];
    // spread items inside sector with slight jitter
    const slot = Math.floor(idx / sectors.length);
    const denom = Math.max(1, Math.ceil(itemIds.length / sectors.length));
    const frac = (slot + Math.random()*0.6) / denom;
    const az = sector.from + frac * (sector.to - sector.from) + (Math.random()*0.12 - 0.06);
    const elevOptions = [-0.12, 0.02, 0.14];
    const elev = elevOptions[idx % elevOptions.length];
    const x = radius * Math.cos(elev) * Math.sin(az);
    const y = radius * Math.sin(elev) + 1.35;
    const z = radius * Math.cos(elev) * Math.cos(az);
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale', '0.95 0.95 0.95');
    el.setAttribute('look-at', '#camera');
    el.classList.add('clickable');
    idx++;
  }
}

/* Particles for hologram feel */
function createParticles(count = 32){
  const root = document.getElementById('particles');
  while(root.firstChild) root.removeChild(root.firstChild);
  for(let i=0;i<count;i++){
    const s = document.createElement('a-sphere');
    const px = (Math.random()*2 - 1) * 3;
    const py = Math.random()*2 + 0.6;
    const pz = (Math.random()*2 - 1) * 3;
    s.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    s.setAttribute('radius', (0.03 + Math.random()*0.04).toFixed(3));
    s.setAttribute('color', '#ff2b2b');
    const tx = px + (Math.random()*0.6 - 0.3);
    const ty = py + (Math.random()*0.6 - 0.3);
    const tz = pz + (Math.random()*0.6 - 0.3);
    const dur = 1600 + Math.random()*2600;
    s.setAttribute('animation', `property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);
    root.appendChild(s);
  }
}

/* Interactions: QR -> holoVideo play -> video ends -> logos; items: audio/link map */
function setupInteractions(){
  preserveVideoAspect();

  // ensure logos are not clickable until visible
  replayLogo.classList.remove('clickable');
  whatsappLogo.classList.remove('clickable');

  // QR click: hide QR, show a-video and try to play DOM video
  qr.addEventListener('click', async () => {
    qr.setAttribute('visible','false');
    demoVideo.setAttribute('visible','true');
    try {
      await holoVideo.play(); // user gesture originated from QR tap
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
    } catch(playErr){
      console.warn('holoVideo.play rejected', playErr);
      videoTapOverlay.style.display = 'flex';
    }
  });

  // fallback overlay tap
  tapToPlay && tapToPlay.addEventListener('click', async () => {
    videoTapOverlay.style.display = 'none';
    try {
      await holoVideo.play();
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
    } catch(err){
      alert('Impossibile avviare il video su questo dispositivo.');
    }
  });

  // when DOM video ends -> hide a-video, show logos (make clickable), resume bg music
  holoVideo.addEventListener('ended', () => {
    demoVideo.setAttribute('visible','false');
    replayLogo.setAttribute('visible','true');
    whatsappLogo.setAttribute('visible','true');
    replayLogo.classList.add('clickable');
    whatsappLogo.classList.add('clickable');
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
  });

  // replay action
  replayLogo.addEventListener('click', async () => {
    if(replayLogo.getAttribute('visible') !== true) return;
    replayLogo.setAttribute('visible','false');
    whatsappLogo.setAttribute('visible','false');
    replayLogo.classList.remove('clickable');
    whatsappLogo.classList.remove('clickable');
    demoVideo.setAttribute('visible','true');
    try { await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){
      console.warn('replay play rejected', e);
      videoTapOverlay.style.display = 'flex';
    }
  });

  // whatsapp action
  whatsappLogo.addEventListener('click', () => {
    if(whatsappLogo.getAttribute('visible') !== true) return;
    window.open('https://wa.me/1234567890','_blank');
  });

  // items: audio or links
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
      window.open('https://instagram.com', '_blank');
    });
  });
}

/* Ensure a-video plane respects video aspect ratio */
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