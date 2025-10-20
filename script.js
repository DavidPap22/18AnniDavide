/* script.js
   - Avvia camera posteriore e imposta il video stream come 'a-sky' texture
   - Gestisce Start, click sugli oggetti (link, audio, video olografico)
   - Mostra icone laterali al termine del video olografico
*/

/* DOM */
const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('startScreen');
const bgMusic = document.getElementById('bgMusic');
const audioFant = document.getElementById('audio-fantacalcio');
const audioDj = document.getElementById('audio-dj');
const holoVideo = document.getElementById('holoVideo');
const cameraSky = document.getElementById('cameraSky');

/* A-Frame entity getters */
const qrEntity = () => document.querySelector('#qrObject');
const holoEntity = () => document.querySelector('#holo');
const whatsEntity = () => document.querySelector('#whatsIcon');
const replayEntity = () => document.querySelector('#replayIcon');

/* Utility: stop other audios except given one */
function stopAllAudioExcept(exceptEl) {
  [bgMusic, audioFant, audioDj, holoVideo].forEach(a => {
    if (!a) return;
    if (a !== exceptEl) {
      try { a.pause(); a.currentTime = 0; } catch (e) {}
    }
  });
}

/* Start button handler */
startBtn.addEventListener('click', async () => {
  try { await bgMusic.play(); } catch (e) { console.warn('bgMusic play blocked', e); }

  startScreen.style.display = 'none';

  try {
    await startCameraStream();
    initInteractions();
  } catch (err) {
    console.error('Errore camera:', err);
    alert('Impossibile avviare la fotocamera posteriore: ' + err);
  }
});

/* Start camera with facingMode environment, fallback if needed */
async function startCameraStream(){
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
  } catch (e1) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch (e2) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  // create hidden video element for sky
  const camVid = document.createElement('video');
  camVid.setAttribute('id', 'cameraStream');
  camVid.setAttribute('autoplay', 'true');
  camVid.setAttribute('playsinline', '');
  camVid.muted = true;
  camVid.srcObject = stream;
  document.body.appendChild(camVid);

  try { await camVid.play(); } catch (e) { console.warn('cameraStream play blocked', e); }

  // assign to a-sky
  cameraSky.setAttribute('src', '#cameraStream');
  cameraSky.setAttribute('rotation', '0 -90 0');
}

/* Setup interactions */
function initInteractions() {
  const don = document.querySelector('#donObj');
  const radio = document.querySelector('#radioObj');
  const etna = document.querySelector('#etnaObj');
  const tromba = document.querySelector('#trombaObj');
  const catania = document.querySelector('#cataniaObj');
  const edu = document.querySelector('#eduObj');
  const fant = document.querySelector('#fantObj');
  const dj = document.querySelector('#djObj');
  const baller = document.querySelector('#ballerinoObj');

  // helper to bind click + touchstart for A-Frame entities
  function addTap(el, fn) {
    if (!el) return;
    el.addEventListener('click', fn);
    el.addEventListener('touchstart', function(ev){ ev.preventDefault(); fn(ev); }, {passive:false});
  }

  // QR: attiva ologramma (video interno), abbassa bgMusic
  addTap(qrEntity(), () => {
    try { bgMusic.volume = 0.2; } catch(e){}

    const holo = holoEntity();
    holo.setAttribute('visible', 'true');

    try {
      stopAllAudioExcept(holoVideo);
      holoVideo.currentTime = 0;
      holoVideo.play().catch(e => console.warn('holoVideo play err', e));
    } catch (e) { console.warn(e); }

    holoVideo.onended = () => {
      try { bgMusic.volume = 1.0; } catch(e){}
      const whats = whatsEntity();
      const replay = replayEntity();
      if (whats) whats.setAttribute('visible', 'true');
      if (replay) replay.setAttribute('visible', 'true');
    };
  });

  // links
  addTap(don, () => window.open('https://www.instagram.com/giovani_animatori_trecastagni/', '_blank'));
  addTap(radio, () => window.open('https://open.spotify.com/intl-it/track/3nhAgjyrfUUCNDMZHx6LCa', '_blank'));
  addTap(etna, () => window.open('https://www.instagram.com/etnaensemble/', '_blank'));
  addTap(tromba, () => window.open('https://youtu.be/AMK10N6wwHM?si=RZspAJNRKQqQxXOl', '_blank'));
  addTap(catania, () => window.open('https://www.instagram.com/officialcataniafc/', '_blank'));
  addTap(edu, () => window.open('https://www.instagram.com/eduverse___/', '_blank'));
  addTap(baller, () => window.open('https://youtu.be/JS_BY3LRBqw?si=v-Zp7WYvStp2vWFw', '_blank'));

  // internal mp3 players
  addTap(fant, () => {
    stopAllAudioExcept(audioFant);
    audioFant.play().catch(e => console.warn('fant play error', e));
  });
  addTap(dj, () => {
    stopAllAudioExcept(audioDj);
    audioDj.play().catch(e => console.warn('dj play error', e));
  });

  // lower bgMusic while internal audio/holo play
  [audioFant, audioDj, holoVideo].forEach(el => {
    if (!el) return;
    el.addEventListener('play', () => { try { bgMusic.volume = 0.2; } catch(e){} });
    el.addEventListener('pause', () => { try { bgMusic.volume = 1.0; } catch(e){} });
    el.addEventListener('ended', () => { try { bgMusic.volume = 1.0; } catch(e){} });
  });

  // WhatsApp and replay icons (showed after holo ends)
  const whats = whatsEntity();
  const replay = replayEntity();
  if (whats) {
    addTap(whats, () => window.open('https://wa.me/tuonumero', '_blank'));
  }
  if (replay) {
    addTap(replay, () => {
      if (whats) whats.setAttribute('visible', 'false');
      replay.setAttribute('visible', 'false');
      holoVideo.currentTime = 0;
      stopAllAudioExcept(holoVideo);
      holoVideo.play().catch(e => console.warn('replay play error', e));
      try { bgMusic.volume = 0.2; } catch(e){}
    });
  }

  // small tap animation feedback (scale)
  const clickables = document.querySelectorAll('.interactive');
  clickables.forEach(c => {
    c.addEventListener('click', () => {
      c.setAttribute('scale', '1.08 1.08 1.08');
      setTimeout(() => c.setAttribute('scale', '1 1 1'), 180);
    });
  });
}

/* NOTES:
 - Serve HTTPS per getUserMedia su molti browser.
 - iOS Safari può comportarsi diversamente: testare su Safari e Chrome Android.
 - Se alcuni dispositivi non supportano facingMode exact, fallback prova a usare environment o qualsiasi camera.
*/