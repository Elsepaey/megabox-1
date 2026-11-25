import { api } from './apiConfig';

export const promoterService = {
    // GET /api/earnings
    getEarnings: async () => {
        const response = await api.get('/earnings');
        return response.data;
    },

    // GET /api/earnings/breakdown
    getEarningsBreakdown: async ({ page = 1, limit = 20 } = {}) => {
        const response = await api.get('/earnings/breakdown', {
            params: { page, limit },
        });
        return response.data;
    },

    // GET /api/promoter/stats
    getPromoterStats: async ({ from, to } = {}) => {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        const response = await api.get('/promoter/stats', { params });
        return response.data;
    },

    // GET /api/promoter/shares
    getPromoterShares: async ({ page = 1, limit = 20 } = {}) => {
        const response = await api.get('/promoter/shares', {
            params: { page, limit },
        });
        return response.data;
    },

    // GET /api/promoter/privacy-policy
    getPromoterPrivacyPolicy: async (lang = 'en') => {
        const response = await api.get('/promoter/privacy-policy', {
            params: { lang },
        });
        return response.data;
    },

    // POST /api/promoter/enroll
    enrollPromoter: async ({ plan, promoterPrivacyPolicyVersion }) => {
        const response = await api.post('/promoter/enroll', {
            plan,
            promoterPrivacyPolicyVersion,
        });
        return response.data;
    },

    // GET /api/shares/my-shares
    getMyShares: async ({ page = 1, limit = 20 } = {}) => {
        const response = await api.get('/shares/my-shares', {
            params: { page, limit },
        });
        return response.data;
    },

    // DELETE /api/shares/:id
    deleteShare: async (shareId) => {
        const response = await api.delete(`/shares/${shareId}`);
        return response.data;
    },
};

export default promoterService;
