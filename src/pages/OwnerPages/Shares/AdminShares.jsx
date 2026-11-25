import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MdShare } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { contentAdmin } from '../../../services/admin/contentAdmin';
import { AdminPage, AdminTable, FilterBar, StatusBadge } from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate, formatNumber, shortId } from '../_shared/formatters';

function sourceLabelKey(sourceType) {
    if (sourceType === 'normal') return 'staffShares.sourceNormal';
    if (sourceType === 'saves') return 'staffShares.sourceSaves';
    if (sourceType === 'channel') return 'staffShares.sourceChannel';
    return null;
}

const DEFAULT_FILTERS = {
    shareId: '',
    sharedBy: '',
    sourceType: '',
    isActive: '',
    from: '',
    to: '',
};

export default function AdminShares() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialFilters = {
        shareId: searchParams.get('shareId') || '',
        sharedBy: searchParams.get('sharedBy') || '',
        sourceType: searchParams.get('sourceType') || '',
        isActive: searchParams.get('isActive') || '',
        from: searchParams.get('from') || '',
        to: searchParams.get('to') || '',
    };

    const list = useAdminList('staff:shares', contentAdmin.listShares, {
        initialFilters,
        defaultFilters: DEFAULT_FILTERS,
    });

    const handleReset = () => {
        list.resetFilters();
        setSearchParams({}, { replace: true });
    };

    const filterFields = [
        {
            key: 'shareId',
            label: t('staffShares.shareId'),
            type: 'text',
            placeholder: t('staffShares.shareIdPlaceholder'),
        },
        {
            key: 'sharedBy',
            label: t('staffShares.sharedBy'),
            type: 'text',
            placeholder: t('staffShares.sharedByPlaceholder'),
        },
        {
            key: 'sourceType',
            label: t('staffShares.sourceType'),
            type: 'select',
            options: [
                { value: 'normal', label: t('staffShares.sourceNormal') },
                { value: 'saves', label: t('staffShares.sourceSaves') },
                { value: 'channel', label: t('staffShares.sourceChannel') },
            ],
        },
        {
            key: 'isActive',
            label: t('staffShares.activeState'),
            type: 'select',
            options: [
                { value: 'true', label: t('staffShares.active') },
                { value: 'false', label: t('staffShares.inactive') },
            ],
        },
        { key: 'from', label: t('staffCommon.from'), type: 'date' },
        { key: 'to', label: t('staffCommon.to'), type: 'date' },
    ];

    const columns = [
        {
            key: '_id',
            header: t('staffShares.shareId'),
            render: (row) => <span title={row._id}>{shortId(row._id)}</span>,
        },
        {
            key: 'sourceType',
            header: t('staffShares.sourceType'),
            render: (row) => {
                const labelKey = sourceLabelKey(row.sourceType);
                return (
                    <StatusBadge tone={row.sourceType === 'channel' ? 'info' : 'neutral'}>
                        {labelKey ? t(labelKey) : row.sourceType || '—'}
                    </StatusBadge>
                );
            },
        },
        {
            key: 'sharedBy',
            header: t('staffShares.sharedBy'),
            render: (row) =>
                row.sharedBy ? (
                    <Link
                        to={`/Owner/Users/${row.sharedBy}`}
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        title={row.sharedBy}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {shortId(row.sharedBy)}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'isActive',
            header: t('staffCommon.status'),
            render: (row) => (
                <StatusBadge tone={row.isActive ? 'success' : 'danger'}>
                    {row.isActive ? t('staffShares.active') : t('staffShares.inactive')}
                </StatusBadge>
            ),
        },
        {
            key: 'itemCount',
            header: t('staffShares.items'),
            render: (row) => formatNumber(row.itemCount, language),
        },
        {
            key: 'viewsCount',
            header: t('staffShares.views'),
            render: (row) => formatNumber(row.viewsCount, language),
        },
        {
            key: 'installsCount',
            header: t('staffShares.installs'),
            render: (row) => formatNumber(row.installsCount, language),
        },
        {
            key: 'createdAt',
            header: t('staffCommon.createdAt'),
            render: (row) => formatDate(row.createdAt, language),
        },
    ];

    return (
        <AdminPage icon={MdShare} title={t('staffShares.title')} subtitle={t('staffShares.subtitle')}>
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={handleReset}
            />
            <AdminTable
                title={t('staffShares.tableTitle')}
                columns={columns}
                rows={list.rows}
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                onRowClick={(row) => navigate(`/Owner/Shares/${row._id}`)}
                meta={list.meta}
                onPageChange={list.setPage}
            />
        </AdminPage>
    );
}
