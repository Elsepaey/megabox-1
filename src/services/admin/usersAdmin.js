import api from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const usersAdmin = {
    list: (params) => adminQuery(api.get('/admin/users', { params: cleanParams(params) })),
    get: (id) => adminQuery(api.get(`/admin/users/${id}`)),
    getStats: () => adminQuery(api.get('/admin/users/stats')),
    setBan: (id, payload, fallback) => adminMutation(api.put(`/admin/users/${id}/ban`, payload), fallback),
    setRole: (id, payload, fallback) => adminMutation(api.patch(`/admin/users/${id}/role`, payload), fallback),
    deleteUser: (id, fallback) => adminMutation(api.delete(`/admin/users/${id}`), fallback),
    listPlans: () => adminQuery(api.get('/admin/plans')),
    grantSubscription: (id, payload, fallback) =>
        adminMutation(api.post(`/admin/users/${id}/subscription`, cleanParams(payload)), fallback),
    revokeSubscription: (id, payload, fallback) =>
        adminMutation(api.put(`/admin/users/${id}/subscription/revocation`, payload), fallback),
    sendNotification: (payload, fallback) =>
        adminMutation(api.post('/notifications/send', cleanParams(payload)), fallback),
};

export default usersAdmin;
