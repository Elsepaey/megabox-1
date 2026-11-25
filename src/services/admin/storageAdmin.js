import api from '../apiConfig';
import { adminMutation, adminQuery } from './adminApi';

export const storageAdmin = {
    getStats: () => adminQuery(api.get('/admin/storage/stats')),
    getUserStorage: (id) => adminQuery(api.get(`/admin/users/${id}/storage`)),
    recalculateUserStorage: (id, fallback) =>
        adminMutation(api.post(`/admin/users/${id}/storage/recalculate`), fallback),
    updateUserSpace: (id, free_storage_quota_mb, fallback) =>
        adminMutation(api.patch(`/admin/users/${id}/space`, { free_storage_quota_mb }), fallback),
    updateAllUsersSpace: (free_storage_quota_mb, fallback) =>
        adminMutation(api.patch('/admin/users/space/all', { free_storage_quota_mb }), fallback),
    updateFreeUsersSpace: (free_storage_quota_mb, fallback) =>
        adminMutation(api.patch('/admin/users/space/free', { free_storage_quota_mb }), fallback),
};

export default storageAdmin;
