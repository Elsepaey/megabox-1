import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

const MULTIPART_CONFIG = {
    headers: {
        'Content-Type': 'multipart/form-data',
    },
};

export const catalogsAdmin = {
    listAvatars(params) {
        return adminQuery(api.get('/admin/profile-avatars', { params: cleanParams(params) }));
    },

    updateAvatar(id, payload, fallback) {
        return adminMutation(api.patch(`/admin/profile-avatars/${encodeURIComponent(id)}`, payload), fallback);
    },

    uploadAvatar(formData, fallback) {
        return adminMutation(api.post('/profile-avatars', formData, MULTIPART_CONFIG), fallback);
    },

    deleteAvatar(id, fallback) {
        return adminMutation(api.delete(`/profile-avatars/${encodeURIComponent(id)}`), fallback);
    },

    listChannelIcons(params) {
        return adminQuery(api.get('/admin/channel-icons', { params: cleanParams(params) }));
    },

    updateChannelIcon(id, payload, fallback) {
        return adminMutation(api.patch(`/admin/channel-icons/${encodeURIComponent(id)}`, payload), fallback);
    },

    uploadChannelIcon(formData, fallback) {
        return adminMutation(api.post('/channel-icons', formData, MULTIPART_CONFIG), fallback);
    },

    deleteChannelIcon(id, fallback) {
        return adminMutation(api.delete(`/channel-icons/${encodeURIComponent(id)}`), fallback);
    },
};
