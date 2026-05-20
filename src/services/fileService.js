import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { api } from './apiConfig';
import { uploadFile as orchestratorUpload, pauseUpload as orchestratorPause, cancelUpload as orchestratorCancel } from './uploadOrchestrator';
import { getAllItemsLegacyShape } from './itemsService';

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

    deletFile: async (id, token) => {
        try {
            const { data } = await api.delete(`/auth/deleteFile/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (data?.message === "✅ تم حذف الملف بنجاح")
                return true;

            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    changeFileName: async (id, token, newFileName) => {
        try {
            const { data } = await api.patch(`/auth/updateFileName/${id}`, {
                newFileName
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (data?.message === "✅ تم تعديل اسم الملف بنجاح")
                return true;

            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    generateShareLink: async (fileId, token) => {
        try {
            const { data } = await api.post('/auth/generateShareLink', {
                fileId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Show success toast if message indicates success
            if (data?.message && (data.message.includes('نجاح') || data.message.includes('success') || data.shareUrl || data.shareLink)) {
                toast.success(data.message || "Share link generated successfully", ToastOptions("success"));
            }
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate share link", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    saveFile: async (fileId, token) => {
        try {
            const { data } = await api.post('/auth/saveFile', {
                fileId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("File saved successfully!", ToastOptions("success"));
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save file", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    /**
     * @deprecated Use getAllUnifiedItems() from itemsService instead
     */
    getAllFiles: async (token) => {
        const { files, folders } = await getAllItemsLegacyShape(token, { type: 'all' });
        return { files, folders };
    },

    /**
     * @deprecated Use getAllUnifiedItems(token, { type: 'image' }) from itemsService instead
     */
    getImageFiles: async (token) => {
        const { files } = await getAllItemsLegacyShape(token, { type: 'image' });
        return { files };
    },

    /**
     * @deprecated Use getAllUnifiedItems(token, { type: 'video' }) from itemsService instead
     */
    getVideoFiles: async (token) => {
        const { files } = await getAllItemsLegacyShape(token, { type: 'video' });
        return { files };
    },

    /**
     * @deprecated Use getAllUnifiedItems(token, { type: 'document' }) from itemsService instead
     */
    getDocumentFiles: async (token) => {
        const { files } = await getAllItemsLegacyShape(token, { type: 'document' });
        return { files };
    },

    /**
     * @deprecated Use getAllUnifiedItems(token, { type: 'zip' }) from itemsService instead
     */
    getZipFiles: async (token) => {
        const { files } = await getAllItemsLegacyShape(token, { type: 'zip' });
        return { files };
    },

    /**
     * @deprecated Use getAllUnifiedItems(token, { folderId }) from itemsService instead
     */
    getFolderItems: async (token, folderId) => {
        return getAllItemsLegacyShape(token, { folderId });
    },

    /**
     * Get archived files only
     * @deprecated Use getAllUnifiedItems() with type filter from itemsService instead
     */
    getArchivedFiles: async (token) => {
        try {
            const { data } = await api.get('/auth/getUserFiles', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Filter for archived files only
            if (data?.files) {
                data.files = data.files.filter(file =>
                    file.archived === true || file.isArchived === true
                );
            }
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Archive file - Use createArchive (POST) endpoint for archiving individual files
    archiveFile: async (fileId, token) => {
        try {
            // Use POST /auth/createArchive endpoint (the only available endpoint)
            const { data } = await api.post('/auth/createArchive', {
                files: [fileId],
                folders: []
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Toast is shown in the component
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to archive file", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Unarchive file - use removeFromArchive endpoint
    // Backend expects Archive ID in URL, not File ID
    // We need to find which archive contains this file first
    unarchiveFile: async (fileId, token) => {
        try {
            const archivesResponse = await api.get('/archives', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            const archives = archivesResponse.data?.data || [];
            
            let archiveId = null;
            for (const archive of archives) {
                const hasFile = archive.files?.some(f => (f._id || f.id) === fileId);
                if (hasFile) {
                    archiveId = archive._id;
                    break;
                }
            }
            
            if (!archiveId) {
                throw new Error("Archive not found for this file");
            }
            
            const { data } = await api.delete(`/auth/removeFromArchive/${archiveId}`, {
                data: {
                    files: [fileId],
                    folders: []
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return data;
        } catch (error) {
            
            const errorMessage = error.response?.data?.message || error.message || "Failed to unarchive file";
            toast.error(errorMessage, ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Create zip from files and folders (Postman collection format)
    createZip: async (items, token) => {
        try {
            // items format: [{ type: "file", id: "..." }, { type: "folder", id: "..." }]
            const { data } = await api.post('/auth/createZip', {
                items: items || []
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Zip file created successfully", ToastOptions("success"));
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create zip file", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Create zip from files and folders (legacy format - for backward compatibility)
    createZipLegacy: async (fileIds, folderIds, zipName, token) => {
        try {
            // Convert legacy format to Postman format
            const items = [];
            if (fileIds && fileIds.length > 0) {
                fileIds.forEach(id => items.push({ type: "file", id }));
            }
            if (folderIds && folderIds.length > 0) {
                folderIds.forEach(id => items.push({ type: "folder", id }));
            }
            return await fileService.createZip(items, token);
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get user's zip files
    getMyZips: async (token) => {
        try {
            const { data } = await api.get('/zips', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Download zip file by ID
    downloadZip: async (zipId, items, token, fileName) => {
        try {
            const response = await api.post(`/auth/downloadZip/${zipId}`, {
                items: items || []
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                responseType: 'blob' // Important for file downloads
            });
            
            // Get filename from response headers or use provided/default
            const contentDisposition = response.headers['content-disposition'];
            let downloadFileName = fileName || 'download.zip';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (fileNameMatch && fileNameMatch[1]) {
                    downloadFileName = fileNameMatch[1].replace(/['"]/g, '');
                }
            }
            
            // Create download link for blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', downloadFileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("Zip file downloaded successfully", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to download zip file", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Create archive with files and folders
    createArchive: async (files, folders, token) => {
        try {
            const { data } = await api.post('/auth/createArchive', {
                files: files || [],
                folders: folders || []
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Toast is shown in the component
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create archive", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get user's archives
    getMyArchives: async (token) => {
        try {
            const { data } = await api.get('/archives', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            const archives = data?.data || [];
            
            const allFiles = [];
            const allFolders = [];
            const seenFileIds = new Set();
            const seenFolderIds = new Set();
            
            archives.forEach((archive) => {
                if (archive.files && Array.isArray(archive.files)) {
                    archive.files.forEach(file => {
                        const fileId = file._id || file.id;
                        if (fileId && !seenFileIds.has(String(fileId))) {
                            seenFileIds.add(String(fileId));
                            allFiles.push({
                                ...file,
                                archived: true,
                                isArchived: true
                            });
                        }
                    });
                }
                
                if (archive.folders && Array.isArray(archive.folders)) {
                    archive.folders.forEach(folder => {
                        const folderId = folder._id || folder.id;
                        if (folderId && !seenFolderIds.has(String(folderId))) {
                            seenFolderIds.add(String(folderId));
                            allFolders.push({
                                ...folder,
                                archived: true,
                                isArchived: true
                            });
                        }
                    });
                }
            });
            
            return { files: allFiles, folders: allFolders };
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Remove items from archive
    // Backend expects Archive ID in URL, not File/Folder ID
    // We need to find which archive(s) contain the files/folders first
    removeFromArchive: async (itemId, files, folders, token) => {
        try {
            const fileIds = files || [];
            const folderIds = folders || [];
            
            if (fileIds.length === 0 && folderIds.length === 0 && !itemId) {
                throw new Error("No files or folders provided for removeFromArchive");
            }
            
            console.log('🗑️ Removing from archive:', { itemId, files: fileIds, folders: folderIds });
            
            // Get all archives to find which ones contain these files/folders
            const archivesResponse = await api.get('/archives', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            const archives = archivesResponse.data?.data || [];
            console.log('🔍 Found', archives.length, 'archives to search');
            
            // Find archives that contain any of the files/folders
            const archivesToUpdate = new Set();
            
            for (const archive of archives) {
                // Check if archive contains any of the files
                const hasFile = fileIds.some(fileId => 
                    archive.files?.some(f => (f._id || f.id) === fileId)
                );
                
                // Check if archive contains any of the folders
                const hasFolder = folderIds.some(folderId => 
                    archive.folders?.some(f => (f._id || f.id) === folderId)
                );
                
                if (hasFile || hasFolder) {
                    archivesToUpdate.add(archive._id);
                }
            }
            
            console.log('📦 Archives to update:', Array.from(archivesToUpdate));
            
            if (archivesToUpdate.size === 0) {
                throw new Error("No archives found containing the specified files/folders");
            }
            
            // If multiple archives, we need to call the endpoint for each archive
            // But if all items are in one archive, use that archive ID
            const archiveIds = Array.from(archivesToUpdate);
            const results = [];
            
            for (const archiveId of archiveIds) {
                // Get files/folders that are in this specific archive
                const archive = archives.find(a => a._id === archiveId);
                const filesInArchive = fileIds.filter(fileId => 
                    archive.files?.some(f => (f._id || f.id) === fileId)
                );
                const foldersInArchive = folderIds.filter(folderId => 
                    archive.folders?.some(f => (f._id || f.id) === folderId)
                );
                
                if (filesInArchive.length > 0 || foldersInArchive.length > 0) {
                    const { data } = await api.delete(`/auth/removeFromArchive/${archiveId}`, {
                        data: {
                            files: filesInArchive,
                            folders: foldersInArchive
                        },
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    results.push(data);
                }
            }
            
            return results[results.length - 1] || { success: true };
        } catch (error) {
            
            const errorMessage = error.response?.data?.message || error.message || "Failed to remove items from archive";
            toast.error(errorMessage, ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Delete zip file - try dedicated deleteZip endpoint first, then fallback to deleteFile/deleteFolder
    deleteZip: async (zipId, token) => {
        try {
            try {
                const { data } = await api.delete(`/auth/deleteZip/${zipId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (data?.message === "✅ تم حذف الملف بنجاح" || data?.message?.includes('نجاح') || data?.message?.includes('success') || data?.message?.includes('حذف')) {
                    toast.success("Zip file deleted successfully", ToastOptions("success"));
                    return true;
                }

                return data;
            } catch (deleteZipError) {
                if (deleteZipError.response?.status === 404) {
                    try {
                        const { data } = await api.delete(`/auth/deleteFile/${zipId}`, {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });

                        if (data?.message === "✅ تم حذف الملف بنجاح" || data?.message?.includes('نجاح') || data?.message?.includes('success') || data?.message?.includes('حذف')) {
                            toast.success("Zip file deleted successfully", ToastOptions("success"));
                            return true;
                        }

                        return data;
                    } catch (deleteFileError) {
                        if (deleteFileError.response?.status === 404) {
                            const { data } = await api.delete(`/user/deleteFolder/${zipId}`, {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            });

                            if (data?.message === "✅ تم حذف الملف بنجاح" || data?.message?.includes('نجاح') || data?.message?.includes('success') || data?.message?.includes('حذف')) {
                                toast.success("Zip file deleted successfully", ToastOptions("success"));
                                return true;
                            }

                            return data;
                        } else {
                            throw deleteFileError;
                        }
                    }
                } else {
                    throw deleteZipError;
                }
            }
        } catch (error) {
            
            const errorMessage = error.response?.data?.message || error.message || "Failed to delete zip file";
            toast.error(errorMessage, ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Update zip file name
    updateZipName: async (zipId, fileName, token) => {
        try {
            const { data } = await api.patch(`/auth/updateZipName/${zipId}`, {
                fileName
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (data?.message === "✅ تم تعديل اسم الملف بنجاح" || data?.message?.includes('نجاح') || data?.message?.includes('success') || data?.message?.includes('تعديل')) {
                toast.success("Zip file name updated successfully", ToastOptions("success"));
                return true;
            }

            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update zip file name", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Generate share link for zip file
    generateZipShareLink: async (zipId, token) => {
        try {
            const { data } = await api.post('/auth/generateZipShareLink', {
                zipId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Show success toast if message indicates success
            if (data?.message && (data.message.includes('نجاح') || data.message.includes('success') || data.shareUrl || data.shareLink)) {
                toast.success(data.message || "Zip share link generated successfully", ToastOptions("success"));
            }
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate zip share link", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get shared files by user
    getSharedFilesByUser: async (token) => {
        try {
            const { data } = await api.get('/auth/getSharedFilesByUser', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get shared folder content
    getSharedFolderContent: async (folderId, token) => {
        try {
            const { data } = await api.get(`/auth/getSharedFolderContent/${folderId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Disable file share
    disableFileShare: async (fileId, token) => {
        try {
            const { data } = await api.patch(`/user/disableFileShare/${fileId}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("File sharing disabled successfully", ToastOptions("success"));
            return data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to disable file sharing", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get user storage usage
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

    // Get shared file
    getSharedFile: async (fileId) => {
        try {
            const { data } = await api.get(`/auth/getSharedFile/${fileId}`);
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

export default fileService;

