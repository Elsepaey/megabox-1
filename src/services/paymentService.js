import { api } from './apiConfig';

export const paymentService = {
    // GET /api/payment-methods (authenticated, active catalog with localized names/fields)
    getPaymentMethods: async (lang) => {
        const params = lang ? { lang } : undefined;
        const response = await api.get('/payment-methods', { params });
        return response.data?.paymentMethods || [];
    },
};

export default paymentService;
