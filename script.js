/* Corrections:
   - ensure cameraStream is playing and attached to a-sky using material: shader flat
   - place all items on BACK hemisphere only (so front is reserved to center flow)
   - ensure center logos are clickable only when visible (add/remove .clickable)
   - QR tap plays DOM holoVideo (a-video uses src "#holoVideo"); fallback overlay if browser blocks play
*/

const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');

const cameraStreamEl = document.getElementById('cameraStream'); // DOM video for camera
const holoVideo = document.getElementById('holoVideo');         // DOM video for holo
const videoTapOverlay = document.getElementById('videoTapOverlay');
const tapToPlay = document.getElementById('tapToPlay');

const qr = document.getElementById('qrCode');
const demoVideo = document.getElementById('demoVideo'); // a-video (src="#holoVideo")
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;

startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch(e){ console.warn('bgMusic blocked', e); }

  startOverlay.style.display = 'none';

  try {
    await startCameraStreamAndBindSky();
  } catch (err) {
    console.error('camera start failed', err);
    alert('Errore fotocamera: ' + (err && err.message ? err.message : err));
    return;
  }

  // Put items behind user (back hemisphere)
  distributeItemsOnBackHemisphere(3.3);

  // particles
  createParticles(36);

  // interactions
  setupInteractions();
});

async function startCameraStreamAndBindSky(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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

  cameraStreamEl.srcObject = stream;
  cameraStreamEl.muted = true;
  cameraStreamEl.playsInline = true;
  try { await cameraStreamEl.play(); } catch(e){ console.warn('cameraStream play blocked', e); }

  // wait until video has frames (use timeupdate or playing event)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(()=> {
      // still try to set sky even if event didn't fire
      console.warn('cameraStream play timeout, proceeding to set sky');
      resolve();
    }, 1500);
    function onPlay() { clearTimeout(timeout); cameraStreamEl.removeEventListener('playing', onPlay); resolve(); }
    cameraStreamEl.addEventListener('playing', onPlay);
  });

  // set a-sky material to use the camera DOM video as texture and use flat shader
  const sky = document.getElementById('cameraSky');
  // Use material setter: shader flat ensures no lighting affects the video texture
  sky.setAttribute('material', 'shader: flat; src: #cameraStream');
  // Also set rotation so horizon aligns better on some devices (optional)
  sky.setAttribute('rotation', '0 0 0');
}

/* Place items only on back hemisphere (azimuth from 90deg to 270deg),
   so front (-Z) reserved for center content */
function distributeItemsOnBackHemisphere(radius = 3.0){
  const n = itemIds.length;
  const startAz = Math.PI / 2; // 90deg
  const endAz = 3 * Math.PI / 2; // 270deg
  for(let i=0;i<n;i++){
    const el = document.getElementById(itemIds[i]);
    if(!el) continue;
    // distribute evenly across the half-circle
    const t = i / n;
    const az = startAz + t * (endAz - startAz);
    // slight vertical offsets
    const elevOptions = [-0.12, 0.03, 0.16];
    const elev = elevOptions[i % elevOptions.length];
    const x = radius * Math.cos(elev) * Math.sin(az);
    const y = radius * Math.sin(elev) + 1.35;
    const z = radius * Math.cos(elev) * Math.cos(az);
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale', '1 1 1');
    el.setAttribute('look-at', '#camera');
    // ensure they are clickable only if not overlapping center (they are behind so safe)
    el.classList.add('clickable');
  }
}

/* particles */
function createParticles(count = 30){
  const root = document.getElementById('particles');
  while(root.firstChild) root.removeChild(root.firstChild);
  for(let i=0;i<count;i++){
    const s = document.createElement('a-sphere');
    const px = (Math.random()*2 -1) * 3;
    const py = Math.random()*2 + 0.6;
    const pz = (Math.random()*2 -1) * 3;
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
  // ensure video aspect ratio
  ensureVideoAspect();

  // Make sure center logos are not clickable initially
  replayLogo.classList.remove('clickable');
  whatsappLogo.classList.remove('clickable');

  // QR click: play DOM video and show a-video
  qr.addEventListener('click', async () => {
    // hide QR, show a-video
    qr.setAttribute('visible','false');
    demoVideo.setAttribute('visible','true');

    try {
      await holoVideo.play(); // user gesture from QR tap
      // pause bgMusic and save time
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
    } catch(playErr){
      console.warn('holoVideo.play() rejected:', playErr);
      videoTapOverlay.style.display = 'flex';
    }
  });

  // fallback overlay: second tap to start video
  tapToPlay && tapToPlay.addEventListener('click', async () => {
    videoTapOverlay.style.display = 'none';
    try {
      await holoVideo.play();
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
    } catch(e){
      alert('Impossibile avviare il video su questo dispositivo.');
    }
  });

  // when DOM holoVideo ends: hide video, show logos, resume bgMusic
  holoVideo.addEventListener('ended', () => {
    demoVideo.setAttribute('visible','false');
    replayLogo.setAttribute('visible','true');
    whatsappLogo.setAttribute('visible','true');
    // make logos clickable now
    replayLogo.classList.add('clickable');
    whatsappLogo.classList.add('clickable');
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
  });

  // replay click
  replayLogo.addEventListener('click', async () => {
    // ensure it was visible and clickable
    if(replayLogo.getAttribute('visible') !== true) return;
    replayLogo.setAttribute('visible','false');
    whatsappLogo.setAttribute('visible','false');
    // remove clickable until video ends again
    replayLogo.classList.remove('clickable');
    whatsappLogo.classList.remove('clickable');
    demoVideo.setAttribute('visible','true');
    try { await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){
      console.warn('replay play rejected', e);
      videoTapOverlay.style.display = 'flex';
    }
  });

  whatsappLogo.addEventListener('click', ()=> {
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
      // if audio item
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

/* probe a-video DOM to set a-video scale to match aspect ratio */
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
      const aVideo = document.getElementById('demoVideo');
      aVideo.setAttribute('scale', `${sx} ${sy} 1`);
    }
  });
  probe.load();
}