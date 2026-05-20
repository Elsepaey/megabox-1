import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { api } from './apiConfig';

export const notificationService = {
    saveFcmToken: async (userId, fcmToken) => {
        try {
            const response = await api.post('/user/savetoken', {
                userId,
                fcmToken
            });
            return response.data;
        } catch (error) {
            console.error('Failed to save FCM token:', error);
            throw error.response?.data || error.message;
        }
    },

    deleteFcmToken: async (token) => {
        try {
            const response = await api.delete('/user/deleteFcmToken', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getUserNotifications: async (token) => {
        try {
            const response = await api.get('/notifications', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    markAllAsRead: async (token) => {
        try {
            const response = await api.post('/user/markAllAsRead', {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("All notifications marked as read", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to mark notifications as read", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    }
};

export default notificationService;

