import React, { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MdFlag } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { moderationAdmin } from '../../../services/admin/moderationAdmin';
import { AdminPage, AdminTable, FilterBar, StatusBadge } from '../_shared/AdminUI';
import { formatDate, shortId } from '../_shared/formatters';
import useAdminList from '../_shared/useAdminList';
import './moderation.scss';

const REPORT_STATUS_TONES = {
    pending: 'warning',
    in_review: 'info',
    resolved: 'success',
    dismissed: 'neutral',
};

const VALID_STATUSES = new Set(['pending', 'in_review', 'resolved', 'dismissed', 'all']);
const VALID_TARGET_TYPES = new Set(['file', 'channel']);
const DEFAULT_FILTERS = {
    status: 'pending',
    targetType: '',
    targetId: '',
    reporterId: '',
    from: '',
    to: '',
};

function targetPath(targetType, targetId) {
    return targetType === 'channel' ? `/Owner/Channels/${targetId}` : `/Owner/Files/${targetId}`;
}

export default function Reports() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialFilters = useMemo(() => {
        const statusParam = searchParams.get('status');
        const targetTypeParam = searchParams.get('targetType');
        return {
            status: VALID_STATUSES.has(statusParam) ? statusParam : 'pending',
            targetType: VALID_TARGET_TYPES.has(targetTypeParam) ? targetTypeParam : '',
            targetId: searchParams.get('targetId') || '',
            reporterId: searchParams.get('reporterId') || '',
            from: searchParams.get('from') || '',
            to: searchParams.get('to') || '',
        };
    }, [searchParams]);

    const {
        rows,
        meta,
        setPage,
        filters,
        setFilter,
        resetFilters,
        isLoading,
        error,
        refetch,
    } = useAdminList('staff:reports', moderationAdmin.listReports, {
        initialFilters,
        defaultFilters: DEFAULT_FILTERS,
        limit: 20,
    });

    const handleReset = () => {
        setSearchParams({}, { replace: true });
        resetFilters();
    };

    const filterFields = useMemo(
        () => [
            {
                key: 'status',
                label: t('staffCommon.status'),
                type: 'select',
                required: true,
                options: [
                    { value: 'pending', label: t('staffReports.statuses.pending') },
                    { value: 'in_review', label: t('staffReports.statuses.in_review') },
                    { value: 'resolved', label: t('staffReports.statuses.resolved') },
                    { value: 'dismissed', label: t('staffReports.statuses.dismissed') },
                    { value: 'all', label: t('staffReports.statuses.all') },
                ],
            },
            {
                key: 'targetType',
                label: t('staffReports.targetType'),
                type: 'select',
                options: [
                    { value: 'file', label: t('staffReports.targetTypes.file') },
                    { value: 'channel', label: t('staffReports.targetTypes.channel') },
                ],
            },
            {
                key: 'targetId',
                label: t('staffReports.targetId'),
                type: 'text',
                placeholder: t('staffReports.targetIdPlaceholder'),
            },
            {
                key: 'reporterId',
                label: t('staffReports.reporterId'),
                type: 'text',
                placeholder: t('staffReports.reporterIdPlaceholder'),
            },
            {
                key: 'from',
                label: t('staffCommon.from'),
                type: 'date',
            },
            {
                key: 'to',
                label: t('staffCommon.to'),
                type: 'date',
            },
        ],
        [t],
    );

    const columns = useMemo(
        () => [
            {
                key: '_id',
                header: t('staffCommon.id'),
                render: (row) => (
                    <span className="moderation-mono" title={row._id}>
                        {shortId(row._id)}
                    </span>
                ),
            },
            {
                key: 'status',
                header: t('staffCommon.status'),
                render: (row) => (
                    <StatusBadge tone={REPORT_STATUS_TONES[row.status] || 'neutral'}>
                        {t(`staffReports.statuses.${row.status}`)}
                    </StatusBadge>
                ),
            },
            {
                key: 'targetType',
                header: t('staffReports.targetType'),
                render: (row) => (
                    <StatusBadge tone={row.targetType === 'channel' ? 'info' : 'neutral'}>
                        {t(`staffReports.targetTypes.${row.targetType}`)}
                    </StatusBadge>
                ),
            },
            {
                key: 'targetId',
                header: t('staffReports.targetId'),
                render: (row) =>
                    row.targetId ? (
                        <Link
                            to={targetPath(row.targetType, row.targetId)}
                            className="moderation-link moderation-mono"
                            title={row.targetId}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {shortId(row.targetId)}
                        </Link>
                    ) : (
                        '—'
                    ),
            },
            {
                key: 'reporterId',
                header: t('staffReports.reporter'),
                render: (row) =>
                    row.reporterId ? (
                        <Link
                            to={`/Owner/Users/${row.reporterId}`}
                            className="moderation-link moderation-mono"
                            title={row.reporterId}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {shortId(row.reporterId)}
                        </Link>
                    ) : (
                        '—'
                    ),
            },
            {
                key: 'createdAt',
                header: t('staffCommon.createdAt'),
                render: (row) => formatDate(row.createdAt, language),
            },
            {
                key: 'reviewedAt',
                header: t('staffReports.reviewedAt'),
                render: (row) => formatDate(row.reviewedAt, language),
            },
            {
                key: 'actions',
                header: t('staffCommon.actions'),
                render: (row) => (
                    <Link
                        to={`/Owner/Reports/${row._id}`}
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {t('staffCommon.view')}
                    </Link>
                ),
            },
        ],
        [t, language],
    );

    return (
        <AdminPage
            icon={MdFlag}
            title={t('staffReports.title')}
            subtitle={t('staffReports.subtitle')}
        >
            <FilterBar
                fields={filterFields}
                values={filters}
                onChange={setFilter}
                onReset={handleReset}
            />
            <AdminTable
                title={t('staffReports.queueTitle')}
                columns={columns}
                rows={rows}
                loading={isLoading}
                error={error}
                onRetry={refetch}
                emptyMessage={t('staffReports.empty')}
                onRowClick={(row) => navigate(`/Owner/Reports/${row._id}`)}
                meta={meta}
                onPageChange={setPage}
            />
        </AdminPage>
    );
}
