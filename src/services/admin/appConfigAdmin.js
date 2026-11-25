import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const appConfigAdmin = {
    listVersionHistory(params) {
        return adminQuery(api.get('/admin/version/history', { params: cleanParams(params) }));
    },

    publishVersion(payload, fallback) {
        return adminMutation(api.patch('/version', payload), fallback);
    },

    getAppLinks() {
        return adminQuery(api.get('/admin/app-links'));
    },

    publishAppLinks(payload, fallback) {
        return adminMutation(api.patch('/app-links', payload), fallback);
    },
};
