// ---------- script.js aggiornato: single-play audio, radio link no-stop bgMusic,
// particles safe, maggior fluttuazione, video volume aumentato, Y-only orientamento ----------

// ---------- Variabili DOM ----------
const startBtn = document.getElementById('startBtn');
const startOverlay = document.getElementById('startOverlay');
const bgMusic = document.getElementById('bgMusic');
const cameraStreamEl = document.getElementById('cameraStream');
const holoVideo = document.getElementById('holoVideo'); // elemento video reale
const demoVideo = document.getElementById('demoVideo'); // a-video entity
const videoTapOverlay = document.getElementById('videoTapOverlay');
const tapToPlay = document.getElementById('tapToPlay');
const qr = document.getElementById('qrCode');
const replayLogo = document.getElementById('replayLogo');
const whatsappLogo = document.getElementById('whatsappLogo');

const itemIds = ['DonBosco','Radio','EtnaEnsemble','Tromba','Catania','Eduverse','Fantacalcio','Dj','Ballerino'];
let bgSavedTime = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));

// Mappa per tracciare audio in riproduzione (impedisce più istanze)
const playingAudio = {}; // playingAudio[id] = Audio object

// Imposta volume molto alto per il video (quando parte)
try { if (holoVideo) holoVideo.volume = 1.0; } catch (e) { /* ignore */ }

// ----------------- COMPONENTE A-FRAME: face-camera (Y-only di default) -----------------
AFRAME.registerComponent('face-camera', {
  schema: {
    mode: { type: 'string', default: 'y' }, // 'y' or 'free'
    flip: { type: 'boolean', default: false },
    lockX: { type: 'boolean', default: true },
    lockZ: { type: 'boolean', default: true }
  },
  init: function () {
    this.cameraEl = document.querySelector('#camera');
    this.applyDoubleSideOnce();
    if (this.data.flip) this.applyFlipOnce();
  },
  applyDoubleSideOnce: function() {
    const mesh = this.el.getObject3D && this.el.getObject3D('mesh');
    if (!mesh) {
      setTimeout(()=>this.applyDoubleSideOnce(), 120);
      return;
    }
    try {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => { m.side = THREE.DoubleSide; m.needsUpdate = true; });
      } else if (mesh.material) {
        mesh.material.side = THREE.DoubleSide;
        mesh.material.needsUpdate = true;
      }
    } catch (e) { /* ignore */ }
  },
  applyFlipOnce: function() {
    const sAttr = this.el.getAttribute('scale') || '1 1 1';
    const parts = (typeof sAttr === 'string' ? sAttr.split(' ') : [sAttr.x, sAttr.y, sAttr.z]);
    const sx = -Math.abs(parseFloat(parts[0] || 1));
    const sy = parseFloat(parts[1] || 1);
    const sz = parseFloat(parts[2] || 1);
    this.el.setAttribute('scale', `${sx} ${sy} ${sz}`);
  },
  tick: (function () {
    const itemPos = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    return function () {
      const camEl = this.cameraEl;
      if (!camEl || !camEl.object3D) return;
      if (!this.el.object3D) return;

      this.el.object3D.getWorldPosition(itemPos);
      camEl.object3D.getWorldPosition(camPos);

      if (this.data.mode === 'free') {
        this.el.object3D.lookAt(camPos);
        if (this.data.lockX || this.data.lockZ) {
          const ry = this.el.object3D.rotation.y;
          const rx = this.data.lockX ? 0 : this.el.object3D.rotation.x;
          const rz = this.data.lockZ ? 0 : this.el.object3D.rotation.z;
          this.el.object3D.rotation.set(rx, ry, rz);
        }
      } else {
        // Y-only: ruota solo su Y verso la camera
        const dx = camPos.x - itemPos.x;
        const dz = camPos.z - itemPos.z;
        const angle = Math.atan2(dx, dz);
        this.el.object3D.rotation.set(0, angle + Math.PI, 0);
      }
    };
  })()
});

// ----------------- Funzioni principali dell'esperienza -----------------

startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch (e) { /* autoplay blocked */ }
  startOverlay.style.display = 'none';
  try { await startCameraWithRetries(); } catch (e) { alert('Impossibile avviare la fotocamera.'); return; }

  qr.setAttribute('position', '0 1.2 -1.5'); qr.setAttribute('scale', '1.3 1.3 1');
  demoVideo.setAttribute('position', '0 1.2 -1.5');
  replayLogo.setAttribute('position', '-0.9 1.2 -1.5'); whatsappLogo.setAttribute('position', '0.9 1.2 -1.5');
  replayLogo.setAttribute('visible', false); whatsappLogo.setAttribute('visible', false);
  replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

  distributeItemsCircle(2.0, 2.2);
  createParticles(48); // più particelle ma leggere
  createSmoke(28);
  animateLight();
  setupInteractions();

  // Applica face-camera (Y-only) con flip a TUTTI gli item — mantiene Y-only orientamento
  itemIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('face-camera', 'mode: y; flip: true; lockX: true; lockZ: true');
    // Aggiungi leggera rotazione continua e pulsazione (usando nomi distinti per evitare conflitti)
    el.setAttribute('animation__rotate', `property: rotation; to: 0 ${ (Math.random()*30 - 15).toFixed(2) } 0; dur:${8000 + Math.random()*6000}; dir:alternate; loop:true; easing:linear`);
    const pos = el.getAttribute('position') || '0 1.6 -1.5';
    const amp = 0.18 + Math.random()*0.15; // aumentata ampiezza
    const dur = 1200 + Math.random()*1200;
    el.setAttribute('animation__float', `property: position; to: ${pos.split(' ')[0]} ${(parseFloat(pos.split(' ')[1]) + amp).toFixed(3)} ${pos.split(' ')[2]}; dur:${dur}; dir:alternate; loop:true; easing:easeInOutSine`);
  });
});