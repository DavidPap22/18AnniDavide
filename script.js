const qrCode = document.getElementById('qr-code');
const videoAR = document.getElementById('video-ar');
const iconContainer = document.getElementById('icon-container');
const replayIcon = document.getElementById('replay-icon');
const whatsappIcon = document.getElementById('whatsapp-icon');
const webcam = document.getElementById('webcam');

// Accesso alla webcam
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
.then(stream => {
    webcam.srcObject = stream;
})
.catch(err => {
    alert("Errore nell'accesso alla webcam: " + err);
});

// Al click sul QR code parte il video
qrCode.addEventListener('click', () => {
    qrCode.style.display = 'none';
    videoAR.style.display = 'block';
    videoAR.play();
});

// Alla fine del video appaiono le icone
videoAR.addEventListener('ended', () => {
    iconContainer.style.display = 'flex';
});

// Funzione replay
replayIcon.addEventListener('click', () => {
    videoAR.pause();
    videoAR.currentTime = 0;
    videoAR.style.display = 'none';
    iconContainer.style.display = 'none';
    qrCode.style.display = 'block';
});

// WhatsApp aprirà il link
whatsappIcon.addEventListener('click', () => {
    window.open('https://wa.me/tuonumero', '_blank');
});