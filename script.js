document.addEventListener('DOMContentLoaded', () => {
  const sceneEl = document.getElementById('scene');
  const startBtn = document.getElementById('startBtn');
  const startOverlay = document.getElementById('startOverlay');

  const bgMusic = document.getElementById('bgMusic');
  const holoVideo = document.getElementById('holoVideo');

  const qr = document.getElementById('qrCode');
  const demoVideo = document.getElementById('demoVideo');
  const replayLogo = document.getElementById('replayLogo');
  const whatsappLogo = document.getElementById('whatsappLogo');

  const itemIds = ['DonBosco', 'Radio', 'EtnaEnsemble', 'Tromba', 'Catania', 'Eduverse', 'Fantacalcio', 'Dj', 'Ballerino'];
  let bgSavedTime = 0;
  let hasStarted = false;

  // Funzione principale di avvio
  const startExperience = async () => {
    if (hasStarted) return;
    hasStarted = true;
    
    // Prova a far partire la musica di sottofondo (richiede interazione utente)
    try {
      bgMusic.volume = 0.5; // Abbassiamo un po' il volume
      await bgMusic.play();
    } catch (e) {
      console.warn("Impossibile avviare la musica di sottofondo automaticamente:", e);
    }

    // Nascondi l'overlay iniziale.
    // In modalità AR, A-Frame gestisce il bottone "Enter AR"
    startOverlay.style.display = 'none';

    // Una volta che la scena è in modalità AR, configuriamo gli elementi
    sceneEl.addEventListener('enter-vr', () => {
      console.log("Entrato in modalità AR");
      resetCentralElements();
      distributeItemsCircle(2.2, 1.5);
      createParticles(36);
      animateLight();
      setupInteractions();
    });
  };
  
  startBtn.addEventListener('click', startExperience);

  // Posiziona gli item in cerchio attorno all'utente
  function distributeItemsCircle(radius = 2.2, height = 1.5) {
    const count = itemIds.length;
    const angleStep = (2 * Math.PI) / count;
    itemIds.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const angle = i * angleStep;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      el.setAttribute('position', `${x.toFixed(3)} ${height.toFixed(3)} ${z.toFixed(3)}`);
      el.setAttribute('scale', '0.8 0.8 0.8');
      el.setAttribute('look-at', '[camera]');
      
      const amp = 0.07 + Math.random() * 0.05;
      const dur = 2000 + Math.random() * 1500;
      el.setAttribute('animation', `property: object3D.position.y; to: ${height + amp}; dur:${dur}; dir:alternate; loop:true; easing:easeInOutSine`);
    });
  }

  // Creazione effetti visivi
  function createParticles(count = 32) {
    const root = document.getElementById('particles');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    for (let i = 0; i < count; i++) {
      const s = document.createElement('a-sphere');
      const px = (Math.random() - 0.5) * 8;
      const py = Math.random() * 3 + 0.5;
      const pz = (Math.random() - 0.5) * 8;
      s.setAttribute('position', `${px.toFixed(3)} ${py.toFixed(3)} ${pz.toFixed(3)}`);
      s.setAttribute('radius', (0.02 + Math.random() * 0.03).toFixed(3));
      s.setAttribute('color', '#ff3333');
      s.setAttribute('material', 'opacity: 0.8; emissive: #ff3333; emissiveIntensity: 0.5');
      
      const tx = px + (Math.random() - 0.5) * 1.2;
      const ty = py + (Math.random() - 0.5) * 1.2;
      const tz = pz + (Math.random() - 0.5) * 1.2;
      const dur = 2000 + Math.random() * 3000;
      s.setAttribute('animation', `property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur:${dur}; dir:alternate; loop:true; easing:easeInOutSine`);
      root.appendChild(s);
    }
  }

  function animateLight() {
    const light = document.getElementById('pulseLight');
    light.setAttribute('animation', 'property: light.intensity; to: 1.2; dur: 1500; dir: alternate; loop: true; easing: easeInOutSine');
  }

  // Gestione delle interazioni
  function setupInteractions() {
    const audioMap = { 'Fantacalcio': '#fantacalcioAudio', 'Dj': '#djAudio' };
    const linkMap = {
      'DonBosco': 'https://www.instagram.com/giovani_animatori_trecastagni/',
      'Radio': 'https://open.spotify.com/intl-it/track/3nhAgjyrfUUCNDMZHx6LCa',
      'EtnaEnsemble': 'https://www.instagram.com/etnaensemble/',
      'Tromba': 'https://youtu.be/AMK10N6wwHM?si=RZspAJNRKQqQxXOl',
      'Catania': 'https://www.instagram.com/officialcataniafc/',
      'Eduverse': 'https://www.instagram.com/eduverse___/',
      'Ballerino': 'https://youtu.be/JS_BY3LRBqw?si=v-Zp7WYvStp2vWFw',
    };
    
    // Gestisce il click sull'invito per avviare il video
    const playMainVideo = async () => {
      qr.setAttribute('visible', 'false');
      demoVideo.setAttribute('visible', 'true');
      holoVideo.currentTime = 0;
      try {
        bgSavedTime = bgMusic.currentTime;
        bgMusic.pause();
        await holoVideo.play();
      } catch (e) {
        console.error("Errore nell'avvio del video:", e);
      }
    };
    
    qr.addEventListener('click', playMainVideo);

    holoVideo.addEventListener('ended', () => {
      demoVideo.setAttribute('visible', 'false');
      replayLogo.setAttribute('visible', 'true');
      whatsappLogo.setAttribute('visible', 'true');
      replayLogo.classList.add('clickable');
      whatsappLogo.classList.add('clickable');
      if (!bgMusic.paused) return;
      try {
        bgMusic.currentTime = bgSavedTime || 0;
        bgMusic.play();
      } catch (e) {}
    });

    replayLogo.addEventListener('click', async () => {
      if (!replayLogo.getAttribute('visible')) return;
      resetCentralElements();
      await playMainVideo();
    });

    whatsappLogo.addEventListener('click', () => {
      if (!whatsappLogo.getAttribute('visible')) return;
      // IMPORTANTE: Sostituisci questo link con quello VERO del tuo canale/gruppo WhatsApp!
      window.open('https://chat.whatsapp.com/INVITE_LINK', '_blank');
    });

    // Aggiunge gli eventi di click a tutti gli item
    itemIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      
      el.addEventListener('click', () => {
        // Animazione di feedback
        el.setAttribute('animation__click', 'property: scale; to: 1.2 1.2 1.2; dur: 150; dir: alternate; loop: 1');
        
        if (audioMap[id]) {
          const audioEl = document.querySelector(audioMap[id]);
          if (audioEl) {
            bgSavedTime = bgMusic.currentTime;
            bgMusic.pause();
            audioEl.currentTime = 0;
            audioEl.play();
            audioEl.onended = () => {
              try {
                bgMusic.currentTime = bgSavedTime || 0;
                bgMusic.play();
              } catch (e) {}
            };
          }
          return;
        }

        if (linkMap[id]) {
          window.open(linkMap[id], '_blank');
          return;
        }
      });
    });
    
    preserveVideoAspect();
  }

  function resetCentralElements() {
    qr.setAttribute('visible', 'true');
    demoVideo.setAttribute('visible', 'false');
    replayLogo.setAttribute('visible', 'false');
    whatsappLogo.setAttribute('visible', 'false');
    replayLogo.classList.remove('clickable');
    whatsappLogo.classList.remove('clickable');
  }

  // Mantiene le proporzioni corrette del video
  function preserveVideoAspect() {
    holoVideo.addEventListener('loadedmetadata', () => {
      const w = holoVideo.videoWidth;
      const h = holoVideo.videoHeight;
      if (w && h) {
        const aspect = w / h;
        const baseScale = 1.3; // Scala di base del video
        demoVideo.setAttribute('scale', `${baseScale * aspect} ${baseScale} 1`);
      }
    });
  }
});
