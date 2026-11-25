import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const contentAdmin = {
    // Shares
    listShares(params) {
        return adminQuery(api.get('/admin/shares', { params: cleanParams(params) }));
    },
    getShare(id) {
        return adminQuery(api.get(`/admin/shares/${encodeURIComponent(id)}`));
    },
    revokeShare(id, reason) {
        return adminMutation(
            api.put(`/admin/shares/${encodeURIComponent(id)}/revocation`, { reason }),
            'Failed to revoke share link',
        );
    },

    // Channels
    listChannels(params) {
        return adminQuery(api.get('/admin/channels', { params: cleanParams(params) }));
    },
    getChannel(id) {
        return adminQuery(api.get(`/admin/channels/${encodeURIComponent(id)}`));
    },
    moderateChannel(id, { status, reason }) {
        return adminMutation(
            api.put(`/admin/channels/${encodeURIComponent(id)}/moderation`, { status, reason }),
            'Failed to update channel moderation',
        );
    },

    // Files & per-file analytics
    listFiles(params) {
        return adminQuery(api.get('/admin/files', { params: cleanParams(params) }));
    },
    getFile(id) {
        return adminQuery(api.get(`/admin/files/${encodeURIComponent(id)}`));
    },
    moderateFile(id, { status, reason }) {
        return adminMutation(
            api.put(`/admin/files/${encodeURIComponent(id)}/moderation`, { status, reason }),
            'Failed to update file moderation',
        );
    },
    getFileAnalytics(id, params) {
        return adminQuery(
            api.get(`/admin/analytics/files/${encodeURIComponent(id)}`, { params: cleanParams(params) }),
        );
    },

    // Folders
    listFolders(params) {
        return adminQuery(api.get('/admin/folders', { params: cleanParams(params) }));
    },
    getFolder(id) {
        return adminQuery(api.get(`/admin/folders/${encodeURIComponent(id)}`));
    },
};

export default contentAdmin;
