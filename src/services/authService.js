import { toast } from 'react-toastify';
import { ToastOptions } from '../helpers/ToastOptions';
import { api } from './apiConfig';

function getLang() {
    const match = document.cookie.match(/(?:^|;\s*)language=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : 'en';
}

function langParams() {
    return { params: { lang: getLang() } };
}

/**
 * The new backend returns auth tokens at the top level of the response:
 *   { message, accessToken, refreshToken, user: {...} }
 *
 * On unverified-email login the server replies 403 with a `verify your email`
 * message — caller is responsible for surfacing that to the UI.
 */
export const authService = {
    login: async (email, password) => {
        try {
            console.log('[auth] POST /auth/login', { email, lang: getLang() });
            const response = await api.post('/auth/login', { email, password }, langParams());
            console.log('[auth] login OK', {
                status: response.status,
                keys: Object.keys(response.data || {}),
                data: response.data,
            });
            return response.data;
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || '';
            console.error('[auth] login FAILED', {
                status,
                message,
                data: error.response?.data,
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                fullURL: `${error.config?.baseURL || ''}${error.config?.url || ''}`,
                code: error.code,
                rawMessage: error.message,
            });

            if (status === 403 && /verify your email/i.test(message)) {
                const err = new Error(message);
                err.needsEmailVerification = true;
                err.email = email;
                throw err;
            }

            toast.error(message || 'Login failed. Please try again.', ToastOptions('error'));
            throw error.response?.data || error.message;
        }
    },

    signup: async (username, email, password, confirmPassword, privacyPolicyVersion = null) => {
        try {
            const payload = { username, email, password, confirmPassword };
            // Only include privacyPolicyVersion if it's a number (not null/undefined)
            if (privacyPolicyVersion !== null && privacyPolicyVersion !== undefined) {
                payload.privacyPolicyVersion = privacyPolicyVersion;
            }
            const { data } = await api.post(
                '/auth/signup',
                payload,
                langParams(),
            );
            toast.success(
                'Account created successfully! Please check your email for verification.',
                ToastOptions('success'),
            );
            return data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Signup failed. Please try again.',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },

    signupWithRef: async (username, email, password, confirmPassword, ref, privacyPolicyVersion = null) => {
        try {
            const payload = {
                username,
                email,
                password,
                confirmPassword,
                ...(ref ? { referralCode: ref } : {}),
            };
            // Only include privacyPolicyVersion if it's a number (not null/undefined)
            if (privacyPolicyVersion !== null && privacyPolicyVersion !== undefined) {
                payload.privacyPolicyVersion = privacyPolicyVersion;
            }
            const { data } = await api.post(
                '/auth/signup',
                payload,
                langParams(),
            );
            toast.success(
                'Account created successfully! Please check your email for verification.',
                ToastOptions('success'),
            );
            return data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Signup failed. Please try again.',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },

    /**
     * OTP verify — new backend returns the same shape as login (auto-login).
     * Endpoint: /auth/otp/confirm  (was /auth/confirmOTP)
     */
    confirmOTP: async (code, email) => {
        try {
            const { data } = await api.post('/auth/otp/confirm', { email, code }, langParams());
            toast.success('Email verified successfully!', ToastOptions('success'));
            return data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Verification failed. Please try again.',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },

    /** /auth/otp/resend (was /auth/resendOTP) */
    resendOtp: async (email) => {
        try {
            const { data } = await api.post('/auth/otp/resend', { email }, langParams());
            toast.success('Code resent — check your email.', ToastOptions('success'));
            return data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Failed to resend code.',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },

    /** /auth/password/forget (was /auth/forgetpassword) */
    forgotPassword: async (email) => {
        try {
            const { data } = await api.post('/auth/password/forget', { email }, langParams());
            toast.success('Reset code sent to your email!', ToastOptions('success'));
            return data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Failed to send reset code.',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },

    /** /auth/password/reset (was /auth/resetpassword) */
    resetPassword: async (email, password, code) => {
        try {
            const { data } = await api.post(
                '/auth/password/reset',
                { email, password, code },
                langParams(),
            );
            toast.success(
                'Password reset successful! You can now log in with your new password.',
                ToastOptions('success'),
            );
            return data;
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Password reset failed.',
                ToastOptions('error'),
            );
            throw error.response?.data || error.message;
        }
    },

    userRole: async (id, token) => {
        try {
            // Use the profile endpoint instead of the non-existent getUserRoleById
            // The profile endpoint returns user data including role and referralLink
            const { data } = await api.get('/users/profile', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 10000
            });
            return data?.data;
        } catch (error) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                console.error('Request timeout fetching user role');
                return null;
            }
            if (error.code === 'ERR_CONNECTION_TIMED_OUT' || error.code === 'ERR_NETWORK') {
                console.error('Connection error fetching user role');
                return null;
            }
            console.error('Error getting user role:', error);
            return null;
        }
    },

    /**
     * Google login — new backend endpoint is /auth/google/register (was
     * /auth/loginWithGmail). Accepts `{ accessToken, privacyPolicyVersion? }`.
     */
    loginWithGmail: async (accessToken, privacyPolicyVersion = null) => {
        try {
            const payload = { accessToken };
            if (privacyPolicyVersion !== null && privacyPolicyVersion !== undefined) {
                payload.privacyPolicyVersion = privacyPolicyVersion;
            }
            const { data } = await api.post(
                '/auth/google/register',
                payload,
                langParams(),
            );
            return data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    logout: async (refreshToken, allDevices = false) => {
        if (!refreshToken) return null;
        const payload = allDevices
            ? { refreshToken, allDevices: true }
            : { refreshToken };
        const { data } = await api.post('/auth/logout', payload, langParams());
        return data;
    },

    getAppLink: async () => {
        try {
            const { data } = await api.get('/about-us', langParams());
            const raw = data?.links || {};
            const list = [
                raw.playStore ? { platform: 'android', link: raw.playStore, isActive: true } : null,
                raw.appStore ? { platform: 'ios', link: raw.appStore, isActive: true } : null,
                raw.web ? { platform: 'web', link: raw.web, isActive: true } : null,
            ].filter(Boolean);
            return {
                ...data,
                appLinks: raw,
                links: list,
            };
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },
    // Back-compat aliases for older callers that imported the camelCase name.
    resendotp: async (email) => authService.resendOtp(email),
};

export default authService;
