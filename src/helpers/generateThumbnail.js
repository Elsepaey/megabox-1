const TARGET_SIZE = 300;
const QUALITY = 0.2;

function isImageFile(file) {
    const t = file.type || '';
    return t.startsWith('image/') && (t.includes('jpeg') || t.includes('png') || t.includes('jpg'));
}

function isVideoFile(file) {
    return (file.type || '').startsWith('video/');
}

function drawToBlob(source, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, width, height);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
}

async function thumbnailFromImage(file) {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = url;
        });
        return await drawToBlob(img, TARGET_SIZE, TARGET_SIZE);
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function thumbnailFromVideo(file) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    try {
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
        });
        const seekTo = Math.min(1, Math.max(0, (video.duration || 1) - 0.1));
        await new Promise((resolve, reject) => {
            video.onseeked = resolve;
            video.onerror = reject;
            video.currentTime = seekTo;
        });
        return await drawToBlob(video, TARGET_SIZE, TARGET_SIZE);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export async function generateThumbnail(file) {
    try {
        if (isImageFile(file)) return await thumbnailFromImage(file);
        if (isVideoFile(file)) return await thumbnailFromVideo(file);
    } catch (e) {
        console.warn('Thumbnail generation failed', e);
    }
    return null;
}
