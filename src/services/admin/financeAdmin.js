import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const financeAdmin = {
    // Withdrawals
    listWithdrawals: (params) =>
        adminQuery(api.get('/admin/withdrawals', { params: cleanParams(params) })),
    updateWithdrawalStatus: (id, body) =>
        adminMutation(api.patch(`/admin/withdrawals/${id}/status`, body)),

    // Plans
    listPlans: () => adminQuery(api.get('/admin/plans')),
    createPlan: (body) => adminMutation(api.post('/plans', body)),
    updatePlan: (id, body) => adminMutation(api.patch(`/plans/${id}`, body)),
    retirePlan: (id) => adminMutation(api.delete(`/plans/${id}`)),

    // Subscriptions
    listSubscriptions: (params) =>
        adminQuery(api.get('/admin/subscriptions', { params: cleanParams(params) })),
    searchUsers: (search, limit = 10) =>
        adminQuery(api.get('/admin/users', { params: cleanParams({ search, limit }) })),
    grantSubscription: (userId, body) =>
        adminMutation(api.post(`/admin/users/${userId}/subscription`, body)),
    revokeSubscription: (userId, body) =>
        adminMutation(api.put(`/admin/users/${userId}/subscription/revocation`, body)),

    // Subscription Requests
    listSubscriptionRequests: (params) =>
        adminQuery(api.get('/admin/subscription-requests', { params: cleanParams(params) })),
    approveSubscriptionRequest: (id, body) =>
        adminMutation(api.put(`/admin/subscription-requests/${id}/approval`, body)),
    rejectSubscriptionRequest: (id, body) =>
        adminMutation(api.put(`/admin/subscription-requests/${id}/rejection`, body)),
};

export default financeAdmin;
