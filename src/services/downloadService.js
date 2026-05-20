import { api } from './apiConfig';

function authHeaders(token) {
    return { headers: { Authorization: `Bearer ${token}` } };
}

export async function checkDownloadLimit(token) {
    const { data } = await api.get('/downloads/check', authHeaders(token));
    return {
        allowed: data?.allowed ?? false,
        remaining: data?.remaining ?? 0,
        limit: data?.limit ?? 0,
        used: data?.used ?? 0,
    };
}

export async function recordDownload(token, { fileId, fileName, fileType, fileSize, thumbnailUrl }) {
    const { data } = await api.post(
        '/downloads/record',
        { fileId, fileName, fileType, fileSize, thumbnailUrl },
        authHeaders(token),
    );
    return data;
}

export async function checkDownloadPermission(token, fileId) {
    const { data } = await api.post('/files/download', { fileId }, authHeaders(token));
    return data;
}

export const downloadService = {
    checkDownloadLimit,
    recordDownload,
    checkDownloadPermission,
};
