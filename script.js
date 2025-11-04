// ---------- script.js aggiornato: texture updater per animazioni su a-image (fix iOS stuck) ----------

// ---------- Config e Variabili DOM ----------
const DEMO_DURATION_MS = 28000; // durata fissa 28 secondi
const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');
const cameraStreamEl = document.getElementById('cameraStream');
const holoVideo = document.getElementById('holoVideo'); // mp4 <video>
const demoVideo = document.getElementById('demoVideo'); // a-video entity
const holoImage = document.getElementById('holoImage'); // a-image for webp/gif
const videoTapOverlay = document.getElementById('videoTapOverlay');
const tapToPlay = document.getElementById('tapToPlay');
const qr = document.getElementById('qrCode');
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));

// Assets (nella root pubblica)
const demoWebpSrc = 'video-demo.webp';
const demoGifSrc = 'video-demo.gif';
const demoAudioSrc = 'demo-audio.mp3';

// Assicura volume alto per video su Android/desktop
try { holoVideo.volume = 1.0; } catch(e){}

// ---------- Texture updater per animazioni su a-image (fix iOS / webp/gif stuck) ----------
const _textureUpdaters = new Map(); // a-image element -> intervalId

function startTextureUpdater(aImageEl, fps = 20) {
  if (!aImageEl) return;
  stopTextureUpdater(aImageEl); // assicurati di non duplicare
  const intervalMs = Math.max(8, Math.round(1000 / fps));
  const id = setInterval(() => {
    try {
      const mesh = aImageEl.getObject3D && aImageEl.getObject3D('mesh');
      if (mesh && mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => { if (m && m.map) m.map.needsUpdate = true; });
        } else {
          if (mesh.material.map) mesh.material.map.needsUpdate = true;
        }
      }
    } catch (e) { /* ignore occasional errors */ }
  }, intervalMs);
  _textureUpdaters.set(aImageEl, id);
}

function stopTextureUpdater(aImageEl) {
  if (!aImageEl) return;
  const id = _textureUpdaters.get(aImageEl);
  if (id) {
    clearInterval(id);
    _textureUpdaters.delete(aImageEl);
  }
}

// ---------- Helper: rilevamento iOS ----------
function isIOS() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1) return true;
  return false;
}

// Test support webp minimale
function supportsWebPAnimated(callback) {
  const img = new Image();
  img.onload = () => callback(true);
  img.onerror = () => callback(false);
  img.src = demoWebpSrc + '?_v=1';
}

// ---------- face-camera component (unchanged) ----------
AFRAME.registerComponent('face-camera', {
  schema: { mode: { type: 'string', default: 'y' }, flip: { type: 'boolean', default: false }, lockX: { type: 'boolean', default: true }, lockZ: { type: 'boolean', default: true } },
  init: function () {
    this.cameraEl = document.querySelector('#camera');
    this.applyDoubleSideOnce();
    if (this.data.flip) this.applyFlipOnce();
  },
  applyDoubleSideOnce: function() {
    const mesh = this.el.getObject3D && this.el.getObject3D('mesh');
    if (!mesh) { setTimeout(()=>this.applyDoubleSideOnce(), 120); return; }
    try {
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => { m.side = THREE.DoubleSide; m.needsUpdate = true; });
      else if (mesh.material) { mesh.material.side = THREE.DoubleSide; mesh.material.needsUpdate = true; }
    } catch(e){}
  },
  applyFlipOnce: function() {
    const sAttr = this.el.getAttribute('scale') || '1 1 1';
    const parts = (typeof sAttr === 'string' ? sAttr.split(' ') : [sAttr.x, sAttr.y, sAttr.z]);
    const sx = -Math.abs(parseFloat(parts[0] || 1)), sy = parseFloat(parts[1]||1), sz = parseFloat(parts[2]||1);
    this.el.setAttribute('scale', `${sx} ${sy} ${sz}`);
  },
  tick: (function(){
    const itemPos = new THREE.Vector3(), camPos = new THREE.Vector3();
    return function(){
      const camEl = this.cameraEl; if(!camEl||!camEl.object3D||!this.el.object3D) return;
      this.el.object3D.getWorldPosition(itemPos); camEl.object3D.getWorldPosition(camPos);
      if (this.data.mode === 'free') {
        this.el.object3D.lookAt(camPos);
        const ry = this.el.object3D.rotation.y;
        const rx = this.data.lockX ? 0 : this.el.object3D.rotation.x;
        const rz = this.data.lockZ ? 0 : this.el.object3D.rotation.z;
        this.el.object3D.rotation.set(rx, ry, rz);
      } else {
        const dx = camPos.x - itemPos.x, dz = camPos.z - itemPos.z;
        const angle = Math.atan2(dx, dz);
        this.el.object3D.rotation.set(0, angle + Math.PI, 0);
      }
    };
  })()
});

// ---------- utility per holoImage (position/scale copy) ----------
function setHoloImageScaleToDemoVideo() {
  try {
    const scale = demoVideo.getAttribute('scale');
    if (scale) holoImage.setAttribute('scale', scale);
    const pos = demoVideo.getAttribute('position');
    if (pos) holoImage.setAttribute('position', pos);
  } catch(e){}
}

function hideHoloImage() {
  try {
    holoImage.setAttribute('visible', false);
    holoImage.setAttribute('src', '');
    stopTextureUpdater(holoImage);
  } catch(e){}
}

// ---------- demo audio helper ----------
let demoAudio = null;
function createDemoAudio() {
  if (demoAudio) { try { demoAudio.pause(); demoAudio.currentTime = 0; } catch(e){} }
  demoAudio = new Audio(demoAudioSrc);
  demoAudio.preload = 'auto';
  return demoAudio;
}

// ---------- MAIN: avvio esperienza (invariato) ----------
startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch(e) {}
  startOverlay.style.display = 'none';
  try { await startCameraWithRetries(); } catch(e) { alert('Impossibile avviare la fotocamera.'); return; }

  qr.setAttribute('position','0 1.2 -1.5'); qr.setAttribute('scale','1.3 1.3 1');
  demoVideo.setAttribute('position','0 1.2 -1.5');
  replayLogo.setAttribute('position','-0.9 1.2 -1.5'); whatsappLogo.setAttribute('position','0.9 1.2 -1.5');
  replayLogo.setAttribute('visible',false); whatsappLogo.setAttribute('visible',false);
  replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

  distributeItemsCircle(2.0, 2.2);
  createParticles(36); createSmoke(25); animateLight();
  setupInteractions();

  // attach face-camera to items
  itemIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('face-camera','mode: y; flip: true; lockX: true; lockZ: true');
  });
});

// ---------- CAMERA / PARTICLES / ITEMS (mantiene il codice che già hai) ----------
async function startCameraWithRetries(){
  cameraStreamEl.setAttribute('playsinline',''); cameraStreamEl.setAttribute('webkit-playsinline','');
  cameraStreamEl.setAttribute('autoplay',''); cameraStreamEl.setAttribute('muted',''); cameraStreamEl.setAttribute('crossorigin','anonymous');
  cameraStreamEl.style.objectFit='cover';
  const attempts=[{video:{facingMode:{ideal:'environment'}},audio:false},{video:{facingMode:'environment'},audio:false},{video:true,audio:false}];
  let lastErr=null,stream=null;
  for(const c of attempts){
    try{ stream=await navigator.mediaDevices.getUserMedia(c); if(stream) break; } catch(e){ lastErr=e; await wait(180); }
  }
  if(!stream) throw lastErr||new Error('Nessuno stream');
  cameraStreamEl.srcObject=stream; cameraStreamEl.muted=true; cameraStreamEl.playsInline=true;
  try{ const p=cameraStreamEl.play(); if(p&&p.then) await p }catch(e){}
  await new Promise(r=>{ let done=false; function onPlay(){ if(done) return; done=true; cameraStreamEl.removeEventListener('playing',onPlay); r(); } cameraStreamEl.addEventListener('playing',onPlay); setTimeout(()=>{ if(!done){ done=true; cameraStreamEl.removeEventListener('playing',onPlay); r(); } },1800); });
  document.getElementById('cameraSky').setAttribute('material','shader: flat; src: #cameraStream');
  forceSkyTextureUpdate(document.getElementById('cameraSky'),1400,80);
}
function forceSkyTextureUpdate(skyEl,d=1400,i=80){
  const start=Date.now(); const tid=setInterval(()=>{ try{ const mesh=skyEl.getObject3D('mesh'); if(mesh&&mesh.material&&mesh.material.map){ mesh.material.map.needsUpdate=true; mesh.material.needsUpdate=true; } }catch(e){} if(Date.now()-start>d) clearInterval(tid); }, i);
}

// ---------- ITEMS su cerchio ----------
function distributeItemsCircle(radius=2.0, height=2.2){
  const count=itemIds.length; const angleStep=(2*Math.PI)/count;
  itemIds.forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    const angle=i*angleStep + (Math.random()*0.1-0.05);
    const x=radius*Math.cos(angle), z=radius*Math.sin(angle), y=height;
    el.setAttribute('position', `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale','0.95 0.95 0.95'); el.classList.add('clickable');
    const amp=0.08+Math.random()*0.04, dur=800+Math.random()*600;
    el.setAttribute('animation__float', `property: position; to: ${x.toFixed(3)} ${(y+amp).toFixed(3)} ${z.toFixed(3)}; dur:${dur}; dir:alternate; loop:true; easing:easeInOutSine`);
  });
}

// ---------- PARTICLES / FUMO ----------
function createParticles(count=32){
  const root=document.getElementById('particles'); while(root.firstChild) root.removeChild(root.firstChild);
  for(let i=0;i<count;i++){
    const s=document.createElement('a-sphere');
    const px=(Math.random()*2-1)*3, py=Math.random()*2+0.6, pz=(Math.random()*2-1)*3;
    s.setAttribute('position',`${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    s.setAttribute('radius',(0.03+Math.random()*0.04).toFixed(3)); s.setAttribute('color','#ff2b2b');
    const tx=(px+(Math.random()*0.6-0.3)).toFixed(3), ty=(py+(Math.random()*0.6-0.3)).toFixed(3), tz=(pz+(Math.random()*0.6-0.3)).toFixed(3);
    const dur=800+Math.random()*1000;
    s.setAttribute('animation__float', `property: position; to: ${tx} ${ty} ${tz}; dur:${Math.round(dur)}; dir:alternate; loop:true; easing:easeInOutSine`);
    root.appendChild(s);
  }
}
function createSmoke(count=20){
  const root=document.getElementById('particles');
  for(let i=0;i<count;i++){
    const e=document.createElement('a-cylinder');
    const px=(Math.random()*2-1)*3, py=0.5+Math.random()*2, pz=(Math.random()*2-1)*3;
    e.setAttribute('position',`${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
    e.setAttribute('radius',0.03); e.setAttribute('height',0.7+Math.random()*0.5); e.setAttribute('color','#ff1111'); e.setAttribute('opacity',0.45);
    const ty=(py+0.6).toFixed(3), dur=900+Math.random()*900;
    e.setAttribute('animation__rise', `property: position; to: ${px.toFixed(3)} ${ty} ${pz.toFixed(3)}; dur:${Math.round(dur)}; dir:alternate; loop:true; easing:easeInOutSine`);
    root.appendChild(e);
  }
}
function animateLight(){ const light=document.getElementById('pulseLight'); light.setAttribute('animation','property:intensity; to:1.1; dur:1200; dir:alternate; loop:true; easing:easeInOutSine'); }

// ---------- setupInteractions (migliorato caricamento immagine + texture updater) ----------
const playingAudios = {};
let demoAnimTimeoutId = null;

function setupInteractions(){
  const audioMap = { 'Fantacalcio':'fantacalcio.mp3', 'Dj':'dj.mp3' };
  const linkMap = {
    'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
    'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
    'Catania':'https://www.instagram.com/officialcataniafc/',
    'Eduverse':'https://www.instagram.com/eduverse___/',
    'Radio':'https://open.spotify.com/intl-it/track/3nhAgjyrfUUCNDMZHx6LCa?si=043e9baf88924a82',
    'Tromba':'https://youtu.be/AMK10N6wwHM',
    'Ballerino':'https://youtu.be/JS_BY3LRBqw'
  };

  preserveVideoAspect();

  // Helper interno: avvia immagine animata + audio con gestione robusta del caricamento
  async function playAnimatedImageWithAudio(src) {
    // pulisci eventuali precedenti
    if (demoAnimTimeoutId) { clearTimeout(demoAnimTimeoutId); demoAnimTimeoutId = null; }
    try { holoImage.setAttribute('src', ''); holoImage.setAttribute('visible', false); stopTextureUpdater(holoImage); } catch(e){}

    // copia scale/pos
    setHoloImageScaleToDemoVideo();

    // crea audio
    try { createDemoAudio(); } catch(e){}

    // crea un object Image per test onload/onerror
    const testImg = new Image();
    let loaded = false;

    testImg.onload = async function() {
      loaded = true;
      // set the a-image src (cache-bust already applied by caller)
      holoImage.setAttribute('src', src);
      holoImage.setAttribute('visible', true);

      // start texture updater so three.js updates frames
      startTextureUpdater(holoImage, 20); // 20 fps default

      // pausa bgMusic e salva punto
      try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}

      // proviamo a far partire l'audio (user gesture presente)
      try { if (demoAudio) await demoAudio.play().catch(()=>{}); } catch(e){}

      // start timeout basato su DEMO_DURATION_MS (inizia ora che l'immagine è pronta)
      demoAnimTimeoutId = setTimeout(() => {
        // stop audio
        try { if (demoAudio) { demoAudio.pause(); demoAudio.currentTime = 0; } } catch(e){}
        // hide image and stop updater
        try { holoImage.setAttribute('visible', false); holoImage.setAttribute('src',''); stopTextureUpdater(holoImage); } catch(e){}
        // show logos e resume bgMusic
        try {
          replayLogo.setAttribute('visible', true);
          whatsappLogo.setAttribute('visible', true);
          replayLogo.classList.add('clickable'); whatsappLogo.classList.add('clickable');
        } catch(e){}
        try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
      }, DEMO_DURATION_MS + 200);
    };

    testImg.onerror = function() {
      // se l'immagine non carica, non blocchiamo l'esperienza: mostriamo subito i loghi
      try { stopTextureUpdater(holoImage); } catch(e){}
      try { holoImage.setAttribute('visible', false); holoImage.setAttribute('src',''); } catch(e){}
      try {
        replayLogo.setAttribute('visible', true);
        whatsappLogo.setAttribute('visible', true);
        replayLogo.classList.add('clickable'); whatsappLogo.classList.add('clickable');
      } catch(e){}
      try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
    };

    // avvia il caricamento del test image (cache-bust per replay gestito dal caller)
    testImg.src = src;
  }

  // QR click
  qr.addEventListener('click', async () => {
    if (isIOS()) {
      qr.setAttribute('visible', false);
      demoVideo.setAttribute('visible', false);
      replayLogo.setAttribute('visible', false); whatsappLogo.setAttribute('visible', false);
      replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

      supportsWebPAnimated((webpOk) => {
        const src = (webpOk ? demoWebpSrc : demoGifSrc) + '?_cb=' + Date.now();
        playAnimatedImageWithAudio(src);
      });
      return;
    }

    // Android/desktop flow (unchanged)
    qr.setAttribute('visible', false);
    demoVideo.setAttribute('visible', true);
    try { holoVideo.volume = 1.0; await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch (e) { videoTapOverlay.style.display = 'flex'; }
  });

  // tapToPlay overlay (unchanged)
  tapToPlay && tapToPlay.addEventListener('click', async () => {
    videoTapOverlay.style.display = 'none';
    try { holoVideo.volume = 1.0; await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){ alert('Impossibile avviare il video'); }
  });

  // when mp4 ends (Android/desktop) show logos (unchanged)
  holoVideo.addEventListener('ended', () => {
    demoVideo.setAttribute('visible', false);
    replayLogo.setAttribute('visible', true); whatsappLogo.setAttribute('visible', true);
    replayLogo.classList.add('clickable'); whatsappLogo.classList.add('clickable');
    try { bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); } catch(e){}
  });

  // replay behavior: restart mp4 or webp+audio depending on platform
  replayLogo.addEventListener('click', async () => {
    if (!replayLogo.getAttribute('visible')) return;

    // nascondi loghi
    replayLogo.setAttribute('visible', false); whatsappLogo.setAttribute('visible', false);
    replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

    // clear prev timeout
    if (demoAnimTimeoutId) { clearTimeout(demoAnimTimeoutId); demoAnimTimeoutId = null; }

    if (isIOS()) {
      supportsWebPAnimated((webpOk) => {
        const src = (webpOk ? demoWebpSrc : demoGifSrc) + '?_cb=' + Date.now();
        playAnimatedImageWithAudio(src);
      });
      return;
    }

    // Android/desktop: restart mp4
    demoVideo.setAttribute('visible', true);
    try { holoVideo.currentTime = 0; holoVideo.volume = 1.0; await holoVideo.play(); bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){ videoTapOverlay.style.display = 'flex'; }
  });

  // whatsapp link
  whatsappLogo.addEventListener('click', ()=> {
    window.open('https://whatsapp.com/channel/0029VbCDIZCJUM2SokRjrw2W', '_blank');
  });

  // items interactions (unchanged)
  itemIds.forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('click', ()=>{
      const linkMap = {
        'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
        'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
        'Catania':'https://www.instagram.com/officialcataniafc/',
        'Eduverse':'https://www.instagram.com/eduverse___/',
        'Radio':'https://open.spotify.com/intl-it/track/3nhAgjyrfUUCNDMZHx6LCa?si=043e9baf88924a82',
        'Tromba':'https://youtu.be/AMK10N6wwHM',
        'Ballerino':'https://youtu.be/JS_BY3LRBqw'
      };
      const audioMap = { 'Fantacalcio':'fantacalcio.mp3', 'Dj':'dj.mp3' };

      if (linkMap[id]) { window.open(linkMap[id], '_blank'); return; }
      if (audioMap[id]) {
        if (playingAudios[id]) return;
        try { bgSavedTime = bgMusic.currentTime; bgMusic.pause(); } catch(e){}
        const a = new Audio(audioMap[id]); playingAudios[id] = a;
        const p = a.play();
        if (p && p.then) p.catch(()=>{ playingAudios[id]=null; try{ bgMusic.play(); }catch(e){} });
        a.addEventListener('ended', ()=>{ playingAudios[id]=null; try{ bgMusic.currentTime = bgSavedTime || 0; bgMusic.play(); }catch(e){} });
        return;
      }
      window.open('https://instagram.com','_blank');
    });
  });
}

// ---------- preserveVideoAspect (copia scale su holoImage) ----------
function preserveVideoAspect(){
  const src = holoVideo.querySelector('source') ? holoVideo.querySelector('source').src : holoVideo.src;
  if (!src) return;
  const probe = document.createElement('video'); probe.preload='metadata'; probe.src = src; probe.muted = true; probe.playsInline = true;
  probe.addEventListener('loadedmetadata', ()=> {
    const w = probe.videoWidth, h = probe.videoHeight;
    if (w && h) {
      const aspect = w/h, baseH = 1.0; const sx = baseH * aspect, sy = baseH;
      demoVideo.setAttribute('scale', `${sx} ${sy} 1`);
      // immediately copy to holoImage so image appears matching
      setTimeout(()=> setHoloImageScaleToDemoVideo(), 40);
    }
  });
  probe.load();
}

// ---------- cleanup ----------
window.addEventListener('beforeunload', ()=> {
  try { bgMusic.pause(); } catch(e){}
  try { holoVideo.pause(); } catch(e){}
  try { if (demoAudio) { demoAudio.pause(); demoAudio = null; } } catch(e){}
});

// NOTA: setupInteractions verrà chiamato nel flusso di avvio (startBtn)