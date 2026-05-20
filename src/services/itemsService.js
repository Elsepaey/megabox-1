import { api } from './apiConfig';

const FILE_TYPE_FILTERS = {
    all: undefined,
    image: 'images',
    images: 'images',
    video: 'videos',
    videos: 'videos',
    document: 'documents',
    documents: 'documents',
    zip: 'zip',
    folder: 'folders',
    folders: 'folders',
};

function authHeaders(token) {
    return { headers: { Authorization: `Bearer ${token}` } };
}

function normalizeUnifiedItem(item) {
    return {
        ...item,
        id: item._id || item.id,
        _id: item._id || item.id,
        fileName: item.fileName || item.name || '',
        name: item.name || item.fileName || '',
        isFolder: item.itemType === 'folder',
    };
}

/**
 * Fetch items (files + folders) from the unified endpoint with pagination.
 *
 * @param {string} token
 * @param {object} opts
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=20]
 * @param {string} [opts.type] one of all|image|video|document|zip|folder
 * @param {string} [opts.folderId]
 * @returns {Promise<{ items: any[], meta: any, raw: any }>}
 */
export async function getItems(token, { page = 1, limit = 20, type, folderId } = {}) {
    const params = { page, limit };
    const apiType = type ? FILE_TYPE_FILTERS[type.toLowerCase()] : undefined;
    if (apiType) params.type = apiType;
    if (folderId) params.folderId = folderId;

    const { data } = await api.get('/files/items', {
        ...authHeaders(token),
        params,
    });

    const rawItems = Array.isArray(data?.data) ? data.data : [];
    return {
        items: rawItems.map(normalizeUnifiedItem),
        meta: data?.meta || null,
        raw: data,
    };
}

export async function getRecentFiles(token, { page = 1, limit = 20 } = {}) {
    const { data } = await api.get('/recent/files', {
        ...authHeaders(token),
        params: { page, limit },
    });
    return {
        items: Array.isArray(data?.data) ? data.data : [],
        meta: data?.meta || null,
        raw: data,
    };
}

export async function getFileDetails(token, fileId) {
    const { data } = await api.get(`/files/${fileId}`, authHeaders(token));
    return data;
}

export async function getVideoStatus(token, fileId) {
    try {
        const { data } = await api.get(`/files/${fileId}/status`, authHeaders(token));
        return data;
    } catch (err) {
        if (err?.response?.status === 404) {
            // Fallback to file details — server may infer readiness from accessUrl.
            const data = await getFileDetails(token, fileId);
            return {
                _id: data?._id || fileId,
                streamUid: data?.streamUid,
                readyToStream: data?.readyToStream ?? Boolean(data?.accessUrl),
                status: data?.status || (data?.readyToStream ? { state: 'ready' } : null),
                playback: { hls: data?.accessUrl },
            };
        }
        throw err;
    }
}

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_MS = 10 * 60 * 1000;

/**
 * Poll video processing status until ready or error. Returns a stop() function.
 */
export function pollVideoStatus(token, fileId, onUpdate) {
    let stopped = false;
    const startedAt = Date.now();

    const tick = async () => {
        if (stopped) return;
        try {
            const status = await getVideoStatus(token, fileId);
            if (stopped) return;
            onUpdate?.(status);
            const state = status?.status?.state || (status?.readyToStream ? 'ready' : null);
            if (status?.readyToStream || state === 'ready' || state === 'error') {
                stop();
                return;
            }
        } catch (err) {
            console.warn('pollVideoStatus error', err);
        }
        if (Date.now() - startedAt >= POLL_MAX_MS) {
            stop();
            return;
        }
        if (!stopped) setTimeout(tick, POLL_INTERVAL_MS);
    };

    function stop() {
        stopped = true;
    }

    tick();
    return stop;
}

/**
 * Fetches all items (files + folders mixed) from the unified endpoint.
 * Pulls all pages and returns them in chronological order as a single array.
 *
 * @param {string} token
 * @param {object} opts
 * @param {string} [opts.type] Filter by type: all|image|video|document|zip|folder
 * @param {string} [opts.folderId] Get contents of a specific folder
 * @param {number} [opts.limit=50] Items per page
 * @returns {Promise<any[]>} Mixed array of files and folders
 */
export async function getAllUnifiedItems(token, { type, folderId, limit = 50 } = {}) {
    const allItems = [];
    let page = 1;
    let totalPages = 1;

    do {
        const { items, meta } = await getItems(token, { page, limit, type, folderId });
        allItems.push(...items);
        totalPages = meta?.totalPages ?? 1;
        page += 1;
    } while (page <= totalPages);

    return allItems;
}

/**
 * Adapter that returns the legacy `{ files: [...] }` shape that older
 * components expect. Pulls all pages for the requested type.
 *
 * @deprecated Use getAllUnifiedItems() instead for new code
 */
export async function getAllItemsLegacyShape(token, { type, folderId, limit = 50 } = {}) {
    const files = [];
    const folders = [];
    let page = 1;
    let totalPages = 1;

    do {
        const { items, meta } = await getItems(token, { page, limit, type, folderId });
        for (const item of items) {
            if (item.isFolder) folders.push(item);
            else files.push(item);
        }
        totalPages = meta?.totalPages ?? 1;
        page += 1;
    } while (page <= totalPages);

    return { files, folders };
}

export const itemsService = {
    getItems,
    getRecentFiles,
    getFileDetails,
    getVideoStatus,
    pollVideoStatus,
    getAllUnifiedItems,
    getAllItemsLegacyShape,
};
