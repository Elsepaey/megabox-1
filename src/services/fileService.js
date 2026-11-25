import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { api } from './apiConfig';
import { uploadFile as orchestratorUpload, pauseUpload as orchestratorPause, cancelUpload as orchestratorCancel } from './uploadOrchestrator';

export const fileService = {
    /**
     * Upload via the unified backend init endpoint. Routes to TUS (Bunny) for
     * videos and presigned R2 multipart for everything else.
     *
     * @param {File} file
     * @param {string} token
     * @param {{ folderId?: string, channelId?: string, onProgress?: (sent:number,total:number)=>void }} [opts]
     * @returns {Promise<true | { success:false, error:string }>}
     */
    uploadFile: async (file, token, opts = {}) => {
        const result = await orchestratorUpload(file, token, opts);
        if (!result.success) {
            const message = result.error || 'Upload failed';
            toast.error(message, ToastOptions('error'));
            return result;
        }
        return true;
    },

    /**
     * Pause an in-progress upload
     * @param {string} fileId - The file ID to pause
     * @param {{ isVideo: boolean }} opts - Upload type options
     */
    pauseUpload: (fileId, { isVideo }) => {
        return orchestratorPause(fileId, { isVideo });
    },

    /**
     * Cancel an in-progress upload and clean up
     * @param {string} fileId - The file ID to cancel
     * @param {{ isVideo: boolean }} opts - Upload type options
     */
    cancelUpload: async (fileId, { isVideo }) => {
        return orchestratorCancel(fileId, { isVideo });
    },

    deleteFile: async (id, token) => {
        try {
            await api.delete(`/files/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    deletFile: async (id, token) => {
        return fileService.deleteFile(id, token);
    },

    changeFileName: async (id, token, newFileName) => {
        try {
            await api.patch(`/files/${id}`, {
                fileName: newFileName
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    updateZipName: async (zipId, fileName, token) => {
        return fileService.changeFileName(zipId, token, fileName);
    },

    generateShareLink: async (fileId, token, sourceType = 'normal') => {
        try {
            const { data } = await api.post('/shares', {
                sourceType,
                items: [{ itemId: fileId, itemType: 'file' }]
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const shareUrl = data?.branchUrl || data?.shareUrl || data?.shareLink || '';
            if (data?.message || shareUrl) {
                toast.success(data?.message || "Share link generated successfully", ToastOptions("success"));
            }
            return { ...data, shareUrl, shareLink: shareUrl };
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate share link", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    saveFile: async (fileId, token, opts = {}) => {
        try {
            const body = {
                itemId: fileId,
                itemType: opts.itemType || 'file',
            };
            if (opts.shareId) body.shareId = opts.shareId;
            if (opts.locationFolderId) body.locationFolderId = opts.locationFolderId;

            const { data } = await api.post('/saves', body, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success(data?.message || "File saved successfully!", ToastOptions("success"));
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save file", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    archiveFile: async (fileId, token) => {
        try {
            const { data } = await api.post('/archives', {
                items: [{ type: 'file', id: fileId }]
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to archive file", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    unarchiveFile: async (fileId, token) => {
        try {
            const { data } = await api.delete(`/archives/file/${fileId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to unarchive file";
            toast.error(errorMessage, ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    createArchive: async (files, folders, token) => {
        try {
            const items = [
                ...(files || []).map(id => ({ type: 'file', id })),
                ...(folders || []).map(id => ({ type: 'folder', id })),
            ];
            const { data } = await api.post('/archives', { items }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create archive", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    getMyArchives: async (token, { limit = 50 } = {}) => {
        try {
            const allFiles = [];
            const allFolders = [];
            let page = 1;
            let totalPages = 1;

            do {
                const { data } = await api.get('/archives', {
                    params: { page, limit },
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const pageFiles = Array.isArray(data?.data?.files) ? data.data.files : [];
                const pageFolders = Array.isArray(data?.data?.folders) ? data.data.folders : [];

                pageFiles.forEach((file) => {
                    allFiles.push({
                        ...file,
                        id: file._id || file.id,
                        _id: file._id || file.id,
                        isFolder: false,
                        itemType: 'file',
                        archived: true,
                        isArchived: true,
                    });
                });

                pageFolders.forEach((folder) => {
                    allFolders.push({
                        ...folder,
                        id: folder._id || folder.id,
                        _id: folder._id || folder.id,
                        fileName: folder.name || folder.fileName || '',
                        name: folder.name || folder.fileName || '',
                        isFolder: true,
                        itemType: 'folder',
                        archived: true,
                        isArchived: true,
                    });
                });

                totalPages = data?.meta?.totalPages ?? 1;
                page += 1;
            } while (page <= totalPages);

            return { files: allFiles, folders: allFolders };
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    previewZip: async (fileId, token) => {
        try {
            const { data } = await api.get(`/zips/${fileId}/preview`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    extractZip: async (fileId, token, opts = {}) => {
        try {
            const body = {};
            if (opts.targetFolderId) body.targetFolderId = opts.targetFolderId;
            if (opts.sourceType) body.sourceType = opts.sourceType;
            const { data } = await api.post(`/zips/${fileId}/extract`, body, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to extract zip", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    getSharedFilesByUser: async (token, { page = 1, limit = 50 } = {}) => {
        try {
            const { data } = await api.get('/shares/my-shares', {
                params: { page, limit },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getShareItems: async (shareId, token, { page = 1, limit = 50, folderId, type } = {}) => {
        try {
            const params = { page, limit };
            if (folderId) params.folderId = folderId;
            if (type) params.type = type;
            const { data } = await api.get(`/shares/${shareId}/items`, {
                params,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getUserStorageUsage: async (token) => {
        try {
            const { data } = await api.get('/storage/usage', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    createZip: async ({ items, fileName, folderId } = {}, token) => {
        try {
            const body = { items };
            if (fileName && String(fileName).trim()) {
                body.fileName = String(fileName).trim();
            }
            if (folderId) {
                body.folderId = folderId;
            }
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const { data } = await api.post('/zips', body, config);
            return data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    copyFiles: async ({ fileIds, targetFolderId, channelId } = {}, token) => {
        try {
            const body = { fileIds };
            if (targetFolderId != null && targetFolderId !== '') {
                body.targetFolderId = targetFolderId;
            }
            if (channelId != null && channelId !== '') {
                body.channelId = channelId;
            }
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const { data } = await api.post('/files/copy', body, config);
            return data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    disableItemShare: async (itemType, itemId, token) => {
        try {
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const { data } = await api.delete(`/shares/by-item/${itemType}/${itemId}`, config);
            return data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default fileService;

