/* script.js — Menù rosso + AR 360 feed + item distribution + interactions
   - Full-page red menu (easy to tap) -> on click:
       • start bg music (gesture)
       • getUserMedia (rear camera when possible)
       • assign camera stream to a-sky (true 360)
       • distribute PNG items evenly around user on sphere
       • create light red particles
       • enable interactions: QR -> video -> logos; items pause/resume bgMusic
*/

const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');

const qr = document.getElementById('qrCode');
const demoVideo = document.getElementById('demoVideo');
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;

// Start button: single big reliable gesture
startBtn.addEventListener('click', async () => {
  // Play background music (user gesture - necessary for mobile autoplay policies)
  try { await bgMusic.play(); } catch(e) { console.warn('bgMusic play blocked', e); }

  // hide menu
  startOverlay.style.display = 'none';

  // start camera stream and set a-sky texture
  await startCameraAsSky();

  // place item pngs evenly around the user to avoid overlap
  distributeItemsOnSphere(3.0);

  // create subtle red particles
  createParticles(44);

  // wire interactions for QR, video, items
  setupInteractions();
});

/* ---------- camera stream -> a-sky ---------- */
async function startCameraAsSky(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    alert('Il tuo browser non supporta la fotocamera via getUserMedia.');
    return;
  }

  let stream = null;
  try {
    // prefer exact environment (rear) where supported
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
  } catch(e1){
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch(e2){
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  // hidden video element that will feed the sky
  let camVid = document.getElementById('cameraStream');
  if(!camVid){
    camVid = document.createElement('video');
    camVid.id = 'cameraStream';
    camVid.autoplay = true;
    camVid.playsInline = true;
    camVid.muted = true; // muted so autoplay is allowed
    camVid.style.display = 'none';
    document.body.appendChild(camVid);
  }
  camVid.srcObject = stream;
  try { await camVid.play(); } catch(err) { console.warn('camera stream play blocked', err); }

  // attach the video as sky texture
  const sky = document.getElementById('cameraSky');
  sky.setAttribute('src', '#cameraStream');
}

/* ---------- distribute items uniformly on a horizontal ring/sphere ---------- */
function distributeItemsOnSphere(radius = 3.0){
  const n = itemIds.length;
  const elevations = [-0.12, 0.02, 0.16]; // small vertical offsets
  for(let i=0;i<n;i++){
    const id = itemIds[i];
    const el = document.getElementById(id);
    if(!el) continue;
    const az = (i / n) * Math.PI * 2; // evenly around
    const elev = elevations[i % elevations.length];
    const x = radius * Math.cos(elev) * Math.sin(az);
    const y = radius * Math.sin(elev) + 1.4;
    const z = radius * Math.cos(elev) * Math.cos(az);
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    // consistent readable scale across devices
    const baseScale = 1.0;
    el.setAttribute('scale', `${baseScale} ${baseScale} ${baseScale}`);
    // face camera
    el.setAttribute('look-at', '#camera');
  }
}

/* ---------- particles for hologram feel ---------- */
function createParticles(count = 40){
  const root = document.getElementById('particles');
  while(root.firstChild) root.removeChild(root.firstChild);
  for(let i=0;i<count;i++){
    const s = document.createElement('a-sphere');
    const px = (Math.random()*2 -1) * 3;
    const py = Math.random()*2 + 0.5;
    const pz = (Math.random()*2 -1) * 3;
    s.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    s.setAttribute('radius', 0.035 + Math.random()*0.05);
    s.setAttribute('color', '#ff2b2b');
    const tx = px + (Math.random()*0.6 - 0.3);
    const ty = py + (Math.random()*0.6 - 0.3);
    const tz = pz + (Math.random()*0.6 - 0.3);
    const dur = 1800 + Math.random()*3000;
    s.setAttribute('animation', `property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);
    root.appendChild(s);
  }
}

/* ---------- interactions (QR -> video -> logos; items audio/links) ---------- */
function setupInteractions(){
  // ensure video aspect ratio preserved
  preserveVideoAspect();

  // QR click -> start video (and pause bgMusic saving currentTime)
  qr.addEventListener('click', ()=> {
    qr.setAttribute('visible','false');
    demoVideo.setAttribute('visible','true');
    try { demoVideo.play(); } catch(e){ console.warn('demoVideo play error', e); }
    try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
  });

  // when video ends -> hide video and show the two logos (center area)
  demoVideo.addEventListener('ended', ()=> {
    demoVideo.setAttribute('visible','false');
    replayLogo.setAttribute('visible','true');
    whatsappLogo.setAttribute('visible','true');
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
  });

  // replay click: hide logos and restart video
  replayLogo.addEventListener('click', ()=> {
    replayLogo.setAttribute('visible','false');
    whatsappLogo.setAttribute('visible','false');
    demoVideo.setAttribute('visible','true');
    try { demoVideo.play(); } catch(e){ console.warn('replay play error', e); }
    try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
  });

  // whatsapp opens chat
  whatsappLogo.addEventListener('click', ()=> window.open('https://wa.me/1234567890','_blank'));

  // map items -> audio or link
  const audioMap = {
    'Radio':'radio.mp3',
    'Fantacalcio':'fantacalcio.mp3',
    'Dj':'dj.mp3'
  };
  const linkMap = {
    'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
    'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
    'Catania':'https://www.instagram.com/officialcataniafc/',
    'Eduverse':'https://www.instagram.com/eduverse___/'
  };

  // add click handlers for each item
  itemIds.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('click', ()=>{
      // audio items: pause bgMusic, play item, resume bgMusic from saved point
      if(audioMap[id]){
        try{ bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
        const a = new Audio(audioMap[id]);
        a.play();
        a.onended = ()=> {
          try{ bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
        };
        return;
      }
      // youtube items
      if(id === 'Tromba'){ window.open('https://youtu.be/AMK10N6wwHM','_blank'); return; }
      if(id === 'Ballerino'){ window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return; }
      // instagram links
      if(linkMap[id]){ window.open(linkMap[id], '_blank'); return; }
      // fallback
      window.open('https://instagram.com', '_blank');
    });
  });
}

/* ---------- ensure a-video preserves aspect ratio by probing metadata ---------- */
function preserveVideoAspect(){
  const aVideo = document.getElementById('demoVideo');
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
      const baseHeight = 1.0; // meters in AR
      const scaleX = baseHeight * aspect;
      const scaleY = baseHeight;
      aVideo.setAttribute('scale', `${scaleX} ${scaleY} 1`);
    }
  });
  probe.load();
}