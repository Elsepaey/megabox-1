import { api } from '../apiConfig';
import { adminMutation, adminQuery } from './adminApi';

export const paymentMethodsAdmin = {
    listPaymentMethods: () => adminQuery(api.get('/admin/payment-methods')),
    createPaymentMethod: (body) => adminMutation(api.post('/admin/payment-methods', body)),
    updatePaymentMethod: (id, body) => adminMutation(api.patch(`/admin/payment-methods/${id}`, body)),
    retirePaymentMethod: (id) => adminMutation(api.delete(`/admin/payment-methods/${id}`)),
};

export default paymentMethodsAdmin;
