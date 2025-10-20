const SECRET_TOKEN = 'INVITO123';
const bgMusic = document.getElementById('bgMusic');

function getQueryParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function unlock() {
  document.getElementById('protected-overlay').classList.add('hidden');
  document.querySelector('a-scene').style.display = 'block';
  bgMusic.play();
  enableRearCamera();
}

function lock() {
  document.getElementById('protected-overlay').classList.remove('hidden');
  document.querySelector('a-scene').style.display = 'none';
}

window.addEventListener('DOMContentLoaded', ()=>{
  const q = getQueryParam('token');
  if(q && q === SECRET_TOKEN){ unlock(); } else { lock(); }

  document.getElementById('tokenForm').addEventListener('submit', e=>{
    e.preventDefault();
    const val = document.getElementById('token').value.trim();
    if(val === SECRET_TOKEN) unlock();
    else alert('Codice errato');
  });

  initARInteractions();
  initParticles();
  initInteractables();
});

// -------------------- Retro Camera Mobile --------------------
function enableRearCamera() {
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(stream => { /* AR.js usa automaticamente lo stream */ })
      .catch(err => alert("Attiva i permessi della fotocamera retro per vedere l'ambiente reale"));
  }
}

// -------------------- AR Interactions --------------------
function initARInteractions() {
  const qr = document.getElementById('qrCode');
  const video = document.getElementById('demoVideo');
  const replayLogo = document.getElementById('replayLogo');
  const whatsappLogo = document.getElementById('whatsappLogo');
  let pausedAt = 0;

  qr.addEventListener('click', ()=>{
    qr.setAttribute('visible', 'false');
    video.setAttribute('visible', 'true');
    video.play();
    bgMusic.volume = 0.2;
  });

  video.addEventListener('ended', ()=>{
    video.setAttribute('visible','false');
    replayLogo.setAttribute('visible','true');
    whatsappLogo.setAttribute('visible','true');
    bgMusic.volume = 1.0;
  });

  replayLogo.addEventListener('click', ()=>{
    replayLogo.setAttribute('visible','false');
    whatsappLogo.setAttribute('visible','false');
    video.setAttribute('visible','true');
    video.play();
    bgMusic.volume = 0.2;
  });

  whatsappLogo.addEventListener('click', ()=>{
    window.open('https://wa.me/1234567890','_blank');
  });

  document.querySelectorAll('.clickable').forEach(el=>{
    if(!['qrCode','demoVideo','replayLogo','whatsappLogo'].includes(el.id)){
      el.addEventListener('click', ()=>{
        pausedAt = bgMusic.currentTime;
        bgMusic.pause();
        let audio;
        switch(el.id){
          case 'Radio': audio=new Audio('radio.mp3'); break;
          case 'Fantacalcio': audio=new Audio('fantacalcio.mp3'); break;
          case 'Dj': audio=new Audio('dj.mp3'); break;
          case 'Tromba': window.open('https://youtu.be/AMK10N6wwHM','_blank'); return;
          case 'Ballerino': window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return;
          default: window.open('https://instagram.com','_blank'); return;
        }
        audio.play();
        audio.onended = ()=> {
          bgMusic.currentTime = pausedAt;
          bgMusic.play();
        };
      });
    }
  });
}

// -------------------- Particles and Light Effects --------------------
function initParticles() {
  const scene = document.querySelector('a-scene');
  for(let i=0;i<50;i++){
    const sphere = document.createElement('a-sphere');
    sphere.setAttribute('position', `${Math.random()*6-3} ${Math.random()*3+0.5} ${Math.random()*6-3}`);
    sphere.setAttribute('radius', 0.05);
    sphere.setAttribute('color', '#ff0000');
    sphere.setAttribute('animation', `property: position; dir: alternate; dur: ${Math.random()*2000+2000}; to: ${Math.random()*6-3} ${Math.random()*3+0.5} ${Math.random()*6-3}; loop: true`);
    scene.appendChild(sphere);
  }
}

// -------------------- Interactable Geometries --------------------
function initInteractables(){
  const interactables = document.querySelectorAll('.interactable');
  interactables.forEach(el=>{
    let isDragging = false;
    el.addEventListener('mousedown', ()=> isDragging=true);
    el.addEventListener('mouseup', ()=> isDragging=false);
    el.addEventListener('mousemove', e=>{
      if(isDragging){
        const pos = el.getAttribute('position');
        pos.x += (e.movementX*0.01);
        pos.y += (e.movementY*0.01);
        el.setAttribute('position', pos);
      }
    });
  });
}