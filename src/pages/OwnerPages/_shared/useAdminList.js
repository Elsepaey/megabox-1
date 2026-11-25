import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { cleanParams } from '../../../services/admin/adminApi';

function useDebouncedValue(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

/**
 * Server-paginated admin list ({ data, meta } responses).
 * fetcher receives { page, limit, ...filters } with empty filters removed.
 * Changing a filter resets to page 1; text input is debounced.
 * initialFilters may come from the URL: when their content changes (e.g.
 * navigating from ?sharedBy=x to no query), filters re-sync to them.
 * defaultFilters is what Reset restores (defaults to initialFilters).
 */
export default function useAdminList(
    queryKey,
    fetcher,
    { initialFilters = {}, defaultFilters, limit = 20, enabled = true } = {},
) {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState(initialFilters);
    const debouncedFilters = useDebouncedValue(filters, 350);
    const params = cleanParams(debouncedFilters);

    const initialKey = JSON.stringify(initialFilters);
    const [syncedKey, setSyncedKey] = useState(initialKey);
    if (syncedKey !== initialKey) {
        // Adjust state during render (React-recommended over an effect).
        setSyncedKey(initialKey);
        setFilters(initialFilters);
        setPage(1);
    }

    const query = useQuery(
        [queryKey, page, limit, params],
        () => fetcher({ page, limit, ...params }),
        { keepPreviousData: true, retry: false, refetchOnWindowFocus: false, enabled },
    );

    const setFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const resetFilters = () => {
        setFilters(defaultFilters ?? initialFilters);
        setPage(1);
    };

    return {
        ...query,
        rows: query.data?.data ?? [],
        meta: query.data?.meta,
        page,
        setPage,
        filters,
        setFilter,
        resetFilters,
    };
}
