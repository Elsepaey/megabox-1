import { generateThumbnail } from '../helpers/generateThumbnail';
import {
    initializeUpload,
    uploadFileChunked,
    pauseUpload as pauseChunked,
    cancelUpload as cancelChunked,
} from './chunkedUploadService';
import {
    uploadVideo,
    pauseVideoUpload,
    cancelVideoUpload,
} from './tusVideoUploadService';
import { UploadConfig } from './uploadConfig';

function isVideoFile(file) {
    return (file.type || '').startsWith('video/');
}

/**
 * Upload a File using the unified backend init endpoint.
 *
 * The server decides whether the file is a video. Videos are uploaded to
 * Bunny via TUS, everything else uses presigned R2 multipart uploads.
 *
 * @returns {Promise<{ success: boolean, fileId?: string, data?: any, error?: string, isVideo?: boolean }>}
 */
export async function uploadFile(file, token, options = {}) {
    const { folderId, channelId, onProgress, onVideoDetected, onInit } = options;

    let thumbnail = null;
    try {
        thumbnail = await generateThumbnail(file);
    } catch (e) {
        console.warn('Thumbnail step failed (non-fatal)', e);
    }

    if (onProgress) onProgress(0, file.size);

    let init;
    try {
        init = await initializeUpload({ file, folderId, channelId, thumbnail, token });
    } catch (err) {
        return {
            success: false,
            error: err?.response?.data?.message || err?.message || 'Upload init failed',
        };
    }

    if (onInit) onInit(init);

    if (init.isVideo && init.uploadUrl) {
        if (onVideoDetected) onVideoDetected(true, init.fileId, init.uploadUrl);

        return uploadVideo({
            file,
            tusUrl: init.uploadUrl,
            fileId: init.fileId,
            tusHeaders: init.tusHeaders,
            folderId,
            channelId,
            onProgress,
        }).then((r) => ({ ...r, isVideo: true }));
    }

    if (onVideoDetected) onVideoDetected(false, null, null);

    if (UploadConfig.enableChunkedUpload && !isVideoFile(file)) {
        return uploadFileChunked({
            file,
            init,
            token,
            folderId,
            channelId,
            onProgress,
        }).then((r) => ({ ...r, isVideo: false }));
    }

    return {
        success: false,
        error: 'No upload path available for this file type',
    };
}

export function pauseUpload(fileId, { isVideo }) {
    if (isVideo) return pauseVideoUpload(fileId);
    return pauseChunked(fileId);
}

export async function cancelUpload(fileId, { isVideo }) {
    if (isVideo) return cancelVideoUpload(fileId);
    return cancelChunked(fileId);
}

export const uploadOrchestrator = { uploadFile, pauseUpload, cancelUpload };
