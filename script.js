const startBtn = document.getElementById('startBtn');
const loadingScreen = document.getElementById('loading-screen');
const arContainer = document.getElementById('ar-container');
const camera = document.getElementById('camera');
const qrCode = document.getElementById('qr-code');
const videoAR = document.getElementById('videoAR');
const musica = document.getElementById('musica');
const whatsappIcon = document.getElementById('whatsapp-icon');
const replayIcon = document.getElementById('replay-icon');
const particlesCanvas = document.getElementById('particles');
const ctx = particlesCanvas.getContext('2d');

// Avvio AR
startBtn.addEventListener('click', () => {
    loadingScreen.style.display='none';
    arContainer.style.display='block';
    initCamera();
    initParticles();
});

// Fotocamera posteriore
function initCamera() {
    navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:"environment"}}, audio:false})
    .then(stream => camera.srcObject = stream)
    .catch(err => alert("Errore fotocamera principale: "+err));
}

// Click QR → video
qrCode.addEventListener('click', () => {
    qrCode.style.display='none';
    videoAR.style.display='block';
    videoAR.volume = 1;
    musica.volume = 0.2;
    videoAR.play();
});

// Fine video → volume normale e icone
videoAR.addEventListener('ended', () => {
    musica.volume = 1;
    whatsappIcon.style.display='block';
    replayIcon.style.display='block';
});

// Replay
replayIcon.addEventListener('click', () => {
    videoAR.pause();
    videoAR.currentTime=0;
    videoAR.style.display='block';
    whatsappIcon.style.display='none';
    replayIcon.style.display='none';
    videoAR.play();
    musica.volume=0.2;
});

// WhatsApp
whatsappIcon.addEventListener('click', () => window.open('https://wa.me/tuonumero','_blank'));

// Video fluttuante
let floatAngle=0;
function floatVideo(){
    if(videoAR.style.display==='block'){
        floatAngle+=0.01;
        const y=Math.sin(floatAngle)*5;
        const rotate=Math.sin(floatAngle/2)*2;
        videoAR.style.transform=`translate(-50%,-50%) translateZ(50px) translateY(${y}px) rotateY(${rotate}deg)`;
    }
    requestAnimationFrame(floatVideo);
}
floatVideo();

// Particelle rosse
let particles=[];
function initParticles(){
    particlesCanvas.width=window.innerWidth;
    particlesCanvas.height=window.innerHeight;
    particles = Array.from({length:50}, () => ({
        x:Math.random()*particlesCanvas.width,
        y:Math.random()*particlesCanvas.height,
        radius:Math.random()*2+1,
        dx:(Math.random()-0.5)*0.5,
        dy:(Math.random()-0.5)*0.5
    }));
    animateParticles();
}
function animateParticles(){
    ctx.clearRect(0,0,particlesCanvas.width,particlesCanvas.height);
    ctx.fillStyle='rgba(255,0,0,0.8)';
    particles.forEach(p=>{
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
        ctx.fill();
        p.x+=p.dx;
        p.y+=p.dy;
        if(p.x<0||p.x>particlesCanvas.width) p.dx*=-1;
        if(p.y<0||p.y>particlesCanvas.height) p.dy*=-1;
    });
    requestAnimationFrame(animateParticles);
}