import axios from 'axios';
import { api } from './apiConfig';
import { UploadConfig, backoffSleep } from './uploadConfig';

const PENDING_KEY = 'megabox.pendingChunkedUploads';

const presignedClient = axios.create({
    timeout: 120000,
    headers: { 'Content-Type': 'application/octet-stream' },
});

const cancelled = new Map();
const paused = new Map();
const activeControllers = new Map();

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
        console.warn('Failed to persist pending uploads', e);
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

async function withRetry(fn, label, max = UploadConfig.maxApiRetries) {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (err) {
            const status = err?.response?.status;
            if (status && status >= 400 && status < 500) {
                throw err;
            }
            if (attempt >= max) {
                console.error(`${label} failed after ${max} retries`, err);
                throw err;
            }
            await backoffSleep(attempt);
            attempt += 1;
        }
    }
}

export async function initializeUpload({ file, folderId, channelId, thumbnail, token }) {
    const formData = new FormData();
    formData.append('fileName', file.name);
    formData.append('fileSize', String(file.size));
    formData.append('fileType', file.type || 'application/octet-stream');
    if (folderId) formData.append('folderId', folderId);
    if (channelId) formData.append('channelId', channelId);
    if (thumbnail) {
        formData.append('thumbnail', thumbnail, 'thumbnail.jpg');
    }

    const { data } = await withRetry(
        () =>
            api.post('/files/upload/init', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
                timeout: 30000,
            }),
        'initializeUpload',
    );
    return data;
}

async function uploadChunkToPresignedUrl({ presignedUrl, blob, onProgress, fileId }) {
    const controller = new AbortController();
    activeControllers.set(fileId, controller);

    const response = await presignedClient.put(presignedUrl, blob, {
        signal: controller.signal,
        onUploadProgress: (e) => {
            if (onProgress) onProgress(e.loaded, e.total ?? blob.size);
        },
    });

    let etag =
        response.headers?.etag ??
        response.headers?.ETag ??
        response.headers?.get?.('etag') ??
        response.headers?.get?.('ETag');
    if (!etag) {
        throw new Error('Presigned PUT response is missing ETag (check R2 CORS Access-Control-Expose-Headers)');
    }
    return String(etag).replace(/"/g, '');
}

async function uploadChunkWithRetry(args) {
    let attempt = 0;
    while (true) {
        try {
            return await uploadChunkToPresignedUrl(args);
        } catch (err) {
            if (err?.name === 'CanceledError' || err?.name === 'AbortError') throw err;
            if (attempt >= UploadConfig.maxChunkRetries) throw err;
            await backoffSleep(attempt);
            attempt += 1;
        }
    }
}

async function getNextPresignedUrl({ fileId, partNumber, etag, token }) {
    const { data } = await withRetry(
        () =>
            api.post(
                '/files/upload/part',
                { fileId, partNumber, etag },
                { headers: { Authorization: `Bearer ${token}` } },
            ),
        `getNextPresignedUrl part ${partNumber}`,
    );
    return data.presignedUrl;
}

async function completeUpload({ fileId, lastEtag, token }) {
    const { data } = await withRetry(
        () =>
            api.post(
                '/files/upload/complete',
                { fileId, lastEtag },
                { headers: { Authorization: `Bearer ${token}` } },
            ),
        'completeUpload',
    );
    return data;
}

export async function uploadFileChunked({
    file,
    init,
    token,
    folderId,
    channelId,
    onProgress,
    startFromPart = 1,
    initialUploadedBytes = 0,
    completedChunks = [],
}) {
    const fileId = init.fileId;
    cancelled.set(fileId, false);
    paused.set(fileId, false);

    upsertPending({
        fileId,
        uploadId: init.uploadId,
        fileName: file.name,
        totalBytes: file.size,
        uploadedBytes: initialUploadedBytes,
        currentPartNumber: startFromPart,
        totalParts: init.totalParts,
        chunkSize: init.chunkSize,
        completedChunks,
        folderId: folderId ?? null,
        channelId: channelId ?? null,
    });

    let currentUrl = init.presignedUrl;
    let totalUploaded = initialUploadedBytes;
    let lastEtag = completedChunks.length ? completedChunks[completedChunks.length - 1].etag : null;
    const chunks = [...completedChunks];

    try {
        for (let partNumber = startFromPart; partNumber <= init.totalParts; partNumber += 1) {
            if (cancelled.get(fileId)) {
                return { success: false, error: 'Upload cancelled', fileId };
            }
            if (paused.get(fileId)) {
                return { success: false, error: 'Upload paused', fileId };
            }

            const startByte = (partNumber - 1) * init.chunkSize;
            const endByte = partNumber < init.totalParts ? startByte + init.chunkSize : file.size;
            const blob = file.slice(startByte, endByte);

            const partBaseProgress = totalUploaded;
            const etag = await uploadChunkWithRetry({
                presignedUrl: currentUrl,
                blob,
                fileId,
                onProgress: (sent) => {
                    if (onProgress) onProgress(partBaseProgress + sent, file.size);
                },
            });

            lastEtag = etag;
            totalUploaded += blob.size;
            chunks.push({ partNumber, etag, size: blob.size });

            if (onProgress) onProgress(totalUploaded, file.size);

            patchPending(fileId, {
                uploadedBytes: totalUploaded,
                currentPartNumber: partNumber + 1,
                completedChunks: chunks,
            });

            if (partNumber < init.totalParts) {
                currentUrl = await getNextPresignedUrl({
                    fileId,
                    partNumber: partNumber + 1,
                    etag,
                    token,
                });
            }
        }

        if (!lastEtag) throw new Error('No ETag available for completion');

        const data = await completeUpload({ fileId, lastEtag, token });

        removePending(fileId);
        cancelled.delete(fileId);
        paused.delete(fileId);
        activeControllers.delete(fileId);
        return { success: true, data, fileId };
    } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Upload failed';
        return { success: false, error: message, fileId };
    }
}

export function pauseUpload(fileId) {
    paused.set(fileId, true);
    activeControllers.get(fileId)?.abort();
}

export async function cancelUpload(fileId) {
    cancelled.set(fileId, true);
    activeControllers.get(fileId)?.abort();
    removePending(fileId);
}

export function isUploadPaused(fileId) {
    return paused.get(fileId) === true;
}

export function getPendingChunkedUploads() {
    return loadPending();
}

/**
 * Resume requires the original File object — browsers cannot rehydrate it
 * from disk after a reload. Pause/resume only works within the same tab.
 */
export async function resumeUpload({ pending, file, token, onProgress }) {
    if (file.size !== pending.totalBytes) {
        removePending(pending.fileId);
        return { success: false, error: 'File has been modified', fileId: pending.fileId };
    }

    cancelled.set(pending.fileId, false);
    paused.set(pending.fileId, false);

    if (!pending.completedChunks?.length || pending.currentPartNumber <= 1) {
        removePending(pending.fileId);
        return null; // caller should re-init from scratch
    }

    const lastChunk = pending.completedChunks[pending.completedChunks.length - 1];
    const freshUrl = await getNextPresignedUrl({
        fileId: pending.fileId,
        partNumber: pending.currentPartNumber,
        etag: lastChunk.etag,
        token,
    });

    const init = {
        fileId: pending.fileId,
        uploadId: pending.uploadId,
        presignedUrl: freshUrl,
        partNumber: pending.currentPartNumber,
        totalParts: pending.totalParts,
        chunkSize: pending.chunkSize,
        isVideo: false,
    };

    return uploadFileChunked({
        file,
        init,
        token,
        folderId: pending.folderId,
        channelId: pending.channelId,
        onProgress,
        startFromPart: pending.currentPartNumber,
        initialUploadedBytes: pending.uploadedBytes,
        completedChunks: pending.completedChunks,
    });
}
