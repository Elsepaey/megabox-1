import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';

// Trims string filters and drops empty values so validated backend DTOs
// (forbidNonWhitelisted, IsMongoId without trim) only get meaningful fields.
export function cleanParams(params = {}) {
    const result = {};
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const clean = typeof value === 'string' ? value.trim() : value;
        if (clean !== '') result[key] = clean;
    });
    return result;
}

// Backend errors: { success:false, statusCode, message, error, timestamp, path };
// validation failures send `message` as a string array.
export function apiErrorMessage(error, fallback = 'Request failed') {
    const message = error?.response?.data?.message;
    if (Array.isArray(message)) return message.join('\n');
    return message || error?.message || fallback;
}

export function apiErrorStatus(error) {
    return error?.response?.status;
}

// Reads: return response body; errors propagate (pages render error state).
export async function adminQuery(request) {
    const { data } = await request;
    return data;
}

// Writes: toast the backend message on failure and rethrow the axios error so
// callers can branch on status (e.g. 409 → reload).
export async function adminMutation(request, fallback) {
    try {
        const { data } = await request;
        return data;
    } catch (error) {
        toast.error(apiErrorMessage(error, fallback), ToastOptions('error'));
        throw error;
    }
}
