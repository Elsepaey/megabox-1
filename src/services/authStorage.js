/**
 * Single source of truth for auth tokens.
 *
 * The access token is stored in the `MegaBox` cookie (existing convention,
 * read by react-cookie elsewhere in the app). The refresh token lives in
 * localStorage — it should not be sent automatically with every request, only
 * passed explicitly to /auth/refresh and /auth/logout.
 */

const ACCESS_COOKIE = 'MegaBox';
const REFRESH_KEY = 'MegaBox.refreshToken';

function setCookie(name, value) {
    const isHttps = window.location.protocol === 'https:';
    const secure = isHttps ? '; Secure' : '';
    // 30 days; SameSite=Lax is fine for same-site auth
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax${secure}`;
}

function readCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export const authStorage = {
    getAccessToken() {
        return readCookie(ACCESS_COOKIE);
    },
    setAccessToken(token) {
        if (!token) return;
        setCookie(ACCESS_COOKIE, token);
    },

    getRefreshToken() {
        try {
            return localStorage.getItem(REFRESH_KEY);
        } catch {
            return null;
        }
    },
    setRefreshToken(token) {
        try {
            if (token) localStorage.setItem(REFRESH_KEY, token);
        } catch (e) {
            console.warn('Failed to persist refresh token', e);
        }
    },

    clear() {
        clearCookie(ACCESS_COOKIE);
        try {
            localStorage.removeItem(REFRESH_KEY);
        } catch {
            /* ignore */
        }
    },
};
