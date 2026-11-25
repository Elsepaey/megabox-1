// Ported from Mega-Box-backend/src/modules/about-us/version/compare-app-versions.ts
const APP_VERSION_PATTERN =
    /^v?(\d+(?:\.\d+)*)(?:-([0-9a-z-]+(?:\.[0-9a-z-]+)*))?(?:\+[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/i;
const NUMERIC_IDENTIFIER = /^\d+$/;

export const APP_PLATFORMS = ['android', 'ios', 'web'];

export function parseAppVersion(value) {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    const match = APP_VERSION_PATTERN.exec(text);
    if (!match) return null;
    return {
        text,
        components: match[1].split('.').map((part) => BigInt(part)),
        prerelease: match[2] ? match[2].split('.') : [],
    };
}

function compareValues(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}

function comparePrerelease(left, right) {
    if (!left.length || !right.length) {
        return Number(!left.length) - Number(!right.length);
    }

    const len = Math.min(left.length, right.length);
    for (let i = 0; i < len; i += 1) {
        const leftIsNumeric = NUMERIC_IDENTIFIER.test(left[i]);
        const rightIsNumeric = NUMERIC_IDENTIFIER.test(right[i]);
        if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1;
        const order = leftIsNumeric
            ? compareValues(BigInt(left[i]), BigInt(right[i]))
            : compareValues(left[i], right[i]);
        if (order) return order;
    }

    return left.length - right.length;
}

export function compareParsedVersions(left, right) {
    const maxLen = Math.max(left.components.length, right.components.length);
    const zero = BigInt(0);
    for (let i = 0; i < maxLen; i += 1) {
        const order = compareValues(left.components[i] ?? zero, right.components[i] ?? zero);
        if (order) return order;
    }

    return comparePrerelease(left.prerelease, right.prerelease);
}
