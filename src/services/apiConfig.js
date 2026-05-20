import axios from 'axios';
import { authStorage } from './authStorage';

export const API_ROOT = 'https://mega-box.onrender.com';
export const API_URL = `${API_ROOT}/api`;

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// ---------------------------------------------------------------------------
// Authorization header — attach the access token from authStorage if the
// caller hasn't set one explicitly. This keeps existing callers that pass
// `Authorization` manually working unchanged, while removing the boilerplate
// for the rest.
// ---------------------------------------------------------------------------
api.interceptors.request.use(
    (config) => {
        if (!config.headers?.Authorization) {
            const token = authStorage.getAccessToken();
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Refresh-on-401 interceptor.
//
// Only the FIRST 401 from a non-/auth/refresh, non-/auth/logout call triggers a
// refresh attempt. While a refresh is in flight, queued requests await its
// outcome rather than firing parallel refresh calls.
//
// The auth context registers an onAuthFailure callback (via setAuthFailureHandler)
// so that we can clear local state and bounce the user to /login when the
// refresh itself fails.
// ---------------------------------------------------------------------------

let refreshPromise = null;
let onAuthFailure = null;

export function setAuthFailureHandler(fn) {
    onAuthFailure = fn;
}

async function performRefresh() {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) {
        const err = new Error('No refresh token available');
        err.noRefreshToken = true;
        throw err;
    }
    // Use a bare axios call so this request bypasses the interceptors below
    // (no recursive refresh on its own 401).
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
    });
    if (data?.accessToken) authStorage.setAccessToken(data.accessToken);
    if (data?.refreshToken) authStorage.setRefreshToken(data.refreshToken);
    return data;
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Massage timeout messages.
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            error.message = 'Request timeout: Server took too long to respond';
        } else if (error.code === 'ERR_CONNECTION_TIMED_OUT' || error.code === 'ERR_NETWORK') {
            error.message = 'Connection timeout: Unable to reach server';
        }

        const original = error.config;
        const status = error.response?.status;
        const url = original?.url || '';

        const isAuthEndpoint =
            url.includes('/auth/refresh') ||
            url.includes('/auth/logout') ||
            url.includes('/auth/login');

        if (status === 401 && !isAuthEndpoint && !original?._retried) {
            original._retried = true;
            try {
                if (!refreshPromise) {
                    refreshPromise = performRefresh().finally(() => {
                        refreshPromise = null;
                    });
                }
                await refreshPromise;
                // Retry original with the new access token (request interceptor
                // will pick it up from authStorage).
                if (original.headers) delete original.headers.Authorization;
                return api(original);
            } catch (refreshErr) {
                authStorage.clear();
                if (onAuthFailure) {
                    try {
                        onAuthFailure(refreshErr);
                    } catch (e) {
                        console.warn('onAuthFailure handler threw', e);
                    }
                }
                return Promise.reject(refreshErr);
            }
        }

        return Promise.reject(error);
    },
);

export default api;
