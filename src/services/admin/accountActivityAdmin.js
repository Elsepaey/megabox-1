import api from '../apiConfig';
import { adminQuery, cleanParams } from './adminApi';

export const accountActivityAdmin = {
    getDownloadAllowance: (id) => adminQuery(api.get(`/admin/users/${id}/downloads/allowance`)),
    listDownloadHistory: (id, params) =>
        adminQuery(api.get(`/admin/users/${id}/downloads/history`, { params: cleanParams(params) })),
    listSavedItems: (id, params) =>
        adminQuery(api.get(`/admin/users/${id}/saves/items`, { params: cleanParams(params) })),
    listArchives: (id, params) =>
        adminQuery(api.get(`/admin/users/${id}/archives`, { params: cleanParams(params) })),
    listEarnings: (id, params) =>
        adminQuery(api.get(`/admin/users/${id}/earnings`, { params: cleanParams(params) })),
};

export default accountActivityAdmin;
