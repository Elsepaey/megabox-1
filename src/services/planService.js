import { api } from './apiConfig';

// Public plan catalog (active plans, cheapest first). Staff plan management
// lives in services/admin/financeAdmin.js.
export const planService = {
    getPlans: async () => {
        try {
            const response = await api.get('/plans');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
};

export default planService;
