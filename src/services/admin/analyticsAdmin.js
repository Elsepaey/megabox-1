import { api } from '../apiConfig';
import { adminQuery, cleanParams } from './adminApi';

export const analyticsAdmin = {
    getUserStats: () => adminQuery(api.get('/admin/users/stats')),
    getStorageStats: () => adminQuery(api.get('/admin/storage/stats')),
    getSummary: (params) => adminQuery(api.get('/admin/analytics/summary', { params: cleanParams(params) })),
    getFileAnalytics: (id, params) =>
        adminQuery(api.get(`/admin/analytics/files/${id}`, { params: cleanParams(params) })),
};

export default analyticsAdmin;
