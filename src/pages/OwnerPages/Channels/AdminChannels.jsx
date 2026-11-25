import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MdSubscriptions } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { contentAdmin } from '../../../services/admin/contentAdmin';
import { AdminPage, AdminTable, FilterBar, StatusBadge } from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate, formatNumber, shortId } from '../_shared/formatters';

const DEFAULT_FILTERS = {
    ownerId: '',
    name: '',
    visibility: '',
    type: '',
    status: '',
};

export default function AdminChannels() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialFilters = {
        ownerId: searchParams.get('ownerId') || '',
        name: searchParams.get('name') || '',
        visibility: searchParams.get('visibility') || '',
        type: searchParams.get('type') || '',
        status: searchParams.get('status') || '',
    };

    const list = useAdminList('staff:channels', contentAdmin.listChannels, {
        initialFilters,
        defaultFilters: DEFAULT_FILTERS,
    });

    const handleReset = () => {
        list.resetFilters();
        setSearchParams({}, { replace: true });
    };

    const filterFields = [
        {
            key: 'ownerId',
            label: t('staffChannels.ownerId'),
            type: 'text',
            placeholder: t('staffChannels.ownerIdPlaceholder'),
        },
        {
            key: 'name',
            label: t('staffChannels.name'),
            type: 'text',
            placeholder: t('staffChannels.namePlaceholder'),
        },
        {
            key: 'visibility',
            label: t('staffChannels.visibility'),
            type: 'select',
            options: [
                { value: 'public', label: t('staffChannels.visibilityPublic') },
                { value: 'private', label: t('staffChannels.visibilityPrivate') },
            ],
        },
        {
            key: 'type',
            label: t('staffChannels.type'),
            type: 'select',
            options: [
                { value: 'normal', label: t('staffChannels.typeNormal') },
                { value: 'premium', label: t('staffChannels.typePremium') },
            ],
        },
        {
            key: 'status',
            label: t('staffChannels.moderationStatus'),
            type: 'select',
            options: [
                { value: 'active', label: t('staffChannels.statusActive') },
                { value: 'suspended', label: t('staffChannels.statusSuspended') },
            ],
        },
    ];

    const columns = [
        { key: 'name', header: t('staffChannels.name') },
        {
            key: 'ownerId',
            header: t('staffCommon.owner'),
            render: (row) =>
                row.ownerId ? (
                    <Link
                        to={`/Owner/Users/${row.ownerId}`}
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        title={row.ownerId}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {shortId(row.ownerId)}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'visibility',
            header: t('staffChannels.visibility'),
            render: (row) => (
                <StatusBadge tone={row.visibility === 'public' ? 'info' : 'neutral'}>
                    {row.visibility === 'public'
                        ? t('staffChannels.visibilityPublic')
                        : row.visibility === 'private'
                          ? t('staffChannels.visibilityPrivate')
                          : row.visibility || '—'}
                </StatusBadge>
            ),
        },
        {
            key: 'type',
            header: t('staffChannels.type'),
            render: (row) => (
                <StatusBadge tone={row.type === 'premium' ? 'warning' : 'neutral'}>
                    {row.type === 'premium'
                        ? t('staffChannels.typePremium')
                        : row.type === 'normal'
                          ? t('staffChannels.typeNormal')
                          : row.type || '—'}
                </StatusBadge>
            ),
        },
        {
            key: 'moderationStatus',
            header: t('staffChannels.moderationStatus'),
            render: (row) => {
                const suspended = row.moderationStatus === 'suspended';
                return (
                    <StatusBadge tone={suspended ? 'danger' : 'success'}>
                        {suspended ? t('staffChannels.statusSuspended') : t('staffChannels.statusActive')}
                    </StatusBadge>
                );
            },
        },
        {
            key: 'subscriberCount',
            header: t('staffChannels.subscribers'),
            render: (row) => formatNumber(row.subscriberCount, language),
        },
        {
            key: 'createdAt',
            header: t('staffCommon.createdAt'),
            render: (row) => formatDate(row.createdAt, language),
        },
    ];

    return (
        <AdminPage icon={MdSubscriptions} title={t('staffChannels.title')} subtitle={t('staffChannels.subtitle')}>
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={handleReset}
            />
            <AdminTable
                title={t('staffChannels.tableTitle')}
                columns={columns}
                rows={list.rows}
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                onRowClick={(row) => navigate(`/Owner/Channels/${row._id}`)}
                meta={list.meta}
                onPageChange={list.setPage}
            />
        </AdminPage>
    );
}
