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

startBtn.addEventListener('click', async ()=>{
  try{await bgMusic.play();}catch(e){}
  startOverlay.style.display='none';
  try{await startCameraWithRetries();}catch(e){alert('Impossibile avviare la fotocamera.');return;}
  
  // QR + demo video positions
  const CENTER_Y = 1.45, QR_Z = -5.8;
  qr.setAttribute('position',`0 ${CENTER_Y} ${QR_Z}`);
  qr.setAttribute('scale','1.3 1.3 1');
  demoVideo.setAttribute('position',`0 ${CENTER_Y} ${QR_Z}`);
  replayLogo.setAttribute('position',`-0.9 ${CENTER_Y} ${QR_Z}`);
  whatsappLogo.setAttribute('position',`0.9 ${CENTER_Y} ${QR_Z}`);
  replayLogo.setAttribute('visible','false'); whatsappLogo.setAttribute('visible','false');
  replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

  distributeItemsLeftRightBack(Math.min(Math.abs(QR_Z)-1.0,3.5));
  createParticles(36); createSmoke(25); pulseRoof();
  setupInteractions(); animateLight();
});

// CAMERA
async function startCameraWithRetries(){
  cameraStreamEl.setAttribute('playsinline','');
  cameraStreamEl.setAttribute('webkit-playsinline','');
  cameraStreamEl.setAttribute('autoplay','');
  cameraStreamEl.setAttribute('muted','');
  cameraStreamEl.setAttribute('crossorigin','anonymous');
  cameraStreamEl.style.objectFit='cover';
  const attempts=[{video:{facingMode:{ideal:'environment'}},audio:false},{video:{facingMode:'environment'},audio:false},{video:true,audio:false}];
  let lastErr=null,stream=null;
  for(const c of attempts){try{stream=await navigator.mediaDevices.getUserMedia(c);if(stream)break}catch(e){lastErr=e;await wait(180);}}
  if(!stream)throw lastErr||new Error('Nessuno stream');
  cameraStreamEl.srcObject=stream; cameraStreamEl.muted=true; cameraStreamEl.playsInline=true;
  try{await cameraStreamEl.play();}catch(e){}
  await new Promise(r=>{let done=false; function onPlay(){if(done)return;done=true;cameraStreamEl.removeEventListener('playing',onPlay);r();} cameraStreamEl.addEventListener('playing',onPlay); setTimeout(()=>{if(!done){done=true;cameraStreamEl.removeEventListener('playing',onPlay);r();}},1800);});
  const sky=document.getElementById('cameraSky');
  sky.setAttribute('material','shader: flat; src: #cameraStream');
  forceSkyTextureUpdate(sky,2000,60);
}
function forceSkyTextureUpdate(skyEl,duration=2000,interval=60){
  const start=Date.now();
  const tid=setInterval(()=>{try{const m=skyEl.getObject3D('mesh');if(m&&m.material&&m.material.map){m.material.map.needsUpdate=true;m.material.needsUpdate=true;}}catch(e){} if(Date.now()-start>duration)clearInterval(tid);},interval);
}

// ITEM POSITIONING
function distributeItemsLeftRightBack(radius=3.1){
  const sectors=[{from:Math.PI/6,to:5*Math.PI/6},{from:5*Math.PI/6,to:7*Math.PI/6},{from:7*Math.PI/6,to:11*Math.PI/6}];
  let idx=0;
  for(const id of itemIds){
    const el=document.getElementById(id); if(!el) continue;
    const sector=sectors[idx%sectors.length];
    const slot=Math.floor(idx/sectors.length);
    const denom=Math.max(1,Math.ceil(itemIds.length/sectors.length));
    const frac=(slot+Math.random()*0.6)/denom;
    const az=sector.from+frac*(sector.to-sector.from)+(Math.random()*0.12-0.06);
    const elevOptions=[-0.12,0.02,0.14]; const elev=elevOptions[idx%elevOptions.length];
    const x=radius*Math.cos(elev)*Math.sin(az);
    const y=radius*Math.sin(elev)+1.35;
    const z=radius*Math.cos(elev)*Math.cos(az);
    el.setAttribute('position',`${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
    el.setAttribute('scale','0.95 0.95 0.95'); el.setAttribute('look-at','#camera'); el.classList.add('clickable');
    el.setAttribute('animation',`property: rotation; to: 0 360 0; dur: 12000; loop: true; easing: linear`);
    idx++;
  }
}

// PARTICLES + SMOKE + ROOF
function createParticles(count=32){const root=document.getElementById('particles');while(root.firstChild)root.removeChild(root.firstChild);for(let i=0;i<count;i++){const s=document.createElement('a-sphere');const px=(Math.random()*2-1)*3,py=Math.random()*2+0.6,pz=(Math.random()*2-1)*3;s.setAttribute('position',`${px} ${py} ${pz}`);s.setAttribute('radius',(0.03+Math.random()*0.04).toFixed(3));s.setAttribute('color','#ff2b2b');const tx=px+(Math.random()*0.6-0.3),ty=py+(Math.random()*0.6-0.3),tz=pz+(Math.random()*0.6-0.3),dur=1600+Math.random()*2600;s.setAttribute('animation',`property: position; to: ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}; dur: ${dur}; dir: alternate; loop: true; easing: easeInOutSine`);root.appendChild(s);}}
function createSmoke(count=25){const root=document.getElementById('particles');for(let i=0;i<count;i++){const s=document.createElement('a-sphere');const x=(Math.random()*4-2),y=0.5+Math.random()*0.5,z=(Math.random()*4-2);s.setAttribute('position',`${x} ${y} ${z}`);s.setAttribute('radius',(0.05+Math.random()*0.08).toFixed(2));s.setAttribute('color','#ff5555');s.setAttribute('opacity',0.25+Math.random()*0.25);s.setAttribute('animation',`property: position; to: ${x} ${y+2} ${z}; dur: 8000; dir: alternate; loop: true; easing: easeOutSine`);root.appendChild(s);}}
function pulseRoof(){const roof=document.createElement('a-box');roof.setAttribute('position','0 4 0');roof.setAttribute('depth','6');roof.setAttribute('width','6');roof.setAttribute('height','0.1');roof.setAttribute('color','#ff1111');roof.setAttribute('animation','property: position; to: 0 4.2 0; dur:1500; dir:alternate; loop:true; easing:easeInOutSine');document.querySelector('a-scene').appendChild(roof);}

// LIGHT ANIMATION
function animateLight(){const l=document.getElementById('pulseLight');l.setAttribute('animation','property: light.intensity; from:0.3; to:0.8; dur:2000; dir:alternate; loop:true; easing:easeInOutSine');}

// INTERACTIONS
function setupInteractions(){
  preserveVideoAspect();
  replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');

  qr.addEventListener('click',async ()=>{
    qr.setAttribute('visible','false'); demoVideo.setAttribute('visible','true');
    try{await holoVideo.play(); try{bgSavedTime=bgMusic.currentTime; bgMusic.pause();}catch(e){} }catch(e){videoTapOverlay.style.display='flex';}
  });

  tapToPlay && tapToPlay.addEventListener('click',async ()=>{
    videoTapOverlay.style.display='none';
    try{await holoVideo.play(); try{bgSavedTime=bgMusic.currentTime; bgMusic.pause();}catch(e){} }catch(e){alert('Impossibile avviare il video');}
  });

  holoVideo.addEventListener('ended',()=>{
    demoVideo.setAttribute('visible','false'); replayLogo.setAttribute('visible','true'); whatsappLogo.setAttribute('visible','true');
    replayLogo.classList.add('clickable'); whatsappLogo.classList.add('clickable');
    try{bgMusic.currentTime=bgSavedTime||0; bgMusic.play();}catch(e){}
  });

  replayLogo.addEventListener('click',async ()=>{
    if(replayLogo.getAttribute('visible')!=='true')return;
    replayLogo.setAttribute('visible','false'); whatsappLogo.setAttribute('visible','false');
    replayLogo.classList.remove('clickable'); whatsappLogo.classList.remove('clickable');
    demoVideo.setAttribute('visible','true'); try{await holoVideo.play(); bgSavedTime=bgMusic.currentTime; bgMusic.pause();}catch(e){videoTapOverlay.style.display='flex';}
  });

  whatsappLogo.addEventListener('click',()=>{if(whatsappLogo.getAttribute('visible')!=='true')return; window.open('https://wa.me/1234567890','_blank');});

  const audioMap={'Radio':'radio.mp3','Fantacalcio':'fantacalcio.mp3','Dj':'dj.mp3'};
  const linkMap={'DonBosco':'https://www.instagram.com/giovani_animatori_trecastagni/',
                 'EtnaEnsemble':'https://www.instagram.com/etnaensemble/',
                 'Catania':'https://www.instagram.com/officialcataniafc/',
                 'Eduverse':'https://www.instagram.com/eduverse___/'};

  itemIds.forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('click',()=>{
      if(audioMap[id]){try{bgSavedTime=bgMusic.currentTime; bgMusic.pause();}catch(e){} const a=new Audio(audioMap[id]); a.play(); a.onended=()=>{try{bgMusic.currentTime=bgSavedTime||0; bgMusic.play();}catch(e){}}; return;}
      if(id==='Tromba'){window.open('https://youtu.be/AMK10N6wwHM','_blank'); return;}
      if(id==='Ballerino'){window.open('https://youtu.be/JS_BY3LRBqw','_blank'); return;}
      if(linkMap[id]){window.open(linkMap[id],'_blank'); return;}
      window.open('https://instagram.com','_blank');
    });
  });
}

// VIDEO ASPECT
function preserveVideoAspect(){
  const src=holoVideo.querySelector('source')?holoVideo.querySelector('source').src:holoVideo.src;
  if(!src) return;
  const probe=document.createElement('video'); probe.preload='metadata'; probe.src=src; probe.muted=true; probe.playsInline=true;
  probe.addEventListener('loadedmetadata',()=>{
    const w=probe.videoWidth,h=probe.videoHeight;
    if(w&&h){const aspect=w/h,baseH=1.0; const sx=baseH*aspect,sy=baseH; demoVideo.setAttribute('scale',`${sx} ${sy} 1`);}
  });
  probe.load();
}