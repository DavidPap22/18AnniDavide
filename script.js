/* Fixes summary:
   - cameraStream video element attached to a-sky (true 360) and started on ENTRA
   - holoVideo is a real DOM <video id="holoVideo">; a-video src="#holoVideo"
   - QR click triggers holoVideo.play() with promise handling; fallback overlay shown if rejected
   - items distributed on a sphere; click handlers pause/resume bgMusic correctly
*/

const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');

const cameraStreamEl = document.getElementById('cameraStream'); // DOM video for camera feed
const holoVideo = document.getElementById('holoVideo');         // DOM video for holo
const videoTapOverlay = document.getElementById('videoTapOverlay');
const tapToPlay = document.getElementById('tapToPlay');

const qr = document.getElementById('qrCode');
const demoVideo = document.getElementById('demoVideo'); // a-video (src="#holoVideo")
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;

// Start button: play bg music, start camera feed, position items, particles and interactions
startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch(e){ console.warn('bgMusic blocked', e); }

  // hide menu
  startOverlay.style.display = 'none';

  // start camera (rear preferred) and attach to a-sky
  try {
    await startCameraStream();
  } catch(err) {
    console.error('camera error', err);
    alert('Errore accesso fotocamera: ' + (err && err.message ? err.message : err));
    return;
  }

  // distribute items and particles
  distributeItemsOnSphere(3.0);
  createParticles(40);

  // wire interactions
  setupInteractions();
});

// Start camera stream and connect to #cameraStream DOM video, then set a-sky src to "#cameraStream"
async function startCameraStream(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    throw new Error('getUserMedia non supportato.');
  }

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
  } catch(e1){
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch(e2){
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  // attach stream to hidden video element
  cameraStreamEl.srcObject = stream;
  cameraStreamEl.muted = true; // must be muted for autoplay
  cameraStreamEl.playsInline = true;
  try { await cameraStreamEl.play(); } catch(e){ console.warn('cameraStream play blocked', e); }

  // assign to a-sky
  const sky = document.getElementById('cameraSky');
  sky.setAttribute('src', '#cameraStream');
}

// Distribute PNG items on a sphere around the user
function distributeItemsOnSphere(radius=3.0){
  const n = itemIds.length;
  const elevations = [-0.12, 0.02, 0.16];
  for(let i=0;i<n;i++){
    const el = document.getElementById(itemIds[i]);
    if(!el) continue;
    const az = (i / n) * Math.PI * 2;
    const elev = elevations[i % elevations.length];
    const x = radius * Math.cos(elev) * Math.sin(az);
    const y = radius * Math.sin(elev) + 1.4;
    const z = radius * Math.cos(elev) * Math.cos(az);
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale', '1 1 1');
    el.setAttribute('look-at', '#camera');
  }
}

// Create subtle red particles
function createParticles(count=30){
  const root = document.getElementById('particles');
  while(root.firstChild) root.removeChild(root.firstChild);
  for(let i=0;i<count;i++){
    const s = document.createElement('a-sphere');
    const px = (Math.random()*2 - 1) * 3;
    const py = Math.random()*2 + 0.5;
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

// Setup interactions for QR, items, video and logos
function setupInteractions(){
  // Probe video metadata to set aspect ratio
  ensureVideoAspect();

  // QR click: play holoVideo (DOM) and show a-video
  qr.addEventListener('click', async () => {
    qr.setAttribute('visible','false');
    // show a-video (which points to #holoVideo)
    demoVideo.setAttribute('visible','true');

    // try to play DOM holoVideo (QR tap is a user gesture)
    try {
      await holoVideo.play();
      // holo started: pause bgMusic and save time
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
    } catch(playErr){
      console.warn('holoVideo.play() rejected:', playErr);
      // show overlay that asks user to tap to start video (fallback)
      videoTapOverlay.style.display = 'flex';
    }
  });

  // fallback overlay handling: second tap will attempt play again
  tapToPlay && tapToPlay.addEventListener('click', async () => {
    videoTapOverlay.style.display = 'none';
    try {
      await holoVideo.play();
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
    } catch(e){
      alert('Impossibile avviare il video su questo dispositivo/browser.');
      console.error(e);
    }
  });

  // when DOM holoVideo ends: hide a-video and show logos; resume bgMusic where left off
  holoVideo.addEventListener('ended', () => {
    demoVideo.setAttribute('visible','false');
    replayLogo.setAttribute('visible','true');
    whatsappLogo.setAttribute('visible','true');
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
  });

  // replay
  replayLogo.addEventListener('click', async () => {
    replayLogo.setAttribute('visible','false');
    whatsappLogo.setAttribute('visible','false');
    demoVideo.setAttribute('visible','true');
    try { await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){
      console.warn('replay play rejected', e);
      videoTapOverlay.style.display = 'flex';
    }
  });

  // whatsapp
  whatsappLogo.addEventListener('click', ()=> window.open('https://wa.me/1234567890','_blank'));

  // items: audio map + links
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
        a.onended = ()=> {
          try{ bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
        };
        return;
      }
      if(id === 'Tromba'){ window.open('https://youtu.be/AMK10N6wwHM','_blank'); return; }
      if(id === 'Ballerino'){ window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return; }
      if(linkMap[id]){ window.open(linkMap[id], '_blank'); return; }
      window.open('https://instagram.com','_blank');
    });
  });
}

// Ensure a-video scale matches video DOM aspect ratio
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