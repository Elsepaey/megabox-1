import { api } from '../apiConfig';
import { adminQuery, cleanParams } from './adminApi';

export const ocrAdmin = {
    listUsage(params) {
        return adminQuery(api.get('/admin/ocr/usage', { params: cleanParams(params) }));
    },
    getSummary(params) {
        return adminQuery(api.get('/admin/ocr/summary', { params: cleanParams(params) }));
    },
};

export default ocrAdmin;
