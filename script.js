/* Config */
const ITEM_Y = 2.6;           // piano unico in cui mettere gli item (più alto del QR)
const ITEM_RADIUS = 2.0;      // raggio cerchio items intorno alla camera
const ROTATION_UPDATE_MS = 200;// quanto spesso riallineare la rotazione verso la camera
const CREATE_ROOF = true;     // se true, crea tetto con le stesse sfere luminose del ground
const CREATE_FLOOR = true;    // se true, crea pavimento con le sfere

/* DOM */
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
const wait = ms => new Promise(r=>setTimeout(r,ms));

/* audio instances (one per item) to avoid duplicates */
const audioInstances = {}; // { id: Audio }

/* start */
startBtn.addEventListener('click', async () => {
  try{ await bgMusic.play(); }catch(e){}
  startOverlay.style.display = 'none';

  try {
    await startCameraWithRetries();
  } catch (err) {
    alert('Impossibile avviare la fotocamera. Controlla permessi/HTTPS.');
    return;
  }

  // QR più vicino, libero da ostacoli (ora leggermente più lontano che prima)
  qr.setAttribute('position','0 1.2 -1.6');
  qr.setAttribute('scale','1.3 1.3 1');
  demoVideo.setAttribute('position','0 1.2 -1.6');
  replayLogo.setAttribute('position','-0.9 1.2 -1.6');
  whatsappLogo.setAttribute('position','0.9 1.2 -1.6');

  // inizializza scena
  distributeItemsCircle(ITEM_RADIUS, ITEM_Y);
  createParticles(36);
  createSmoke(20);
  animateLight();

  if (CREATE_ROOF) createRoofFromGround();
  if (CREATE_FLOOR) createFloorFromGround();

  // start rotation updater to ensure items face camera frontally
  startRotationUpdater();

  // interactions (QR, video, items, logos)
  setupInteractions();
});

/* --- camera handling --- */
async function startCameraWithRetries(){
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

  let lastErr = null, stream = null;
  for (const c of attempts){
    try{ stream = await navigator.mediaDevices.getUserMedia(c); if(stream) break; } catch(e){ lastErr = e; await wait(180); }
  }
  if(!stream) throw lastErr || new Error('Nessuno stream');

  cameraStreamEl.srcObject = stream;
  cameraStreamEl.muted = true;
  cameraStreamEl.playsInline = true;
  try { await cameraStreamEl.play(); } catch(e){ /* ignore */ }

  await new Promise(r => {
    let done = false;
    function onPlay(){ if(done) return; done = true; cameraStreamEl.removeEventListener('playing', onPlay); r(); }
    cameraStreamEl.addEventListener('playing', onPlay);
    setTimeout(()=>{ if(!done){ done = true; cameraStreamEl.removeEventListener('playing', onPlay); r(); }}, 1800);
  });

  const sky = document.getElementById('cameraSky');
  sky.setAttribute('material', 'shader: flat; src: #cameraStream');
  forceSkyTextureUpdate(sky, 2200, 60);
}
function forceSkyTextureUpdate(skyEl, duration=2000, interval=60){
  const start = Date.now();
  const tid = setInterval(()=>{
    try{
      const mesh = skyEl.getObject3D('mesh');
      if(mesh && mesh.material && mesh.material.map){
        mesh.material.map.needsUpdate = true;
        mesh.material.needsUpdate = true;
      }
    }catch(e){}
    if(Date.now() - start > duration) clearInterval(tid);
  }, interval);
}

/* --- ITEMS: disposizione in cerchio su UN piano, oscillazione verticale + sway + pulse --- */
function distributeItemsCircle(radius = 2.0, height = ITEM_Y){
  const count = itemIds.length;
  const angleStep = (2 * Math.PI) / count;
  itemIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if(!el) return;
    const angle = i * angleStep + (Math.random()*0.12 - 0.06); // piccola casualità angolare
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = height;

    // ensure visible and clickable, set material side to double so images never appear mirrored
    el.setAttribute('visible', true);
    el.setAttribute('class', 'item clickable');
    el.setAttribute('material', 'shader: flat; side: double');

    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale', '1 1 1');

    // oscillazione verticale leggera
    const amp = 0.06 + Math.random()*0.04;
    const dur = 1600 + Math.random()*1600;
    el.setAttribute('animation__float', `property: position; to: ${x.toFixed(3)} ${(y + amp).toFixed(3)} ${z.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);

    // piccola oscillazione X/Z (sway) per dare dinamicità (uso valori leggermente diversi per X e Z)
    const swayAmpX = 0.02 + Math.random()*0.04;
    const swayAmpZ = 0.02 + Math.random()*0.04;
    const swayDur = 3000 + Math.random()*2000;
    const tx1 = (x + swayAmpX).toFixed(3);
    const tz1 = (z + swayAmpZ).toFixed(3);
    el.setAttribute('animation__sway', `property: position; to: ${tx1} ${y.toFixed(3)} ${tz1}; dur: ${swayDur}; dir: alternate; loop: true; easing: easeInOutSine`);

    // pulsazione (scale)
    const scaleTo = 1.08 + Math.random()*0.08;
    const pulseDur = 1200 + Math.random()*800;
    el.setAttribute('animation__pulse', `property: scale; to: ${scaleTo} ${scaleTo} ${scaleTo}; dur: ${pulseDur}; dir: alternate; loop: true; easing: easeInOutSine`);

    // lenta rotazione su Y (cosmetica)
    el.setAttribute('animation__spin', `property: rotation; to: 0 360 0; dur: ${12000 + Math.random()*8000}; loop: true; easing: linear`);
  });
}

/* --- calcola e imposta rotazione Y in modo che la faccia "frontale" degli item punti alla camera --- */
let rotationUpdaterInterval = null;
function startRotationUpdater(){
  updateItemsRotationToCamera();
  if(rotationUpdaterInterval) clearInterval(rotationUpdaterInterval);
  rotationUpdaterInterval = setInterval(updateItemsRotationToCamera, ROTATION_UPDATE_MS);
}
function updateItemsRotationToCamera(){
  const cameraEl = document.getElementById('camera');
  if(!cameraEl || !cameraEl.object3D) return;
  const camPos = new THREE.Vector3();
  cameraEl.object3D.getWorldPosition(camPos);

  itemIds.forEach(id=>{
    const el = document.getElementById(id);
    if(!el || !el.object3D) return;
    const objPos = new THREE.Vector3();
    el.object3D.getWorldPosition(objPos);
    const dx = camPos.x - objPos.x;
    const dz = camPos.z - objPos.z;
    const rotYrad = Math.atan2(dx, dz);
    const rotYdeg = THREE.Math.radToDeg(rotYrad);
    el.setAttribute('rotation', `0 ${rotYdeg.toFixed(3)} 0`);
  });
}

/* --- PARTICLES E FUMO --- */
function createParticles(count = 32){
  const root = document.getElementById('particles');
  while(root.firstChild) root.removeChild(root.firstChild);
  for(let i=0;i<count;i++){
    const s = document.createElement('a-sphere');
    const px = (Math.random()*2 - 1) * 3;
    const py = Math.random()*2 + 0.8;
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

/* smoke (cylinders ascendenti) */
function createSmoke(count = 20){
  const root = document.getElementById('particles');
  for(let i=0;i<count;i++){
    const e = document.createElement('a-cylinder');
    const px = (Math.random()*2 - 1) * 3;
    const py = 0.5 + Math.random()*2.0;
    const pz = (Math.random()*2 - 1) * 3;
    e.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    e.setAttribute('radius', 0.03);
    e.setAttribute('height', (0.7 + Math.random()*0.5).toFixed(3));
    e.setAttribute('color', '#ff1111');
    e.setAttribute('opacity', 0.35 + Math.random()*0.15);
    e.setAttribute('animation', `property: position; to: ${px.toFixed(3)} ${(py+0.6).toFixed(3)} ${pz.toFixed(3)}; dur: ${1800 + Math.random()*1800}; dir: alternate; loop: true; easing: easeInOutSine`);
    root.appendChild(e);
  }
}

/* --- CREA TETTO CON LE STESSE SFERE PRESENTI A TERRA --- */
function createRoofFromGround(){
  const root = document.getElementById('particles');
  const children = Array.from(root.children);
  const roofContainer = document.createElement('a-entity');
  roofContainer.setAttribute('id', 'roofContainer');
  children.forEach((child) => {
    if(child.tagName.toLowerCase() === 'a-sphere'){
      const pos = child.getAttribute('position').split(' ').map(n => parseFloat(n));
      const radius = child.getAttribute('radius') || 0.04;
      const color = child.getAttribute('color') || '#ff2b2b';
      const s = document.createElement('a-sphere');
      const x = pos[0];
      const z = pos[2];
      const roofY = 3.2 + (Math.random()*0.3 - 0.15);
      s.setAttribute('position', `${x.toFixed(3)} ${roofY.toFixed(3)} ${z.toFixed(3)}`);
      s.setAttribute('radius', radius);
      s.setAttribute('color', color);
      const dur = 1200 + Math.random()*1800;
      s.setAttribute('animation', `property: position; to: ${x.toFixed(3)} ${(roofY+0.25).toFixed(3)} ${z.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);
      roofContainer.appendChild(s);
    }
  });
  document.querySelector('a-scene').appendChild(roofContainer);
}

/* --- CREA PAVIMENTO (cloni delle sfere, basso) --- */
function createFloorFromGround(){
  const root = document.getElementById('particles');
  const children = Array.from(root.children);
  const floorContainer = document.createElement('a-entity');
  floorContainer.setAttribute('id', 'floorContainer');
  children.forEach((child) => {
    if(child.tagName.toLowerCase() === 'a-sphere'){
      const pos = child.getAttribute('position').split(' ').map(n => parseFloat(n));
      const radius = child.getAttribute('radius') || 0.04;
      const color = child.getAttribute('color') || '#ff2b2b';
      const s = document.createElement('a-sphere');
      const x = pos[0];
      const z = pos[2];
      const floorY = 0.35 + (Math.random()*0.07 - 0.035); // basso, vicino al suolo
      s.setAttribute('position', `${x.toFixed(3)} ${floorY.toFixed(3)} ${z.toFixed(3)}`);
      s.setAttribute('radius', radius);
      s.setAttribute('color', color);
      s.setAttribute('opacity', 0.95);
      const dur = 1800 + Math.random()*2000;
      s.setAttribute('animation', `property: position; to: ${x.toFixed(3)} ${(floorY+0.08).toFixed(3)} ${z.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);
      floorContainer.appendChild(s);
    }
  });
  document.querySelector('a-scene').appendChild(floorContainer);
}

/* --- LUCE PULSANTE --- */
function animateLight(){
  const light = document.getElementById('pulseLight');
  if(!light) return;
  light.setAttribute('animation__pulse', 'property: light.intensity; from: 0.35; to: 1.1; dur: 1200; dir: alternate; loop: true; easing: easeInOutSine');
}

/* --- INTERAZIONI: QR, video, logos, items --- */
function setupInteractions(){
  preserveVideoAspect();

  // inizialmente disabilitiamo i loghi
  replayLogo.setAttribute('visible', false);
  whatsappLogo.setAttribute('visible', false);
  replayLogo.classList.remove('clickable');
  whatsappLogo.classList.remove('clickable');

  qr.addEventListener('click', async () => {
    qr.setAttribute('visible', false);
    demoVideo.setAttribute('visible', true);
    try {
      await holoVideo.play();
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
    } catch (err) {
      videoTapOverlay.style.display = 'flex';
    }
  });

  tapToPlay && tapToPlay.addEventListener('click', async () => {
    videoTapOverlay.style.display = 'none';
    try {
      await holoVideo.play();
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
    } catch(err) {
      alert('Impossibile avviare il video.');
    }
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

  // --- ITEMS: assegna listener in modo sicuro (un solo handler per item) ---
  const audioMap = { 'Radio':'radio.mp3', 'Fantacalcio':'fantacalcio.mp3', 'Dj':'dj.mp3' };
  const linkMap = {
    'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
    'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
    'Catania':'https://www.instagram.com/officialcataniafc/',
    'Eduverse':'https://www.instagram.com/eduverse___/'
  };

  itemIds.forEach(id => {
    const el = document.getElementById(id);
    if(!el){
      console.warn('Elemento non trovato:', id);
      return;
    }

    // assicurati che l'elemento sia visibile/clickable e non abbia listener multipli
    el.setAttribute('visible', true);
    el.setAttribute('class', 'item clickable');
    el.setAttribute('material', 'shader: flat; side: double');

    // rimuovi eventuale onclick precedente (defensive)
    el.onclick = null;

    // assegna un singolo handler usando onclick (garantisce un solo handler)
    el.onclick = () => {
      console.log('CLICK su item:', id);

      // audio single-instance
      if(audioMap[id]){
        const existing = audioInstances[id];
        if(existing && !existing.paused && !existing.ended){
          console.log('Audio già in riproduzione per', id, '- click ignorato');
          return;
        }
        let a = audioInstances[id];
        if(!a){
          a = new Audio(audioMap[id]);
          a.preload = 'auto';
          audioInstances[id] = a;
        } else {
          try{ a.currentTime = 0; }catch(e){}
        }
        try{ a.play(); }catch(e){ console.warn('audio play blocked', e); }
        try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
        a.onended = () => { try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){} };
        return;
      }

      // special links
      if(id === 'Tromba'){ window.open('https://youtu.be/AMK10N6wwHM','_blank'); return; }
      if(id === 'Ballerino'){ window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return; }
      if(linkMap[id]){ window.open(linkMap[id], '_blank'); return; }

      // fallback
      window.open('https://instagram.com','_blank');
    };
  });
}

/* --- mantieni corretta l'aspect ratio del piano video a-video --- */
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
      const aspect = w / h;
      const baseH = 1.0;
      const sx = baseH * aspect;
      const sy = baseH;
      demoVideo.setAttribute('scale', `${sx} ${sy} 1`);
    }
  });
  probe.load();
}