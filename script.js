/* Final adjustments:
   - improved camera start (use 'ideal' + fallback) and ensure a-sky material updated after playing
   - distribution: LEFT, RIGHT, BACK only (never front)
   - center area reserved for QR/video/logos
   - logos clickable only when visible
   - video play via DOM holoVideo (promise handled) with fallback overlay
*/

const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');

const cameraStreamEl = document.getElementById('cameraStream');
const holoVideo = document.getElementById('holoVideo');
const videoTapOverlay = document.getElementById('videoTapOverlay');
const tapToPlay = document.getElementById('tapToPlay');

const qr = document.getElementById('qrCode');
const demoVideo = document.getElementById('demoVideo'); // a-video
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;

// Start: big reliable gesture
startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch(e){ console.warn('bgMusic blocked', e); }

  startOverlay.style.display = 'none';

  try {
    await startCameraStreamRobust();
  } catch(err){
    console.error('camera start failed', err);
    alert('Errore accesso fotocamera: ' + (err && err.message ? err.message : err));
    return;
  }

  // distribute items: left, right, back only (no front)
  distributeItemsLeftRightBack(3.2);

  // subtle particles
  createParticles(36);

  // wire interactions
  setupInteractions();
});

/* Try with 'ideal' first, then fallbacks. Many Android phones (incl. some Realme) prefer 'ideal' */
async function startCameraStreamRobust(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('getUserMedia non supportato');

  let stream = null;
  const tries = [
    { video: { facingMode: { ideal: "environment" } }, audio:false },
    { video: { facingMode: "environment" }, audio:false },
    { video: true, audio:false }
  ];

  for(const c of tries){
    try{
      stream = await navigator.mediaDevices.getUserMedia(c);
      if(stream) break;
    }catch(e){
      console.warn('getUserMedia try failed', c, e);
    }
  }
  if(!stream) throw new Error('Impossibile ottenere stream camera');

  cameraStreamEl.srcObject = stream;
  cameraStreamEl.muted = true;
  cameraStreamEl.playsInline = true;
  try { await cameraStreamEl.play(); } catch(e){ console.warn('cameraStream.play blocked', e); }

  // Wait until playing or small timeout
  await new Promise((resolve) => {
    const timeout = setTimeout(()=> { console.warn('camera play timeout'); resolve(); }, 1500);
    function onPlay(){ clearTimeout(timeout); cameraStreamEl.removeEventListener('playing', onPlay); resolve(); }
    cameraStreamEl.addEventListener('playing', onPlay);
  });

  // set a-sky material to use camera stream; use shader: flat to avoid lighting
  const sky = document.getElementById('cameraSky');
  sky.setAttribute('material', 'shader: flat; src: #cameraStream');

  // force texture update on three.js material if possible (some engines need explicit mark)
  try{
    const threeObj = sky.getObject3D('mesh');
    if(threeObj && threeObj.material && threeObj.material.map){
      threeObj.material.map.needsUpdate = true;
      threeObj.material.needsUpdate = true;
    }
  }catch(e){ /* ignore if not accessible */ }
}

/* Distribute items ONLY left, right and back. No item in front (-Z direction).
   Left sector: 30deg..150deg
   Back sector: 150deg..210deg
   Right sector: 210deg..330deg
   Items assigned round-robin into these three sectors. */
function distributeItemsLeftRightBack(radius = 3.2){
  const sectors = [
    { from: Math.PI/6, to: 5*Math.PI/6 },    // left
    { from: 5*Math.PI/6, to: 7*Math.PI/6 },  // back
    { from: 7*Math.PI/6, to: 11*Math.PI/6 }  // right
  ];
  let i = 0;
  for(const id of itemIds){
    const el = document.getElementById(id);
    if(!el) continue;
    const sector = sectors[i % sectors.length];
    // distribute uniformly inside sector with small jitter
    const t = ((i / itemIds.length) % 1);
    const az = sector.from + ( ( (i / Math.ceil(itemIds.length/3) ) / Math.ceil(itemIds.length/3) ) * (sector.to - sector.from) );
    // add a tiny jitter so they don't align perfectly
    const azJ = az + (Math.random()*0.15 - 0.075);
    const elevOptions = [-0.12, 0.02, 0.14];
    const elev = elevOptions[i % elevOptions.length];
    const x = radius * Math.cos(elev) * Math.sin(azJ);
    const y = radius * Math.sin(elev) + 1.35;
    const z = radius * Math.cos(elev) * Math.cos(azJ);
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale', '1 1 1');
    el.setAttribute('look-at', '#camera');
    // make items clickable
    el.classList.add('clickable');
    i++;
  }
}

/* particles */
function createParticles(count=30){
  const root = document.getElementById('particles');
  while(root.firstChild) root.removeChild(root.firstChild);
  for(let k=0;k<count;k++){
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
    const dur = 1800 + Math.random()*2600;
    s.setAttribute('animation', `property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);
    root.appendChild(s);
  }
}

/* interactions */
function setupInteractions(){
  ensureVideoAspect();

  // logos initially not clickable
  replayLogo.classList.remove('clickable');
  whatsappLogo.classList.remove('clickable');

  // QR click -> play holoVideo (DOM video) and show a-video
  qr.addEventListener('click', async () => {
    qr.setAttribute('visible','false');
    demoVideo.setAttribute('visible','true');

    try {
      await holoVideo.play();
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
    } catch(e){
      alert('Impossibile avviare il video su questo dispositivo.');
    }
  });

  // when DOM holoVideo ends: hide a-video and show logos (make clickable)
  holoVideo.addEventListener('ended', () => {
    demoVideo.setAttribute('visible','false');
    replayLogo.setAttribute('visible','true');
    whatsappLogo.setAttribute('visible','true');
    replayLogo.classList.add('clickable');
    whatsappLogo.classList.add('clickable');
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
  });

  // replay
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

  // whatsapp
  whatsappLogo.addEventListener('click', ()=>{
    if(whatsappLogo.getAttribute('visible') !== true) return;
    window.open('https://wa.me/1234567890','_blank');
  });

  // items: audioMap and links
  const audioMap = { 'Radio':'radio.mp3', 'Fantacalcio':'fantacalcio.mp3', 'Dj':'dj.mp3' };
  const linkMap = {
    'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
    'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
    'Catania':'https://www.instagram.com/officialcataniafc/',
    'Eduverse':'https://www.instagram.com/eduverse___/'
  };

  itemIds.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('click', () => {
      if(audioMap[id]){
        try{ bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
        const a = new Audio(audioMap[id]);
        a.play();
        a.onended = ()=> { try{ bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){} };
        return;
      }
      if(id === 'Tromba'){ window.open('https://youtu.be/AMK10N6wwHM','_blank'); return; }
      if(id === 'Ballerino'){ window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return; }
      if(linkMap[id]){ window.open(linkMap[id], '_blank'); return; }
      window.open('https://instagram.com','_blank');
    });
  });
}

/* ensure a-video scale equals source aspect ratio */
function ensureVideoAspect(){
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