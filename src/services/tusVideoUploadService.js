// Requires `tus-js-client`. Run: npm install tus-js-client
import * as tus from 'tus-js-client';
import { UploadConfig, pickTusChunkSize } from './uploadConfig';

const PENDING_KEY = 'megabox.pendingTusUploads';

const activeUploads = new Map();
const paused = new Map();

function loadPending() {
    try {
        return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    } catch {
        return [];
    }
}

function savePending(list) {
    try {
        localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('Failed to persist pending TUS uploads', e);
    }
}

function upsertPending(entry) {
    const list = loadPending().filter((u) => u.fileId !== entry.fileId);
    list.push({ ...entry, lastUpdatedAt: Date.now() });
    savePending(list);
}

function patchPending(fileId, patch) {
    const list = loadPending();
    const i = list.findIndex((u) => u.fileId === fileId);
    if (i === -1) return;
    list[i] = { ...list[i], ...patch, lastUpdatedAt: Date.now() };
    savePending(list);
}

function removePending(fileId) {
    savePending(loadPending().filter((u) => u.fileId !== fileId));
}

export function getPendingTusUploads() {
    return loadPending();
}

export function isUploadActive(fileId) {
    return activeUploads.has(fileId);
}

export function isUploadPaused(fileId) {
    return paused.get(fileId) === true;
}

function buildHeaders(tusHeaders) {
    return {
        'Tus-Resumable': '1.0.0',
        ...(tusHeaders || {}),
    };
}

function attemptOnce({ file, tusUrl, fileId, tusHeaders, folderId, channelId, onProgress }) {
    return new Promise((resolve) => {
        const chunkSize = pickTusChunkSize(file.size);

        upsertPending({
            fileId,
            fileName: file.name,
            tusUrl,
            totalBytes: file.size,
            uploadedBytes: 0,
            folderId: folderId ?? null,
            channelId: channelId ?? null,
            tusHeaders: tusHeaders ?? null,
        });

        const upload = new tus.Upload(file, {
            uploadUrl: tusUrl,
            endpoint: tusUrl,
            chunkSize,
            retryDelays: [0, 1000, 3000, 5000, 10000],
            headers: buildHeaders(tusHeaders),
            metadata: {
                filename: file.name,
                filetype: file.type || 'application/octet-stream',
            },
            onProgress: (bytesUploaded, bytesTotal) => {
                if (paused.get(fileId)) return;
                if (onProgress) onProgress(bytesUploaded, bytesTotal || file.size);
                patchPending(fileId, { uploadedBytes: bytesUploaded });
            },
            onSuccess: () => {
                if (onProgress) onProgress(file.size, file.size);
                activeUploads.delete(fileId);
                paused.delete(fileId);
                removePending(fileId);
                resolve({ success: true, fileId });
            },
            onError: (error) => {
                activeUploads.delete(fileId);
                if (paused.get(fileId)) {
                    resolve({ success: false, error: 'Upload paused', fileId });
                    return;
                }
                resolve({
                    success: false,
                    error: error?.message || 'TUS upload failed',
                    fileId,
                });
            },
        });

        activeUploads.set(fileId, upload);
        paused.set(fileId, false);
        upload.start();
    });
}

export async function uploadVideo({
    file,
    tusUrl,
    fileId,
    tusHeaders,
    folderId,
    channelId,
    onProgress,
}) {
    let attempt = 0;
    while (attempt <= UploadConfig.tusMaxRetries) {
        const result = await attemptOnce({
            file,
            tusUrl,
            fileId,
            tusHeaders,
            folderId,
            channelId,
            onProgress,
        });

        if (result.success) return result;
        if (result.error === 'Upload paused') return result;

        const retryable =
            /timeout|network|connection|429|408|503|status code/i.test(result.error || '');
        if (!retryable || attempt >= UploadConfig.tusMaxRetries) return result;

        attempt += 1;
        const base = UploadConfig.tusRetryDelayMs * (1 << (attempt - 1));
        const jitter = Math.floor(Math.random() * (base / 2));
        await new Promise((r) => setTimeout(r, base + jitter));
    }
    return { success: false, error: 'Max retries exceeded', fileId };
}

export function pauseVideoUpload(fileId) {
    const upload = activeUploads.get(fileId);
    if (!upload) return false;
    paused.set(fileId, true);
    try {
        upload.abort(false); // false → keep server state for resume
    } catch (e) {
        console.warn('TUS pause failed', e);
        paused.set(fileId, false);
        return false;
    }
    return true;
}

export async function cancelVideoUpload(fileId) {
    const upload = activeUploads.get(fileId);
    if (upload) {
        try {
            await upload.abort(true);
        } catch (_) {
            /* ignore */
        }
    }
    activeUploads.delete(fileId);
    paused.delete(fileId);
    removePending(fileId);
}

export async function resumeVideoUpload({ file, fileId, onProgress }) {
    const pending = loadPending().find((u) => u.fileId === fileId);
    if (!pending) {
        return { success: false, error: 'No pending upload to resume', fileId };
    }
    if (file.size !== pending.totalBytes) {
        removePending(fileId);
        return { success: false, error: 'File has been modified', fileId };
    }
    return uploadVideo({
        file,
        fileId,
        tusUrl: pending.tusUrl,
        tusHeaders: pending.tusHeaders,
        folderId: pending.folderId,
        channelId: pending.channelId,
        onProgress,
    });
}
