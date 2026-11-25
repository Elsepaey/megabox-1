import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const moderationAdmin = {
    listReports(params) {
        return adminQuery(api.get('/admin/reports', { params: cleanParams(params) }));
    },

    getReport(id) {
        return adminQuery(api.get(`/admin/reports/${encodeURIComponent(id)}`));
    },

    updateReportStatus(id, { status, decisionNote }, fallback) {
        const payload = {
            status,
            ...(decisionNote !== undefined ? { decisionNote } : {}),
        };
        return adminMutation(
            api.patch(`/admin/reports/${encodeURIComponent(id)}/status`, payload),
            fallback,
        );
    },

    listComplaints(params) {
        return adminQuery(api.get('/admin/complaints', { params: cleanParams(params) }));
    },

    getComplaint(id) {
        return adminQuery(api.get(`/admin/complaints/${encodeURIComponent(id)}`));
    },

    updateComplaintStatus(id, { status, adminNote }, fallback) {
        const payload = {
            status,
            ...(adminNote !== undefined ? { adminNote } : {}),
        };
        return adminMutation(
            api.patch(`/complain/${encodeURIComponent(id)}/status`, payload),
            fallback,
        );
    },

    listComplaintTypes() {
        return adminQuery(api.get('/complain/types/all'));
    },

    createComplaintType({ name_en, name_ar }, fallback) {
        return adminMutation(api.post('/complain/types', { name_en, name_ar }), fallback);
    },

    updateComplaintType(id, payload, fallback) {
        return adminMutation(
            api.patch(`/complain/types/${encodeURIComponent(id)}`, payload),
            fallback,
        );
    },

    retireComplaintType(id, fallback) {
        return adminMutation(
            api.delete(`/complain/types/${encodeURIComponent(id)}`),
            fallback,
        );
    },
};

export default moderationAdmin;
