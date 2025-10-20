/* script.js
   - Avvia camera posteriore e imposta il video stream come 'a-sky' texture
   - Gestisce Start, click sugli oggetti (link, audio, video olografico)
   - Mostra icone laterali al termine del video olografico
*/

/* Elementi DOM */
const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('startScreen');
const bgMusic = document.getElementById('bgMusic');
const audioFant = document.getElementById('audio-fantacalcio');
const audioDj = document.getElementById('audio-dj');
const holoVideo = document.getElementById('holoVideo'); // DOM video asset
const cameraSky = document.getElementById('cameraSky');

/* A-Frame entities */
const qrEntity = () => document.querySelector('#qrObject');
const holoEntity = () => document.querySelector('#holo');
const whatsEntity = () => document.querySelector('#whatsIcon');
const replayEntity = () => document.querySelector('#replayIcon');

/* Utili */
function stopAllAudioExcept(exceptEl) {
  [bgMusic, audioFant, audioDj, holoVideo].forEach(a => {
    if (!a) return;
    if (a !== exceptEl) {
      try { a.pause(); a.currentTime = 0; } catch (e) {}
    }
  });
}

/* Start button: play bg music and start camera */
startBtn.addEventListener('click', async () => {
  // play background music with user gesture (mobile requirement)
  try { await bgMusic.play(); } catch (e) { console.warn('bgMusic play blocked', e); }

  // hide start screen
  startScreen.style.display = 'none';

  // start camera and scene interactions
  startCameraStream().then(initInteractions).catch(err => {
    console.warn('start error', err);
    alert('Errore avvio fotocamera: ' + err);
  });
});

/* Start camera with facingMode environment, with fallback if necessary */
async function startCameraStream(){
  // Try exact environment constraint first (best on many Android)
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
  } catch (e1) {
    // fallback: looser constraint
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch (e2) {
      // final fallback: any camera
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  // create hidden video element to be used as sky texture
  const camVid = document.createElement('video');
  camVid.setAttribute('id', 'cameraStream');
  camVid.setAttribute('autoplay', 'true');
  camVid.setAttribute('playsinline', '');
  camVid.muted = true;
  camVid.srcObject = stream;
  document.body.appendChild(camVid);

  // wait a tick to allow play to start
  try { await camVid.play(); } catch (e) { console.warn('camVid play blocked', e); }

  // assign as sky texture
  cameraSky.setAttribute('src', '#cameraStream');
  cameraSky.setAttribute('rotation', '0 -90 0'); // orientation tweak if needed
}

/* Setup interactions for all clickable entities */
function initInteractions() {
  // selectors
  const don = document.querySelector('#donObj');
  const radio = document.querySelector('#radioObj');
  const etna = document.querySelector('#etnaObj');
  const tromba = document.querySelector('#trombaObj');
  const catania = document.querySelector('#cataniaObj');
  const edu = document.querySelector('#eduObj');
  const fant = document.querySelector('#fantObj');
  const dj = document.querySelector('#djObj');
  const baller = document.querySelector('#ballerinoObj');

  // helper to bind click + touch
  function addTap(el, fn) {
    if (!el) return;
    el.addEventListener('click', fn);
    el.addEventListener('touchstart', function(ev){ ev.preventDefault(); fn(ev); }, {passive:false});
  }

  // QR: apre video olografico interno (asset holoVideo)
  addTap(qrEntity(), () => {
    // reduce bg music
    bgMusic.volume = 0.2;

    // show holo in A-Frame
    const holo = holoEntity();
    holo.setAttribute('visible', 'true');

    // play DOM video (asset referenced by a-video)
    try {
      stopAllAudioExcept(holoVideo);
      holoVideo.currentTime = 0;
      holoVideo.play().catch(e => console.warn('holoVideo play err', e));
    } catch (e) { console.warn(e); }

    // when holo ends, restore music and show icons near holo
    holoVideo.onended = () => {
      bgMusic.volume = 1.0;
      const whats = whatsEntity();
      const replay = replayEntity();
      if (whats) whats.setAttribute('visible', 'true');
      if (replay) replay.setAttribute('visible', 'true');
    };
  });

  // Links open externally
  addTap(don, () => window.open('https://www.instagram.com/giovani_animatori_trecastagni/', '_blank'));
  addTap(radio, () => window.open('https://open.spotify.com/intl-it/track/3nhAgjyrfUUCNDMZHx6LCa', '_blank'));
  addTap(etna, () => window.open('https://www.instagram.com/etnaensemble/', '_blank'));
  addTap(tromba, () => window.open('https://youtu.be/AMK10N6wwHM?si=RZspAJNRKQqQxXOl', '_blank'));
  addTap(catania, () => window.open('https://www.instagram.com/officialcataniafc/', '_blank'));
  addTap(edu, () => window.open('https://www.instagram.com/eduverse___/', '_blank'));
  addTap(baller, () => window.open('https://youtu.be/JS_BY3LRBqw?si=v-Zp7WYvStp2vWFw', '_blank'));

  // Play internal mp3s (and lower bg music while they play)
  addTap(fant, () => {
    stopAllAudioExcept(audioFant);
    audioFant.play().catch(e => console.warn('fant play error', e));
  });
  addTap(dj, () => {
    stopAllAudioExcept(audioDj);
    audioDj.play().catch(e => console.warn('dj play error', e));
  });

  // When internal audios/holo play, lower bgMusic; when end -> restore
  [audioFant, audioDj, holoVideo].forEach(el => {
    if (!el) return;
    el.addEventListener('play', () => { try { bgMusic.volume = 0.2; } catch(e){} });
    el.addEventListener('pause', () => { try { bgMusic.volume = 1.0; } catch(e){} });
    el.addEventListener('ended', () => { try { bgMusic.volume = 1.0; } catch(e){} });
  });

  // WhatsApp icon: open chat (visible only after holo end)
  const whats = whatsEntity();
  const replay = replayEntity();
  if (whats) {
    addTap(whats, () => window.open('https://wa.me/tuonumero', '_blank'));
  }
  if (replay) {
    addTap(replay, () => {
      // hide icons, restart holo video and lower bg music
      replay.setAttribute('visible', 'false');
      if (whats) whats.setAttribute('visible', 'false');
      holoVideo.currentTime = 0;
      stopAllAudioExcept(holoVideo);
      holoVideo.play().catch(e => console.warn('replay play error', e));
      try { bgMusic.volume = 0.2; } catch(e){}
    });
  }

  // small tap animation feedback
  const clickables = document.querySelectorAll('.interactive');
  clickables.forEach(c => {
    c.addEventListener('click', () => {
      c.setAttribute('scale', '1.08 1.08 1.08');
      setTimeout(() => c.setAttribute('scale', '1 1 1'), 180);
    });
  });
}

/* NOTE:
 - Serve HTTPS for getUserMedia to work on many platforms.
 - iOS Safari may require specific handling: A-Frame + video as sky should work in modern iOS (Safari) but behavior can vary.
 - Test on several devices; small position tweaks can be done by changing the position attributes in index.html.
*/