import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { api } from './apiConfig';

export const adminService = {
    // Toggle user ban
    toggleUserBanByOwner: async (userId, token) => {
        try {
            const response = await api.patch(`/auth/toggleUserBanByOwner/${userId}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Don't show toast here, let the component handle it with translation
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update user ban status", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Delete user by ID
    deleteUserById: async (userId, token) => {
        try {
            const response = await api.delete(`/auth/deleteUserById/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("User deleted successfully", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete user", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // NOTE: The following APIs are NOT in the backend documentation and need to be implemented:
    // - /auth/searchUser/:searchTerm
    // - /auth/toggleUserPremium/:userId
    // - /auth/setUserPremium/:userId
    // - /auth/deleteCopyrightReport/:complaintId
    // - /auth/deletePromoter/:promoterId
    // These methods have been removed until the backend implements them.

    // Withdrawal management endpoints (Admin)
    getAllWithdrawals: async (token) => {
        try {
            const response = await api.get('/auth/getAllWithdrawals', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update withdrawal status (approve/reject)
    updateWithdrawalStatus: async (withdrawalId, status, reason, token) => {
        try {
            const body = { status };
            if (reason) {
                body.reason = reason;
            }
            const response = await api.patch(`/auth/updateWithdrawalStatus/${withdrawalId}`, body, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Log response to verify if reason is included in backend response
            
            toast.success(
                status === 'approved' 
                    ? "Withdrawal approved successfully!" 
                    : status === 'rejected'
                        ? "Withdrawal rejected successfully!"
                        : "Withdrawal status updated successfully!",
                ToastOptions("success")
            );
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update withdrawal status", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get approved withdrawals
    getApprovedWithdrawals: async (token) => {
        try {
            const response = await api.get('/auth/getApprovedWithdrawals', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get all storage (admin)
    getAllStorage: async (token) => {
        try {
            // Try to use getAllStorageStats first, fallback to empty if not available
            const response = await api.get('/auth/getAllStorageStats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Transform the response to match expected format
            if (response.data?.storage) {
                return response.data;
            }
            if (Array.isArray(response.data)) {
                return { storage: response.data };
            }
            if (response.data?.data) {
                return { storage: response.data.data };
            }
            return { storage: [] };
        } catch {
            return { storage: [] };
        }
    },

    // Get all storage statistics (admin)
    getAllStorageStats: async (token) => {
        try {
            const response = await api.get('/auth/getAllStorageStats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get all payments (admin) - NOT IMPLEMENTED IN BACKEND
    getAllPayments: async () => {
        return { payments: [] };
    },

    // Get all downloads and views (admin) - NOT IMPLEMENTED IN BACKEND
    getAllDownloadsViews: async () => {
        return { downloadsViews: [] };
    },

    // Get share link analytics downloads (admin) - for specific user/promoter
    getShareLinkAnalyticdownloads: async (userId, token) => {
        try {
            const response = await api.get(`/auth/getShareLinkAnalyticdownloads/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            // Handle 404 gracefully - user may not have shared files (this is expected for users without shared files)
            if (error.response?.status === 404 || error.status === 404) {
                // Return empty analytics array instead of throwing error
                // This prevents console errors for expected cases where users have no shared files
                return {
                    message: error.response?.data?.message || 'No shared files found',
                    analytics: []
                };
            }
            // For other errors, still throw but don't log 404s
            throw error.response?.data || error.message;
        }
    },

    // Get all subscriptions (admin)
    getAllSubscriptions: async (token) => {
        try {
            const response = await api.get('/auth/getAllSubscriptions', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create subscription (admin)
    createSubscription: async (invoiceFile, phone, subscriberName, durationDays, planName, token) => {
        try {
            const formData = new FormData();
            if (invoiceFile) {
                formData.append('invoice', invoiceFile);
            }
            formData.append('phone', phone);
            formData.append('subscriberName', subscriberName);
            formData.append('durationDays', durationDays);
            formData.append('planName', planName);

            const response = await api.post('/auth/createSubscription', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Subscription created successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create subscription", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get all subscription plans
    getPlans: async () => {
        try {
            const response = await api.get('/plans');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get all plans (alternative endpoint)
    getAllPlans: async (token) => {
        try {
            const response = await api.get('/auth/getAllPlans', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create subscription plan (admin)
    createPlan: async (days, price, name, token) => {
        try {
            const response = await api.post('/auth/createPlan', {
                days,
                price,
                name
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Plan created successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create plan", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Update subscription plan (admin)
    updatePlan: async (planId, days, price, name, token) => {
        try {
            const response = await api.patch(`/auth/updatePlan/${planId}`, {
                days,
                price,
                name
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Plan updated successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update plan", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Delete subscription plan (admin)
    deletePlan: async (planId, token) => {
        try {
            const response = await api.delete(`/auth/deletePlan/${planId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Plan deleted successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete plan", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Toggle premium subscription for user (admin)
    toggleBrimumeByOwner: async (userId, activate, durationDays, token) => {
        try {
            const body = { activate };
            if (durationDays !== undefined) {
                body.durationDays = durationDays;
            }
            const response = await api.patch(`/auth/toggleBrimumeByOwner/${userId}`, body, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success(
                activate ? "Premium subscription activated successfully!" : "Premium subscription deactivated successfully!",
                ToastOptions("success")
            );
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to toggle premium subscription", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get all users (admin)
    getAllUsers: async (token) => {
        try {
            const response = await api.get('/user/getAllUsers', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get all copyright reports (admin)
    getAllCopyrightReports: async (token) => {
        try {
            const response = await api.get('/auth/getAllCopyrightReports', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get user analytics (admin view)
    getUserAnalyticsadmin: async (userId, token) => {
        try {
            const response = await api.get(`/auth/getUserAnalyticsadmin/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get user earnings (admin view)
    getUserEarningsadmin: async (userId, token) => {
        try {
            const response = await api.get(`/auth/getUserEarningsadmin/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get share link analytics (admin view)
    getShareLinkAnalyticsadmin: async (userId, token) => {
        try {
            const response = await api.get(`/auth/getShareLinkAnalyticsadmin/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Send notification to specific user (admin)
    sendNotification: async (userId, title, body, token) => {
        try {
            const response = await api.post('/user/sendnotification', {
                _id: userId,
                title,
                body
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Notification sent successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to send notification";
            toast.error(errorMessage, ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Send notification to all users (admin)
    notifyAll: async (title, body, token) => {
        try {
            const response = await api.post('/user/notifyall', {
                title,
                body
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success(response?.data?.message || "Notification sent to all users successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            // Show the actual error message from backend
            const errorMessage = error.response?.data?.message || error.message || "Failed to send notification to all users";
            toast.error(errorMessage, ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Update single pending reward (admin)
    updateSinglePendingReward: async (userId, rewardId, amount, token) => {
        try {
            const response = await api.patch(`/auth/updateSinglePendingReward/${userId}/${rewardId}`, {
                amount
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Pending reward updated successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update pending reward", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Update analytics data (admin)
    updateAnalyticsData: async (userId, analyticsData, token) => {
        try {
            const response = await api.patch(`/auth/updateAnalyticsData/${userId}`, analyticsData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Analytics data updated successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update analytics data", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get user statistics (admin)
    getUserStats: async (token) => {
        try {
            const response = await api.get('/auth/getUserStats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get user withdrawals (admin) - GET method
    // NOTE: Changed from POST to GET as this is a read operation
    // Currently filtering client-side from getAllWithdrawals instead
    getUserWithdrawals: async (token) => {
        try {
            const response = await api.get('/auth/getUserWithdrawals', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete copyright report (admin)
    deleteCopyrightReport: async (complaintId, token) => {
        try {
            const response = await api.delete(`/auth/deleteCopyrightReport/${complaintId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Copyright report deleted successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete copyright report", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Approve/Activate subscription (admin)
    approveSubscription: async (subscriptionId, token) => {
        try {
            if (!subscriptionId) {
                throw new Error('Subscription ID is required');
            }
            if (!token) {
                throw new Error('Authentication token is required');
            }

            const response = await api.patch(`/auth/approveSubscription/${subscriptionId}`, {
                status: 'approved'
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to approve subscription";
            // Don't show toast here - let the caller handle it
            throw new Error(errorMessage);
        }
    },

    // Payment Service Management (Admin only)
    createPaymentService: async (paymentData, token) => {
        try {
            const response = await api.post('/auth/createPaymentService', paymentData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Payment service created successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create payment service", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    updatePaymentService: async (serviceId, paymentData, token) => {
        try {
            const response = await api.patch(`/auth/updatePaymentService/${serviceId}`, paymentData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Payment service updated successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update payment service", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    deletePaymentService: async (serviceId, token) => {
        try {
            const response = await api.delete(`/auth/deletePaymentService/${serviceId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Payment service deleted successfully!", ToastOptions("success"));
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete payment service", ToastOptions("error"));
            throw error.response?.data || error.message;
        }
    },

    // Get all payment services (admin can use this to manage them)
    getPaymentServices: async (token) => {
        try {
            const response = await api.get('/auth/getPaymentServices', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

export default adminService;

