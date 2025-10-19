const qrCode = document.getElementById('qr-code');
const video = document.getElementById('video-ar');
const icons = document.getElementById('icon-container');
const reloadIcon = document.getElementById('reload-icon');

qrCode.addEventListener('click', () => {
    qrCode.style.display = 'none';
    video.style.display = 'block';
    video.play();
});

video.addEventListener('ended', () => {
    icons.style.display = 'flex';
});

reloadIcon.addEventListener('click', () => {
    // Ripristina tutto
    video.pause();
    video.currentTime = 0;
    video.style.display = 'none';
    icons.style.display = 'none';
    qrCode.style.display = 'block';
});