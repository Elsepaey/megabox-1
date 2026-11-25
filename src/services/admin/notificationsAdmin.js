import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const notificationsAdmin = {
    searchUsers(search) {
        return adminQuery(api.get('/admin/users', { params: cleanParams({ search, page: 1, limit: 20 }) }));
    },

    sendTargeted(payload, fallback) {
        return adminMutation(api.post('/notifications/send', payload), fallback);
    },

    sendBroadcast(payload, fallback) {
        return adminMutation(api.post('/admin/notifications/broadcast', payload), fallback);
    },

    listSends(params) {
        return adminQuery(api.get('/admin/notifications/sends', { params: cleanParams(params) }));
    },

    getSend(id) {
        return adminQuery(api.get(`/admin/notifications/sends/${encodeURIComponent(id)}`));
    },
};
