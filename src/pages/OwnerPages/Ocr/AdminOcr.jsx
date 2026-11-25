import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { MdTextFields } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { ocrAdmin } from '../../../services/admin/ocrAdmin';
import {
    AdminCard,
    AdminPage,
    AdminTable,
    ErrorState,
    FilterBar,
    LoadingState,
    StatTile,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate, formatDay, formatNumber, shortId, todayIso } from '../_shared/formatters';

const MAX_RANGE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_USAGE_FILTERS = {
    userId: '',
    success: '',
    from: '',
    to: '',
};

function defaultSummaryRange() {
    return {
        from: todayIso(-29),
        to: todayIso(1),
    };
}

function validateSummaryRange(range, t) {
    if (!range.from || !range.to) return t('staffOcr.invalidRangeRequired');
    const fromMs = Date.parse(`${range.from}T00:00:00Z`);
    const toMs = Date.parse(`${range.to}T00:00:00Z`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) {
        return t('staffOcr.invalidRangeOrder');
    }
    if ((toMs - fromMs) / MS_PER_DAY > MAX_RANGE_DAYS) {
        return t('staffOcr.invalidRangeMax');
    }
    return null;
}

export default function AdminOcr() {
    const { t, language } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();

    const [rangeForm, setRangeForm] = useState(defaultSummaryRange);
    const [appliedRange, setAppliedRange] = useState(defaultSummaryRange);
    const [rangeError, setRangeError] = useState(null);

    const summaryQuery = useQuery(
        ['staff:ocr-summary', appliedRange.from, appliedRange.to],
        () => ocrAdmin.getSummary(appliedRange),
        {
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const initialUsageFilters = useMemo(
        () => ({
            ...DEFAULT_USAGE_FILTERS,
            userId: searchParams.get('userId') || '',
            success: searchParams.get('success') || '',
            from: searchParams.get('from') || '',
            to: searchParams.get('to') || '',
        }),
        [searchParams],
    );

    const usageList = useAdminList('staff:ocr-usage', ocrAdmin.listUsage, {
        initialFilters: initialUsageFilters,
        defaultFilters: DEFAULT_USAGE_FILTERS,
    });

    const handleApplyRange = (event) => {
        event.preventDefault();
        const validationError = validateSummaryRange(rangeForm, t);
        if (validationError) {
            setRangeError(validationError);
            return;
        }
        setRangeError(null);
        setAppliedRange({ from: rangeForm.from, to: rangeForm.to });
    };

    const handleResetUsage = () => {
        if (searchParams.toString()) {
            setSearchParams({});
        }
        usageList.resetFilters();
    };

    const summary = summaryQuery.data;
    const totals = summary?.totals;
    const successRate =
        totals && totals.requests > 0
            ? Math.round((totals.successes / totals.requests) * 100)
            : 0;

    const dailyColumns = [
        {
            key: 'date',
            header: t('staffOcr.date'),
            render: (row) => formatDay(`${row.date}T00:00:00Z`, language),
        },
        {
            key: 'requests',
            header: t('staffOcr.totalRequests'),
            render: (row) => formatNumber(row.requests, language),
        },
        {
            key: 'successes',
            header: t('staffOcr.successes'),
            render: (row) => formatNumber(row.successes, language),
        },
        {
            key: 'failures',
            header: t('staffOcr.failures'),
            render: (row) => formatNumber(row.failures, language),
        },
        {
            key: 'characters',
            header: t('staffOcr.characters'),
            render: (row) => formatNumber(row.characters, language),
        },
        {
            key: 'images',
            header: t('staffOcr.images'),
            render: (row) => formatNumber(row.images, language),
        },
        {
            key: 'uniqueUsers',
            header: t('staffOcr.uniqueUsers'),
            render: (row) => formatNumber(row.uniqueUsers, language),
        },
    ];

    const usageFilterFields = [
        {
            key: 'userId',
            label: t('staffOcr.userId'),
            type: 'text',
            placeholder: t('staffOcr.userIdPlaceholder'),
        },
        {
            key: 'success',
            label: t('staffOcr.result'),
            type: 'select',
            options: [
                { value: 'true', label: t('staffOcr.outcomeSuccess') },
                { value: 'false', label: t('staffOcr.outcomeFailure') },
            ],
        },
        { key: 'from', label: t('staffCommon.from'), type: 'date' },
        { key: 'to', label: t('staffCommon.to'), type: 'date' },
    ];

    const usageColumns = [
        {
            key: 'user',
            header: t('staffCommon.user'),
            render: (row) => {
                const label = row.user?.username || row.user?.email || shortId(row.userId);
                return row.userId ? (
                    <Link to={`/Owner/Users/${row.userId}`}>{label}</Link>
                ) : (
                    '—'
                );
            },
        },
        {
            key: 'sourceType',
            header: t('staffOcr.sourceType'),
            render: (row) => (
                <span title={row.mimeTypes?.join(', ') || row.sourceType}>
                    {row.sourceType || '—'}
                </span>
            ),
        },
        {
            key: 'imagesPages',
            header: t('staffOcr.imagesPages'),
            render: (row) =>
                t('staffOcr.imagesPagesValue', {
                    images: formatNumber(row.imageCount, language),
                    pages: formatNumber(row.pageCount, language),
                }),
        },
        {
            key: 'charactersExtracted',
            header: t('staffOcr.characters'),
            render: (row) => formatNumber(row.charactersExtracted, language),
        },
        {
            key: 'success',
            header: t('staffOcr.result'),
            render: (row) => (
                <StatusBadge tone={row.success ? 'success' : 'danger'}>
                    {row.success
                        ? t('staffOcr.outcomeSuccess')
                        : row.errorCode || t('staffOcr.outcomeFailure')}
                </StatusBadge>
            ),
        },
        {
            key: 'durationMs',
            header: t('staffOcr.duration'),
            render: (row) =>
                t('staffOcr.durationMs', {
                    ms: formatNumber(row.durationMs, language),
                }),
        },
        {
            key: 'createdAt',
            header: t('staffCommon.createdAt'),
            render: (row) => formatDate(row.createdAt, language),
        },
    ];

    return (
        <AdminPage
            icon={MdTextFields}
            title={t('staffOcr.title')}
            subtitle={t('staffOcr.subtitle')}
        >
            <AdminCard title={t('staffOcr.summaryTitle')}>
                <form className="admin-form" onSubmit={handleApplyRange} style={{ marginBottom: 16 }}>
                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffCommon.from')}</span>
                            <input
                                type="date"
                                className="admin-input"
                                value={rangeForm.from}
                                onChange={(e) =>
                                    setRangeForm((prev) => ({ ...prev, from: e.target.value }))
                                }
                            />
                        </label>
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffCommon.to')}</span>
                            <input
                                type="date"
                                className="admin-input"
                                value={rangeForm.to}
                                onChange={(e) =>
                                    setRangeForm((prev) => ({ ...prev, to: e.target.value }))
                                }
                            />
                        </label>
                        <div className="admin-field" style={{ justifyContent: 'flex-end' }}>
                            <button type="submit" className="admin-btn admin-btn--primary">
                                {t('staffOcr.applyRange')}
                            </button>
                        </div>
                    </div>
                    <div className="admin-field__hint">{t('staffOcr.rangeHint')}</div>
                    {rangeError && <div className="admin-field__error">{rangeError}</div>}
                </form>

                {summaryQuery.isLoading ? (
                    <LoadingState />
                ) : summaryQuery.error ? (
                    <ErrorState error={summaryQuery.error} onRetry={summaryQuery.refetch} />
                ) : totals ? (
                    <div className="admin-stat-grid">
                        <StatTile
                            label={t('staffOcr.totalRequests')}
                            value={formatNumber(totals.requests, language)}
                        />
                        <StatTile
                            label={t('staffOcr.successes')}
                            value={formatNumber(totals.successes, language)}
                            hint={
                                totals.requests > 0
                                    ? t('staffOcr.successRate', { rate: successRate })
                                    : undefined
                            }
                        />
                        <StatTile
                            label={t('staffOcr.failures')}
                            value={formatNumber(totals.failures, language)}
                        />
                        <StatTile
                            label={t('staffOcr.characters')}
                            value={formatNumber(totals.characters, language)}
                        />
                        <StatTile
                            label={t('staffOcr.images')}
                            value={formatNumber(totals.images, language)}
                        />
                        <StatTile
                            label={t('staffOcr.uniqueUsers')}
                            value={formatNumber(totals.uniqueUsers, language)}
                        />
                    </div>
                ) : null}
            </AdminCard>

            {summary && (
                <AdminTable
                    title={t('staffOcr.dailyTitle')}
                    columns={dailyColumns}
                    rows={summary.byDay || []}
                    rowKey="date"
                    emptyMessage={t('staffOcr.emptyDaily')}
                />
            )}

            <FilterBar
                fields={usageFilterFields}
                values={usageList.filters}
                onChange={usageList.setFilter}
                onReset={handleResetUsage}
            />

            <AdminTable
                title={t('staffOcr.usageLogTitle')}
                columns={usageColumns}
                rows={usageList.rows}
                loading={usageList.isLoading}
                error={usageList.error}
                onRetry={usageList.refetch}
                emptyMessage={t('staffOcr.emptyUsage')}
                meta={usageList.meta}
                onPageChange={usageList.setPage}
            />
        </AdminPage>
    );
}
