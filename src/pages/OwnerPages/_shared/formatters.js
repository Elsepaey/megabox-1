const locale = (language) => (language === 'ar' ? 'ar-EG' : 'en-GB');

export function formatDate(value, language = 'en') {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(locale(language), { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDay(value, language = 'en') {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(locale(language), { dateStyle: 'medium' });
}

export function formatNumber(value, language = 'en') {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    return Number(value).toLocaleString(locale(language));
}

export function formatBytes(bytes) {
    if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = Number(bytes);
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatMb(mb) {
    if (mb === null || mb === undefined || Number.isNaN(Number(mb))) return '—';
    return formatBytes(Number(mb) * 1024 * 1024);
}

export function shortId(id) {
    if (!id) return '—';
    const value = String(id);
    return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

// Value for <input type="date"> → backend date filter (YYYY-MM-DD, UTC day).
export function todayIso(offsetDays = 0) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().slice(0, 10);
}
