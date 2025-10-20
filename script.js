const SECRET_TOKEN = 'INVITO123';

function getQueryParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function unlock() {
  document.getElementById('protected-overlay').classList.add('hidden');
  document.querySelector('a-scene').style.display = 'block';
  bgMusic.play();
}

function lock() {
  document.getElementById('protected-overlay').classList.remove('hidden');
  document.querySelector('a-scene').style.display = 'none';
}

window.addEventListener('DOMContentLoaded', ()=>{
  const q = getQueryParam('token');
  if(q && q === SECRET_TOKEN){ unlock(); } else { lock(); }

  const form = document.getElementById('tokenForm');
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const v = document.getElementById('token').value.trim();
    if(v === SECRET_TOKEN) unlock();
    else alert('Codice errato');
  });

  initARInteractions();
  initDebugPanel();
});

const bgMusic = document.getElementById('bgMusic');

function initARInteractions() {
  const qr = document.getElementById('qrCode');
  const video = document.getElementById('demoVideo');
  const replayLogo = document.getElementById('replayLogo');
  const whatsappLogo = document.getElementById('whatsappLogo');

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
        bgMusic.pause();
        if(el.id === 'Radio') new Audio('radio.mp3').play();
        else if(el.id === 'Fantacalcio') new Audio('fantacalcio.mp3').play();
        else if(el.id === 'Dj') new Audio('dj.mp3').play();
        else if(el.id === 'Tromba') window.open('https://youtu.be/AMK10N6wwHM','_blank');
        else if(el.id === 'Ballerino') window.open('https://youtu.be/JS_BY3LRBqw','_blank');
        else window.open('https://instagram.com','_blank');
        setTimeout(()=> bgMusic.play(), 5000);
      });
    }
  });
}

// -------------------- DEBUG PANEL --------------------
function initDebugPanel() {
  const slidersDiv = document.getElementById('sliders');
  const elements = document.querySelectorAll('a-image.clickable');
  elements.forEach(el=>{
    const container = document.createElement('div');
    container.innerHTML = `<strong>${el.id}</strong><br>
      X:<input type="range" min="-5" max="5" step="0.1" value="${el.getAttribute('position').x}" data-prop="x"><br>
      Y:<input type="range" min="0" max="5" step="0.1" value="${el.getAttribute('position').y}" data-prop="y"><br>
      Z:<input type="range" min="-5" max="5" step="0.1" value="${el.getAttribute('position').z}" data-prop="z"><br>
      RotY:<input type="range" min="0" max="360" step="1" value="${el.getAttribute('rotation').y}" data-prop="yrot"><br><br>`;
    slidersDiv.appendChild(container);

    container.querySelectorAll('input').forEach(input=>{
      input.addEventListener('input', e=>{
        const val = parseFloat(input.value);
        const prop = input.dataset.prop;
        const pos = el.getAttribute('position');
        const rot = el.getAttribute('rotation');
        if(prop==='x') pos.x=val;
        if(prop==='y') pos.y=val;
        if(prop==='z') pos.z=val;
        if(prop==='yrot') rot.y=val;
        el.setAttribute('position', pos);
        el.setAttribute('rotation', rot);
      });
    });
  });

  document.getElementById('closeDebug').addEventListener('click', ()=>{
    document.getElementById('debugPanel').style.display = 'none';
  });
}