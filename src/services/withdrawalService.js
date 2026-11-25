import { api } from './apiConfig';

export const withdrawalService = {
    // POST /api/earnings/withdrawals
    requestWithdrawal: async ({ amount, paymentMethodId, paymentDetails }) => {
        const response = await api.post('/earnings/withdrawals', {
            amount,
            paymentMethodId,
            paymentDetails,
        });
        return response.data;
    },

    // GET /api/earnings/withdrawals
    getWithdrawalHistory: async ({ page = 1, limit = 20, status } = {}) => {
        const params = { page, limit };
        if (status) {
            params.status = status;
        }
        const response = await api.get('/earnings/withdrawals', { params });
        return response.data;
    },
};

export default withdrawalService;
