const camera = document.getElementById('camera');
const qrCode = document.getElementById('qr-code');
const videoAR = document.getElementById('videoAR');
const musica = document.getElementById('musica');
const whatsappIcon = document.getElementById('whatsapp-icon');
const replayIcon = document.getElementById('replay-icon');

// Accesso alla fotocamera principale del telefono
navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false })
.then(stream => {
    camera.srcObject = stream;
})
.catch(err => {
    alert("Errore accesso fotocamera principale: " + err);
});

// Musica parte subito con QR code
window.addEventListener('DOMContentLoaded', () => {
    musica.volume = 1;
    musica.play();
});

// Click sul QR code → parte video e abbassa musica
qrCode.addEventListener('click', () => {
    qrCode.style.display = 'none';
    videoAR.style.display = 'block';
    videoAR.volume = 1; // video pieno volume
    musica.volume = 0.2; // abbassa musica
    videoAR.play();
});

// Fine video → volume musica torna normale e compaiono icone
videoAR.addEventListener('ended', () => {
    musica.volume = 1;
    whatsappIcon.style.display = 'block';
    replayIcon.style.display = 'block';
});

// Replay
replayIcon.addEventListener('click', () => {
    videoAR.pause();
    videoAR.currentTime = 0;
    videoAR.style.display = 'block';
    whatsappIcon.style.display = 'none';
    replayIcon.style.display = 'none';
    videoAR.play();
    musica.volume = 0.2;
});

// WhatsApp
whatsappIcon.addEventListener('click', () => {
    window.open('https://whatsapp.com/channel/0029VbCDIZCJUM2SokRjrw2W', '_blank');
});

// Animazione video flottante tipo ologramma
let floatAngle = 0;
function floatVideo() {
    if(videoAR.style.display === 'block') {
        floatAngle += 0.01;
        const y = Math.sin(floatAngle) * 5; // verticale
        const rotate = Math.sin(floatAngle/2) * 2; // rotazione
        videoAR.style.transform = `translateZ(50px) translateY(${y}px) rotateY(${rotate}deg)`;
    }
    requestAnimationFrame(floatVideo);
}
floatVideo();