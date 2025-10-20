/* script.js - fixes:
   - use camera stream as a-sky for true 360 background
   - distribute items on a sphere to avoid overlaps
   - ensure video keeps original aspect ratio
   - maintain QR->video->logos flow, music pause/resume exactly where stopped
*/

const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');

// central elements
const qr = document.getElementById('qrCode');
const demoVideo = document.getElementById('demoVideo');
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

// items collection (will be positioned automatically on start)
const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];

let bgSavedTime = 0; // store where bg music was paused

startBtn.addEventListener('click', async () => {
  // start background music (gesture)
  try { await bgMusic.play(); } catch(e){ console.warn('bgMusic play blocked', e); }

  // hide overlay
  startOverlay.style.display = 'none';

  // start camera and set as sky
  await startCameraAsSky();

  // position items around the user on a sphere
  distributeItemsOnSphere(2.8); // distance 2.8 meters

  // setup particles
  createParticles(50);

  // set up interactions
  setupInteractions();

  // ensure video scale matches aspect ratio when metadata loads
  setupVideoAspect();
});

/* ---------- camera stream -> a-sky (true 360 view) ---------- */
async function startCameraAsSky(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    alert('Il tuo dispositivo non supporta getUserMedia.');
    return;
  }

  // try environment camera
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
  } catch(e1){
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch(e2){
      // fallback to any camera
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  // create a hidden video element that will feed the sky
  let camVid = document.getElementById('cameraStream');
  if(!camVid){
    camVid = document.createElement('video');
    camVid.id = 'cameraStream';
    camVid.autoplay = true;
    camVid.playsInline = true;
    camVid.muted = true;
    camVid.style.display = 'none';
    document.body.appendChild(camVid);
  }
  camVid.srcObject = stream;
  try { await camVid.play(); } catch(e){ console.warn('cameraStream play blocked', e); }

  // set a-sky to use this video element
  const sky = document.getElementById('cameraSky');
  sky.setAttribute('src', '#cameraStream');

  // orient sky: no rotation needed normally
}

/* ---------- distribute items evenly in azimuth around user ---------- */
function distributeItemsOnSphere(radius=3){
  const elevations = [ -0.15, 0.05, 0.15 ]; // small variations for eye/upper levels
  const n = itemIds.length;
  const scene = document.querySelector('a-scene');

  for(let i=0;i<n;i++){
    const id = itemIds[i];
    const el = document.getElementById(id);
    if(!el) continue;
    // spread azimuth evenly
    const az = (i / n) * Math.PI * 2;
    // choose an elevation from array for variety
    const elev = elevations[i % elevations.length];
    // spherical -> Cartesian
    const x = radius * Math.cos(elev) * Math.sin(az);
    const y = radius * Math.sin(elev) + 1.4; // add base height so items are roughly at eye/head level
    const z = radius * Math.cos(elev) * Math.cos(az);
    // apply position and a consistent scale
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    // keep items readable and same visual size across devices by using scale relative to radius
    const baseScale = Math.max(0.8, Math.min(1.4, 2.8 / radius));
    el.setAttribute('scale', `${baseScale} ${baseScale} ${baseScale}`);
    // make sure they always face the camera - look-at in HTML already set, this reinforces it
    el.setAttribute('look-at', '#camera');
    // Remove any rotation animations if present
    el.removeAttribute('animation__rotation');
  }
}

/* ---------- create floating red particles (simple) ---------- */
function createParticles(count=40){
  const scene = document.querySelector('a-scene');
  const particlesRoot = document.getElementById('particles');
  // clear old
  while (particlesRoot.firstChild) particlesRoot.removeChild(particlesRoot.firstChild);

  for(let i=0;i<count;i++){
    const s = document.createElement('a-sphere');
    const px = (Math.random()*2 -1) * 3; // -3..3
    const py = Math.random()*2 + 0.5;   // 0.5..2.5
    const pz = (Math.random()*2 -1) * 3;
    s.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    s.setAttribute('radius', 0.05 + Math.random()*0.05);
    s.setAttribute('color', '#ff2b2b');
    s.setAttribute('opacity', 0.7);
    // small oscillation
    const tx = px + (Math.random()*0.6 - 0.3);
    const ty = py + (Math.random()*0.6 - 0.3);
    const tz = pz + (Math.random()*0.6 - 0.3);
    const dur = 2000 + Math.random()*3000;
    s.setAttribute('animation', `property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);
    particlesRoot.appendChild(s);
  }
}

/* ---------- ensure a-video keeps source aspect ratio and scale to appear natural ---------- */
function setupVideoAspect(){
  // create an off-DOM video to read metadata if needed
  const aVideo = document.getElementById('demoVideo');
  // if demoVideo has a source, attempt to read naturalWidth/naturalHeight via a media element
  const src = aVideo.getAttribute('src');
  if(!src) return;
  const probe = document.createElement('video');
  probe.preload = 'metadata';
  probe.src = src;
  probe.muted = true;
  probe.playsInline = true;
  probe.addEventListener('loadedmetadata', () => {
    const w = probe.videoWidth;
    const h = probe.videoHeight;
    if(w && h){
      const aspect = w / h;
      // choose base height scale
      const baseHeight = 1.0; // meters high of the a-video plane
      const scaleX = (baseHeight * aspect);
      const scaleY = baseHeight;
      // set scale on a-video: prefer scale so A-Frame preserves ratio
      aVideo.setAttribute('scale', `${scaleX} ${scaleY} 1`);
    }
  });
  // load attempt (may be blocked without user gesture but Start was a gesture)
  probe.load();
}

/* ---------- interactions: QR -> video -> logos; items playing audio pauses bg music ---------- */
function setupInteractions(){
  // central flow: QR -> demoVideo -> logos
  qr.addEventListener('click', ()=> {
    qr.setAttribute('visible', 'false');
    demoVideo.setAttribute('visible', 'true');
    // ensure demo video plays (user already gave gesture on Start)
    try { demoVideo.play(); } catch(e){ console.warn('demoVideo play error', e); }
    // lower bg music (we'll pause entirely to resume at same position for some devices)
    try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
  });

  demoVideo.addEventListener('ended', ()=> {
    demoVideo.setAttribute('visible', 'false');
    // place two logos where video was: central area; we already positioned them approx around -2 z
    replayLogo.setAttribute('visible','true');
    whatsappLogo.setAttribute('visible','true');
    // resume bgMusic at previous spot
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
  });

  replayLogo.addEventListener('click', ()=> {
    replayLogo.setAttribute('visible','false');
    whatsappLogo.setAttribute('visible','false');
    demoVideo.setAttribute('visible','true');
    try { demoVideo.play(); } catch(e){ console.warn('replay play error', e); }
    try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
  });

  whatsappLogo.addEventListener('click', ()=> {
    window.open('https://wa.me/1234567890','_blank');
  });

  // item click handlers (play audio or open links). When an item plays audio, stop bg and resume after audio ends from same point
  const audioMap = {
    'Radio': 'radio.mp3',
    'Fantacalcio': 'fantacalcio.mp3',
    'Dj': 'dj.mp3'
  };
  itemIds.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('click', ()=> {
      // if it's the Tromba or Ballerino open YouTube; others open instagram by default
      if(id === 'Tromba'){ window.open('https://youtu.be/AMK10N6wwHM','_blank'); return; }
      if(id === 'Ballerino'){ window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return; }
      if(audioMap[id]){
        const src = audioMap[id];
        // pause bg and remember time
        try{ bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
        const audio = new Audio(src);
        audio.play();
        audio.onended = ()=> {
          try{ bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
        };
      } else {
        // fallback to instagram pages (custom per item could be added)
        const mapToIG = {
          'DonBosco': 'https://www.instagram.com/giovani_animatori_trecastagni/',
          'EtnaEnsemble': 'https://www.instagram.com/etnaensemble/',
          'Catania': 'https://www.instagram.com/officialcataniafc/',
          'Eduverse': 'https://www.instagram.com/eduverse___/'
        };
        if(mapToIG[id]) window.open(mapToIG[id],'_blank');
        else window.open('https://instagram.com','_blank');
      }
    });
  });
}

/* ---------- simple touch drag for interactable geometries (box/sphere) ---------- */
function initInteractables(){
  const nodes = document.querySelectorAll('.interactable');
  nodes.forEach(node => {
    let active = false, start = null;
    node.addEventListener('touchstart', (e)=>{
      active = true;
      start = e.touches[0];
    }, {passive:false});
    node.addEventListener('touchmove', (e)=>{
      if(!active) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = (t.clientX - start.clientX) / window.innerWidth;
      const dy = (t.clientY - start.clientY) / window.innerHeight;
      // move along x and y in world coords (small increments)
      const pos = node.getAttribute('position');
      pos.x += dx * 2; // sensitivity
      pos.y -= dy * 2;
      node.setAttribute('position', `${pos.x.toFixed(3)} ${pos.y.toFixed(3)} ${pos.z.toFixed(3)}`);
      start = t;
    }, {passive:false});
    node.addEventListener('touchend',(e)=>{ active=false; start=null; }, {passive:false});
  });
}

/* we exported initInteractables name earlier; ensure function exists in global scope */
function initParticles() { /* placeholder if called before start; real createParticles invoked after start */ }
function setupInteractions() { /* placeholder */ }