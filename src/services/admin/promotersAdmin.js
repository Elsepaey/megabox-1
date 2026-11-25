import { api } from '../apiConfig';
import { adminQuery, cleanParams } from './adminApi';

export const promotersAdmin = {
    list: (params) => adminQuery(api.get('/admin/promoters', { params: cleanParams(params) })),
    get: (id) => adminQuery(api.get(`/admin/promoters/${id}`)),
    getEarnings: (id, params) =>
        adminQuery(api.get(`/admin/users/${id}/earnings`, { params: cleanParams(params) })),
};

export default promotersAdmin;
