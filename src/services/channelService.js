import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { api } from './apiConfig';

export const channelService = {
    // Create a new channel
    createChannel: async (image, name, description, token) => {
        try {
            const formData = new FormData();
            // Only append image if it exists
            if (image) {
                formData.append('file', image); // Try 'file' instead of 'image'
            }
            formData.append('name', name);
            if (description) {
                formData.append('description', description);
            }
            
            const response = await api.post('/createChannel', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Channel created successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create channel", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Subscribe to a channel
    subscribeToChannel: async (channelId, token) => {
        try {
            const response = await api.post('/auth/subscribeToChannel', {
                channelId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Subscribed to channel successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to subscribe to channel", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get user's subscribed channels
    getMySubscribedChannels: async (token) => {
        try {
            const response = await api.get('/auth/getMySubscribedChannels', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    /**
     * Create file in a channel
     * @deprecated Use fileService.uploadFile(file, token, { channelId }) instead.
     * This method uses legacy direct FormData upload. The new unified system
     * supports chunked R2 uploads and TUS video uploads with pause/resume.
     */
    createFileInChannel: async (file, channelId, token) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('channelId', channelId);
            
            const response = await api.post('/auth/createFilechannel', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("File uploaded to channel successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to upload file to channel", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get files in a channel
    getUserFilesInChannel: async (channelId, token) => {
        try {
            const response = await api.get('/auth/getUserFileschannel', {
                params: {
                    channelId
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

export default channelService;

