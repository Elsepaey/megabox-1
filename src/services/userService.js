import { api } from './apiConfig';
import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { fileService } from './fileService';

export const userService = {
    getUserInfo: async (token) => {
        try {
            const response = await api.get('/user/Getloginuseraccount', {
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
            const response = await api.patch('/user/updateUsername',
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
            formData.append('image', imageFile);
            const response = await api.patch('/user/updateimage',
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

    deleteProfileImage: async (token) => {
        try {
            const response = await api.delete('/user/deleteimage', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Subscribe to premium
    subscribeToPremium: async (file, token) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.patch('/user/subscribeToPremium', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get shared folders with files
    getSharedFoldersWithFiles: async (token) => {
        try {
            const response = await api.get('/user/getSharedFoldersWithFiles', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Archive folder
    archiveFolder: async (folderId, token) => {
        try {
            // Use the same createArchive endpoint as files
            return await fileService.createArchive([], [folderId], token);
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Unarchive folder - use removeFromArchive endpoint
    // Backend expects Archive ID in URL, not Folder ID
    unarchiveFolder: async (folderId, token) => {
        try {
            // Use the same removeFromArchive endpoint as files
            // It will automatically find the archive containing this folder
            return await fileService.removeFromArchive(null, [], [folderId], token);
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create folder
    createFolder: async (name, parentFolder, token) => {
        try {
            const response = await api.post('/user/createFolder', {
                name,
                parentFolder
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

    // Get user folders
    getUserFolders: async (token) => {
        try {
            const response = await api.get('/user/getUserFolders', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create file in folder
    createFileInFolder: async (folderId, file, token) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post(`/user/createFile/${folderId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get folder files
    getFolderFiles: async (folderId, type, token) => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };
            if (type) {
                config.params = { type };
            }
            const response = await api.get(`/user/getFolderFiles/${folderId}`, config);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete folder
    deleteFolder: async (folderId, token) => {
        try {
            const response = await api.delete(`/user/deleteFolder/${folderId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update folder name
    updateFolderName: async (folderId, name, token) => {
        try {
            const response = await api.patch(`/user/updateFolderName/${folderId}`, {
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

    // Generate folder share link
    generateFolderShareLink: async (folderId, token) => {
        try {
            const response = await api.post('/user/generateFolderShareLink', {
                folderId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Show success toast if message indicates success
            if (response.data?.message && (response.data.message.includes('نجاح') || response.data.message.includes('success') || response.data.shareUrl || response.data.shareLink)) {
                toast.success(response.data.message || "Folder share link generated successfully", ToastOptions("success"));
            }
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate folder share link", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Disable folder share
    disableFolderShare: async (folderId, token) => {
        try {
            const { data } = await api.patch(`/user/disableFolderShare/${folderId}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Folder sharing disabled successfully", ToastOptions("success"));
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to disable folder sharing", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Generate multi share link
    generateMultiShareLink: async (folderIds, fileIds, token) => {
        try {
            const response = await api.post('/user/generateMultiShareLink', {
                folderIds,
                fileIds
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

    // Get shared items
    getSharedItems: async (folderIds, fileIds, sharedBy) => {
        try {
            const response = await api.get('/auth/getSharedItems', {
                params: {
                    folder_ids: folderIds,
                    file_ids: fileIds,
                    shared_by: sharedBy
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Request account deletion
    requestAccountDeletion: async (data, token) => {
        try {
            const response = await api.post('/user/requestAccountDeletion', data, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

};

export default userService;

