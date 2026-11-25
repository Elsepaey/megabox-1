import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { api } from './apiConfig';

export const channelService = {
    createChannel: async (image, name, description, token, opts = {}) => {
        try {
            const formData = new FormData();
            if (image) {
                formData.append('cover', image);
            }
            formData.append('name', name);
            if (description) {
                formData.append('description', description);
            }
            if (opts.iconId) formData.append('iconId', opts.iconId);
            if (opts.visibility) formData.append('visibility', opts.visibility);
            if (opts.type) formData.append('type', opts.type);

            const response = await api.post('/channels', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success(response.data?.message || "Channel created successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create channel", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    subscribeToChannel: async (channelId, token) => {
        try {
            const response = await api.post(`/channels/${channelId}/subscribe`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success(response.data?.message || "Subscribed to channel successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to subscribe to channel", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    unsubscribeFromChannel: async (channelId, token) => {
        try {
            const response = await api.delete(`/channels/${channelId}/subscribe`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success(response.data?.message || "Unsubscribed from channel", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to unsubscribe from channel", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    getMySubscribedChannels: async (token, { page = 1, limit = 50, search } = {}) => {
        try {
            const params = { page, limit };
            if (search) params.search = search;
            const response = await api.get('/channels/subscribed', {
                params,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getMyChannels: async (token, { page = 1, limit = 50, search } = {}) => {
        try {
            const params = { page, limit };
            if (search) params.search = search;
            const response = await api.get('/channels/my', {
                params,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getUserFilesInChannel: async (channelId, token, { page = 1, limit = 50, folderId } = {}) => {
        try {
            const params = { page, limit };
            if (folderId) params.folderId = folderId;
            const response = await api.get(`/channels/${channelId}/items`, {
                params,
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

