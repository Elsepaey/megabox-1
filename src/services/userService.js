import { api } from './apiConfig';
import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { fileService } from './fileService';

export const userService = {
    getUserInfo: async (token) => {
        try {
            const response = await api.get('/users/profile', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateUsername: async (newUsername, token) => {
        try {
            const response = await api.patch('/users/profile',
                { username: newUsername },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateProfileImage: async (imageFile, token) => {
        try {
            const formData = new FormData();
            formData.append('file', imageFile);
            const response = await api.patch('/users/profile/image',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getSharedFoldersWithFiles: async (token, { page = 1, limit = 50 } = {}) => {
        try {
            const response = await api.get('/shares/my-shares', {
                params: { page, limit },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    archiveFolder: async (folderId, token) => {
        try {
            return await fileService.createArchive([], [folderId], token);
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    unarchiveFolder: async (folderId, token) => {
        try {
            const response = await api.delete(`/archives/folder/${folderId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    createFolder: async (name, parentFolder, token, channelId) => {
        try {
            const body = { name };
            if (parentFolder) body.parentFolderId = parentFolder;
            if (channelId) body.channelId = channelId;
            const response = await api.post('/folders', body, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteFolder: async (folderId, token) => {
        try {
            const response = await api.delete(`/folders/${folderId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateFolderName: async (folderId, name, token) => {
        try {
            const response = await api.patch(`/folders/${folderId}`, {
                name
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    generateFolderShareLink: async (folderId, token, sourceType = 'normal') => {
        try {
            const response = await api.post('/shares', {
                sourceType,
                items: [{ itemId: folderId, itemType: 'folder' }]
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const shareUrl = response.data?.branchUrl || response.data?.shareUrl || response.data?.shareLink || '';
            if (response.data?.message || shareUrl) {
                toast.success(response.data?.message || "Folder share link generated successfully", ToastOptions("success"));
            }
            return { ...response.data, shareUrl, shareLink: shareUrl };
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate folder share link", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    disableFolderShare: async (shareId, token) => {
        try {
            const { data } = await api.delete(`/shares/${shareId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success(data?.message || "Share disabled successfully", ToastOptions("success"));
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to disable share", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    generateMultiShareLink: async (folderIds, fileIds, token, sourceType = 'normal') => {
        try {
            const items = [
                ...(folderIds || []).map(id => ({ itemId: id, itemType: 'folder' })),
                ...(fileIds || []).map(id => ({ itemId: id, itemType: 'file' })),
            ];
            const response = await api.post('/shares', {
                sourceType,
                items
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const shareUrl = response.data?.branchUrl || response.data?.shareUrl || response.data?.shareLink || '';
            return { ...response.data, shareUrl, shareLink: shareUrl };
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    requestAccountDeletion: async (_data, token) => {
        try {
            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await api.patch('/users/close-account', {}, {
                headers
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getReferralStats: async ({ page = 1, limit = 20 } = {}, token) => {
        try {
            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await api.get('/users/referrals', {
                params: { page, limit },
                headers
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteProfileImage: async (token) => {
        try {
            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await api.delete('/users/profile/image', {
                headers
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

};

export default userService;

