/* Config */
const ITEM_Y = 2.6;
const ITEM_RADIUS = 2.0;
const ROTATION_UPDATE_MS = 200;
const CREATE_ROOF = true;
const CREATE_FLOOR = true;

/* DOM refs */
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

/* audio singletons + handler registry */
const audioInstances = {};
const handlerRegistry = {}; // { id: { click:fn, mousedown:fn, touchstart:fn } }

/* Start: wait for scene loaded before wiring interactions */
const scene = document.querySelector('a-scene');
scene.addEventListener('loaded', () => {
  console.log('A-Frame scene loaded');
});

/* START button (user gesture) */
startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch(e){ /* ignore */ }
  startOverlay.style.display = 'none';

  try {
    await startCameraWithRetries();
  } catch (err) {
    alert('Impossibile avviare la fotocamera. Controlla permessi/HTTPS.');
    return;
  }

  // QR slightly further
  qr.setAttribute('position','0 1.2 -1.6');
  qr.setAttribute('scale','1.3 1.3 1');
  demoVideo.setAttribute('position','0 1.2 -1.6');
  replayLogo.setAttribute('position','-0.9 1.2 -1.6');
  whatsappLogo.setAttribute('position','0.9 1.2 -1.6');

  // prepare scene visuals
  distributeItemsCircle(ITEM_RADIUS, ITEM_Y);
  createParticles(36);
  createSmoke(20);
  animateLight();
  if(CREATE_ROOF) createRoofFromGround();
  if(CREATE_FLOOR) createFloorFromGround();

  // ensure items initialized in A-Frame before attaching handlers:
  // wait a tick for A-Frame to process attributes
  await wait(80);

  // start rotation updater & interactions
  startRotationUpdater();
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
  for(const c of attempts){
    try{ stream = await navigator.mediaDevices.getUserMedia(c); if(stream) break; } catch(e){ lastErr=e; await wait(180); }
  }
  if(!stream) throw lastErr || new Error('Nessuno stream');

  cameraStreamEl.srcObject = stream;
  cameraStreamEl.muted = true;
  cameraStreamEl.playsInline = true;
  try { await cameraStreamEl.play(); } catch(e){ /* ignore */ }

  await new Promise(r=>{
    let done=false;
    function onPlay(){ if(done) return; done=true; cameraStreamEl.removeEventListener('playing', onPlay); r(); }
    cameraStreamEl.addEventListener('playing', onPlay);
    setTimeout(()=>{ if(!done){ done=true; cameraStreamEl.removeEventListener('playing', onPlay); r(); }}, 1800);
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
    if(Date.now()-start>duration) clearInterval(tid);
  }, interval);
}

/* ITEMS layout & animation */
function distributeItemsCircle(radius = 2.0, height = ITEM_Y){
  const count = itemIds.length;
  const angleStep = (2*Math.PI)/count;
  itemIds.forEach((id,i)=>{
    const el = document.getElementById(id);
    if(!el) return;
    const angle = i*angleStep + (Math.random()*0.12 - 0.06);
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = height;

    el.setAttribute('visible', true);
    el.setAttribute('class', 'item clickable');
    el.setAttribute('material', 'shader: flat; side: double; transparent: true');

    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale','1 1 1');

    // float, sway, pulse & spin
    const amp = 0.06 + Math.random()*0.04;
    const dur = 1600 + Math.random()*1600;
    el.setAttribute('animation__float', `property: position; to: ${x.toFixed(3)} ${(y+amp).toFixed(3)} ${z.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);

    const swayAmpX = 0.02 + Math.random()*0.04;
    const swayAmpZ = 0.02 + Math.random()*0.04;
    const swayDur = 3000 + Math.random()*2000;
    const tx1 = (x + swayAmpX).toFixed(3);
    const tz1 = (z + swayAmpZ).toFixed(3);
    el.setAttribute('animation__sway', `property: position; to: ${tx1} ${y.toFixed(3)} ${tz1}; dur: ${swayDur}; dir: alternate; loop: true; easing: easeInOutSine`);

    const scaleTo = 1.08 + Math.random()*0.08;
    const pulseDur = 1200 + Math.random()*800;
    el.setAttribute('animation__pulse', `property: scale; to: ${scaleTo} ${scaleTo} ${scaleTo}; dur: ${pulseDur}; dir: alternate; loop: true; easing: easeInOutSine`);

    el.setAttribute('animation__spin', `property: rotation; to: 0 360 0; dur: ${12000 + Math.random()*8000}; loop: true; easing: linear`);
  });
}

/* Rotation updater so "front" faces camera */
let rotationUpdaterInterval = null;
function startRotationUpdater(){
  updateItemsRotationToCamera();
  if(rotationUpdaterInterval) clearInterval(rotationUpdaterInterval);
  rotationUpdaterInterval = setInterval(updateItemsRotationToCamera, ROTATION_UPDATE_MS);
}
function updateItemsRotationToCamera(){
  const camEl = document.getElementById('camera');
  if(!camEl || !camEl.object3D) return;
  const camPos = new THREE.Vector3();
  camEl.object3D.getWorldPosition(camPos);
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

/* Particles & smoke */
function createParticles(count=32){
  const root = document.getElementById('particles');
  while(root.firstChild) root.removeChild(root.firstChild);
  for(let i=0;i<count;i++){
    const s = document.createElement('a-sphere');
    const px = (Math.random()*2 -1) * 3;
    const py = Math.random()*2 + 0.8;
    const pz = (Math.random()*2 -1) * 3;
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
function createSmoke(count=20){
  const root = document.getElementById('particles');
  for(let i=0;i<count;i++){
    const e = document.createElement('a-cylinder');
    const px = (Math.random()*2 -1)*3;
    const py = 0.5 + Math.random()*2.0;
    const pz = (Math.random()*2 -1)*3;
    e.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    e.setAttribute('radius', 0.03);
    e.setAttribute('height', (0.7 + Math.random()*0.5).toFixed(3));
    e.setAttribute('color', '#ff1111');
    e.setAttribute('opacity', 0.35 + Math.random()*0.15);
    e.setAttribute('animation', `property: position; to: ${px.toFixed(3)} ${(py+0.6).toFixed(3)} ${pz.toFixed(3)}; dur: ${1800 + Math.random()*1800}; dir: alternate; loop: true; easing: easeInOutSine`);
    root.appendChild(e);
  }
}

/* Roof & floor clones of spheres */
function createRoofFromGround(){
  const root = document.getElementById('particles');
  const children = Array.from(root.children);
  const roofContainer = document.createElement('a-entity');
  roofContainer.setAttribute('id','roofContainer');
  children.forEach(child=>{
    if(child.tagName.toLowerCase() === 'a-sphere'){
      const pos = child.getAttribute('position').split(' ').map(Number);
      const radius = child.getAttribute('radius') || 0.04;
      const color = child.getAttribute('color') || '#ff2b2b';
      const s = document.createElement('a-sphere');
      const x = pos[0], z = pos[2];
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
function createFloorFromGround(){
  const root = document.getElementById('particles');
  const children = Array.from(root.children);
  const floorContainer = document.createElement('a-entity');
  floorContainer.setAttribute('id','floorContainer');
  children.forEach(child=>{
    if(child.tagName.toLowerCase() === 'a-sphere'){
      const pos = child.getAttribute('position').split(' ').map(Number);
      const radius = child.getAttribute('radius') || 0.04;
      const color = child.getAttribute('color') || '#ff2b2b';
      const s = document.createElement('a-sphere');
      const x = pos[0], z = pos[2];
      const floorY = 0.35 + (Math.random()*0.07 - 0.035);
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

/* Animate light */
function animateLight(){
  const light = document.getElementById('pulseLight');
  if(!light) return;
  light.setAttribute('animation__pulse','property: light.intensity; from: 0.35; to: 1.1; dur: 1200; dir: alternate; loop: true; easing: easeInOutSine');
}

/* Interactions robust: attach click/mousedown/touchstart after scene ready */
function setupInteractions(){
  preserveVideoAspect();

  // disable logos initially
  replayLogo.setAttribute('visible', false);
  whatsappLogo.setAttribute('visible', false);
  replayLogo.classList.remove('clickable');
  whatsappLogo.classList.remove('clickable');

  qr.addEventListener('click', async ()=>{
    qr.setAttribute('visible', false);
    demoVideo.setAttribute('visible', true);
    try{ await holoVideo.play(); try{ bgSavedTime = bgMusic.currentTime; bgMusic.pause(); }catch(e){} }catch(e){ videoTapOverlay.style.display='flex'; }
  });

  tapToPlay && tapToPlay.addEventListener('click', async ()=>{
    videoTapOverlay.style.display='none';
    try{ await holoVideo.play(); try{ bgSavedTime = bgMusic.currentTime; bgMusic.pause(); }catch(e){} }catch(e){ alert('Impossibile avviare il video'); }
  });

  holoVideo.addEventListener('ended', ()=>{
    demoVideo.setAttribute('visible', false);
    replayLogo.setAttribute('visible', true);
    whatsappLogo.setAttribute('visible', true);
    replayLogo.classList.add('clickable');
    whatsappLogo.classList.add('clickable');
    try{ bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); }catch(e){}
  });

  replayLogo.addEventListener('click', async ()=>{
    const vis = replayLogo.getAttribute('visible');
    if(!vis) return;
    replayLogo.setAttribute('visible', false);
    whatsappLogo.setAttribute('visible', false);
    replayLogo.classList.remove('clickable');
    whatsappLogo.classList.remove('clickable');
    demoVideo.setAttribute('visible', true);
    try{ await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); }catch(e){ videoTapOverlay.style.display='flex'; }
  });

  whatsappLogo.addEventListener('click', ()=>{
    const vis = whatsappLogo.getAttribute('visible');
    if(!vis) return;
    window.open('https://wa.me/1234567890', '_blank');
  });

  const audioMap = { 'Radio':'radio.mp3', 'Fantacalcio':'fantacalcio.mp3', 'Dj':'dj.mp3' };
  const linkMap = {
    'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
    'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
    'Catania':'https://www.instagram.com/officialcataniafc/',
    'Eduverse':'https://www.instagram.com/eduverse___/'
  };

  // attach item handlers robustly (click + touch)
  itemIds.forEach(id=>{
    const el = document.getElementById(id);
    if(!el){ console.warn('Elemento mancante:', id); return; }

    // ensure visible & clickable & double-sided
    el.setAttribute('visible', true);
    el.setAttribute('class', 'item clickable');
    el.setAttribute('material', 'shader: flat; side: double; transparent: true');

    // remove old handlers if present
    if(handlerRegistry[id]){
      const reg = handlerRegistry[id];
      if(reg.click) el.removeEventListener('click', reg.click);
      if(reg.mousedown) el.removeEventListener('mousedown', reg.mousedown);
      if(reg.touchstart) el.removeEventListener('touchstart', reg.touchstart);
      delete handlerRegistry[id];
    }

    // single shared function (keeps user gesture context)
    const handler = (evt) => {
      // prevent multiple pointer events bubbling
      evt && evt.stopPropagation && evt.stopPropagation();
      console.log('CLICK su item:', id);

      // audio single-instance
      if(audioMap[id]){
        const existing = audioInstances[id];
        if(existing && !existing.paused && !existing.ended){
          console.log('Audio già in riproduzione per', id);
          return;
        }
        let a = audioInstances[id];
        if(!a){ a = new Audio(audioMap[id]); a.preload='auto'; audioInstances[id]=a; }
        else { try{ a.currentTime = 0; }catch(e){} }
        try{ a.play(); }catch(e){ console.warn('audio play blocked', e); }
        try{ bgSavedTime = bgMusic.currentTime; bgMusic.pause(); }catch(e){}
        a.onended = ()=>{ try{ bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); }catch(e){} };
        return;
      }

      // special links
      if(id === 'Tromba'){ window.open('https://youtu.be/AMK10N6wwHM','_blank'); return; }
      if(id === 'Ballerino'){ window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return; }
      if(linkMap[id]){ window.open(linkMap[id], '_blank'); return; }

      // fallback
      window.open('https://instagram.com','_blank');
    };

    // create wrappers for different event types to be able to remove them later
    const onClick = (e)=> handler(e);
    const onDown = (e)=> handler(e);
    const onTouch = (e)=> handler(e);

    el.addEventListener('click', onClick);
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onTouch, {passive:true});

    handlerRegistry[id] = { click: onClick, mousedown: onDown, touchstart: onTouch };
  });
}

/* preserve video aspect */
function preserveVideoAspect(){
  const src = holoVideo.querySelector('source') ? holoVideo.querySelector('source').src : holoVideo.src;
  if(!src) return;
  const probe = document.createElement('video');
  probe.preload = 'metadata';
  probe.src = src;
  probe.muted = true;
  probe.playsInline = true;
  probe.addEventListener('loadedmetadata', ()=>{
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