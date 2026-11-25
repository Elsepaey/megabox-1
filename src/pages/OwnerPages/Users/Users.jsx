import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdNotifications, MdPeople } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import usersAdmin from '../../../services/admin/usersAdmin';
import { AdminPage, AdminTable, FilterBar, StatusBadge } from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate, shortId } from '../_shared/formatters';

const INITIAL_FILTERS = {
    search: '',
    role: '',
    status: '',
    isConfirmed: '',
    isPromoter: '',
    isPremium: '',
};

function resolveAccountStatus(user) {
    if (user?.isDeleted) return { key: 'deleted', tone: 'danger' };
    if (user?.isBanned) return { key: 'banned', tone: 'danger' };
    if (user?.isclosed) return { key: 'closed', tone: 'warning' };
    return { key: 'active', tone: 'success' };
}

function roleTone(role) {
    if (role === 'Owner') return 'info';
    if (role === 'Admin') return 'warning';
    return 'neutral';
}

export default function Users() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();

    const list = useAdminList('staff:users', usersAdmin.list, {
        initialFilters: INITIAL_FILTERS,
        limit: 20,
    });

    const filterFields = useMemo(
        () => [
            {
                key: 'search',
                label: t('staffUsers.filters.search'),
                type: 'text',
                placeholder: t('staffUsers.searchPlaceholder'),
            },
            {
                key: 'role',
                label: t('staffUsers.filters.role'),
                type: 'select',
                options: [
                    { value: 'User', label: t('staffUsers.roles.User') },
                    { value: 'Admin', label: t('staffUsers.roles.Admin') },
                    { value: 'Owner', label: t('staffUsers.roles.Owner') },
                ],
            },
            {
                key: 'status',
                label: t('staffUsers.filters.status'),
                type: 'select',
                options: [
                    { value: 'active', label: t('staffUsers.statuses.active') },
                    { value: 'banned', label: t('staffUsers.statuses.banned') },
                    { value: 'closed', label: t('staffUsers.statuses.closed') },
                    { value: 'deleted', label: t('staffUsers.statuses.deleted') },
                ],
            },
            {
                key: 'isConfirmed',
                label: t('staffUsers.filters.confirmed'),
                type: 'select',
                options: [
                    { value: 'true', label: t('staffCommon.yes') },
                    { value: 'false', label: t('staffCommon.no') },
                ],
            },
            {
                key: 'isPromoter',
                label: t('staffUsers.filters.promoter'),
                type: 'select',
                options: [
                    { value: 'true', label: t('staffCommon.yes') },
                    { value: 'false', label: t('staffCommon.no') },
                ],
            },
            {
                key: 'isPremium',
                label: t('staffUsers.filters.premium'),
                type: 'select',
                options: [
                    { value: 'true', label: t('staffCommon.yes') },
                    { value: 'false', label: t('staffCommon.no') },
                ],
            },
        ],
        [t],
    );

    const columns = useMemo(
        () => [
            {
                key: 'username',
                header: t('staffUsers.columns.username'),
                render: (row) => (
                    <div>
                        <div>{row.username || '—'}</div>
                        <small style={{ opacity: 0.65 }}>{shortId(row._id)}</small>
                    </div>
                ),
            },
            {
                key: 'email',
                header: t('staffUsers.columns.email'),
                render: (row) => row.email || '—',
            },
            {
                key: 'role',
                header: t('staffUsers.columns.role'),
                render: (row) => {
                    const role = row.role || 'User';
                    return (
                        <StatusBadge tone={roleTone(role)}>
                            {t(`staffUsers.roles.${role}`)}
                        </StatusBadge>
                    );
                },
            },
            {
                key: 'status',
                header: t('staffUsers.columns.status'),
                render: (row) => {
                    const status = resolveAccountStatus(row);
                    return (
                        <StatusBadge tone={status.tone}>
                            {t(`staffUsers.statuses.${status.key}`)}
                        </StatusBadge>
                    );
                },
            },
            {
                key: 'isBrimume',
                header: t('staffUsers.columns.premium'),
                render: (row) => (
                    <StatusBadge tone={row.isBrimume ? 'info' : 'neutral'}>
                        {row.isBrimume ? t('staffCommon.yes') : t('staffCommon.no')}
                    </StatusBadge>
                ),
            },
            {
                key: 'isPromoter',
                header: t('staffUsers.columns.promoter'),
                render: (row) => (
                    <StatusBadge tone={row.isPromoter ? 'success' : 'neutral'}>
                        {row.isPromoter ? t('staffCommon.yes') : t('staffCommon.no')}
                    </StatusBadge>
                ),
            },
            {
                key: 'createdAt',
                header: t('staffUsers.columns.created'),
                render: (row) => formatDate(row.createdAt, language),
            },
        ],
        [t, language],
    );

    return (
        <AdminPage
            icon={MdPeople}
            title={t('staffUsers.title')}
            subtitle={t('staffUsers.subtitle')}
            actions={(
                <Link to="/Owner/Notifications" className="admin-btn admin-btn--secondary">
                    <MdNotifications size={18} />
                    <span>{t('staffUsers.notificationsLink')}</span>
                </Link>
            )}
        >
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={list.resetFilters}
            />

            <AdminTable
                title={t('staffUsers.listTitle')}
                columns={columns}
                rows={list.rows}
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                meta={list.meta}
                onPageChange={list.setPage}
                onRowClick={(row) => navigate(`/Owner/Users/${row._id}`)}
            />
        </AdminPage>
    );
}
