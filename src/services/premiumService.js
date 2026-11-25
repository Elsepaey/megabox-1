import { api } from './apiConfig';

export const premiumService = {
    submitRequest: async ({ planId, paymentReference, note, invoiceFile }) => {
        try {
            const trimmedRef = (paymentReference || '').trim();
            const trimmedNote = (note || '').trim();

            if (invoiceFile) {
                const formData = new FormData();
                formData.append('planId', planId);
                formData.append('paymentReference', trimmedRef);
                if (trimmedNote) {
                    formData.append('note', trimmedNote);
                }
                formData.append('invoice', invoiceFile);

                const { data } = await api.post('/subscriptions/requests', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                return data;
            }

            const payload = {
                planId,
                paymentReference: trimmedRef,
                ...(trimmedNote ? { note: trimmedNote } : {}),
            };
            const { data } = await api.post('/subscriptions/requests', payload);
            return data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    getMyRequests: async ({ page = 1, limit = 20 } = {}) => {
        try {
            const { data } = await api.get('/subscriptions/requests/my', {
                params: { page, limit },
            });
            return data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default premiumService;
