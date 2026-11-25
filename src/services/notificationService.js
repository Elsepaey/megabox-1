import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { api } from './apiConfig';

export const notificationService = {
    saveFcmToken: async (fcmToken) => {
        try {
            const response = await api.post('/notifications/token', { token: fcmToken });
            return response.data;
        } catch (error) {
            console.error('Failed to save FCM token:', error);
            throw error.response?.data || error.message;
        }
    },

    getUserNotifications: async (token, { page = 1, limit = 20 } = {}) => {
        try {
            const response = await api.get('/notifications', {
                params: { page, limit },
                ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    markAllAsRead: async (token) => {
        try {
            const response = await api.patch(
                '/notifications/read-all',
                {},
                token ? { headers: { Authorization: `Bearer ${token}` } } : {},
            );
            toast.success(
                response.data?.message || 'All notifications marked as read',
                ToastOptions('success'),
            );
            return response.data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Failed to mark notifications as read',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },

    markAsRead: async (notificationId, token) => {
        try {
            const response = await api.patch(
                `/notifications/${notificationId}/read`,
                {},
                token ? { headers: { Authorization: `Bearer ${token}` } } : {},
            );
            return response.data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Failed to mark notification as read',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },

    deleteNotification: async (notificationId, token) => {
        try {
            const response = await api.delete(
                `/notifications/${notificationId}`,
                token ? { headers: { Authorization: `Bearer ${token}` } } : {},
            );
            return response.data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Failed to delete notification',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },
};

export default notificationService;
