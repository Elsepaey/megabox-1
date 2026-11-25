import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const zipAdmin = {
    listExtractions(params) {
        return adminQuery(api.get('/admin/zips/extractions', { params: cleanParams(params) }));
    },
    getExtraction(id) {
        return adminQuery(api.get(`/admin/zips/extractions/${encodeURIComponent(id)}`));
    },
    cancelExtraction(id, reason) {
        return adminMutation(
            api.put(`/admin/zips/extractions/${encodeURIComponent(id)}/cancellation`, { reason }),
            'Failed to cancel ZIP extraction',
        );
    },
};

export default zipAdmin;
