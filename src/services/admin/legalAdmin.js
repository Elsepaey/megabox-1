import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const legalAdmin = {
    listTerms(params) {
        return adminQuery(api.get('/admin/terms', { params: cleanParams(params) }));
    },

    getTermsVersion(version) {
        return adminQuery(api.get(`/admin/terms/${encodeURIComponent(version)}`));
    },

    publishTerms(payload, fallback) {
        return adminMutation(api.patch('/terms', payload), fallback);
    },

    listPrivacyPolicies(params) {
        return adminQuery(api.get('/admin/privacy-policies', { params: cleanParams(params) }));
    },

    getPrivacyPolicyVersion(version) {
        return adminQuery(api.get(`/admin/privacy-policies/${encodeURIComponent(version)}`));
    },

    publishPrivacyPolicy(payload, fallback) {
        return adminMutation(api.post('/privacy-policy', payload), fallback);
    },

    listPromoterPrivacyPolicies(params) {
        return adminQuery(api.get('/admin/promoter-privacy-policies', { params: cleanParams(params) }));
    },

    getPromoterPrivacyPolicyVersion(version) {
        return adminQuery(api.get(`/admin/promoter-privacy-policies/${encodeURIComponent(version)}`));
    },

    publishPromoterPrivacyPolicy(payload, fallback) {
        return adminMutation(api.post('/admin/promoter-privacy-policies', payload), fallback);
    },
};
