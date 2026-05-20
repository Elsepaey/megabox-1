export const UploadConfig = {
    enableChunkedUpload: true,

    maxChunkRetries: 5,
    maxApiRetries: 5,
    baseBackoffDelayMs: 500,

    enableTusVideoUpload: true,

    tusSmallFileChunkSize: 5 * 1024 * 1024,
    tusLargeFileChunkSize: 10 * 1024 * 1024,
    tusLargeFileThreshold: 20 * 1024 * 1024,

    tusMaxRetries: 5,
    tusRetryDelayMs: 1000,
};

export function pickTusChunkSize(fileSize) {
    return fileSize < UploadConfig.tusLargeFileThreshold
        ? UploadConfig.tusSmallFileChunkSize
        : UploadConfig.tusLargeFileChunkSize;
}

export async function backoffSleep(retryIndex, baseMs = UploadConfig.baseBackoffDelayMs) {
    const base = baseMs * (1 << retryIndex);
    const jitter = Math.floor(Math.random() * (base / 2));
    await new Promise((r) => setTimeout(r, base + jitter));
}
