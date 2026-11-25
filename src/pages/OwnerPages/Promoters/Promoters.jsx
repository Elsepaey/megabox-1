import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBullhorn } from 'react-icons/fa';
import { useLanguage } from '../../../context/LanguageContext';
import promotersAdmin from '../../../services/admin/promotersAdmin';
import {
    AdminPage,
    AdminTable,
    FilterBar,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate, shortId } from '../_shared/formatters';

const INITIAL_FILTERS = {
    userId: '',
    username: '',
    promoterCode: '',
    plan: '',
    from: '',
    to: '',
};

export default function Promoters() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();

    const list = useAdminList('staff:promoters', promotersAdmin.list, {
        initialFilters: INITIAL_FILTERS,
        limit: 20,
    });

    const filterFields = [
        { key: 'userId', label: t('staffPromoters.userId'), type: 'text' },
        {
            key: 'username',
            label: t('staffPromoters.username'),
            type: 'text',
            placeholder: t('staffPromoters.usernamePlaceholder'),
        },
        {
            key: 'promoterCode',
            label: t('staffPromoters.promoterCode'),
            type: 'text',
            placeholder: t('staffPromoters.promoterCodePlaceholder'),
        },
        {
            key: 'plan',
            label: t('staffPromoters.plan'),
            type: 'select',
            options: [
                { value: 'views', label: t('staffPromoters.planViews') },
                { value: 'installs', label: t('staffPromoters.planInstalls') },
            ],
        },
        { key: 'from', label: t('staffPromoters.joinedFrom'), type: 'date' },
        { key: 'to', label: t('staffPromoters.joinedTo'), type: 'date' },
    ];

    const planLabel = (plan) => {
        if (plan === 'views') return t('staffPromoters.planViews');
        if (plan === 'installs') return t('staffPromoters.planInstalls');
        return '—';
    };

    const columns = [
        {
            key: 'username',
            header: t('staffPromoters.username'),
            render: (row) => row.username || '—',
        },
        {
            key: 'userId',
            header: t('staffPromoters.userId'),
            render: (row) => <span title={row.userId}>{shortId(row.userId)}</span>,
        },
        {
            key: 'promoterCode',
            header: t('staffPromoters.promoterCode'),
            render: (row) => row.promoterCode || '—',
        },
        {
            key: 'plan',
            header: t('staffPromoters.plan'),
            render: (row) =>
                row.plan ? (
                    <StatusBadge tone={row.plan === 'installs' ? 'info' : 'success'}>
                        {planLabel(row.plan)}
                    </StatusBadge>
                ) : (
                    '—'
                ),
        },
        {
            key: 'joinedAt',
            header: t('staffPromoters.joinedAt'),
            render: (row) => formatDate(row.joinedAt, language),
        },
        {
            key: 'actions',
            header: t('staffCommon.actions'),
            render: (row) => (
                <div
                    style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Link
                        to={`/Owner/Promoter/${row.userId}`}
                        className="admin-btn admin-btn--primary admin-btn--sm"
                    >
                        {t('staffPromoters.viewDetail')}
                    </Link>
                    <Link
                        to={`/Owner/Users/${row.userId}`}
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                    >
                        {t('staffPromoters.openUser')}
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <AdminPage
            icon={FaBullhorn}
            title={t('staffPromoters.title')}
            subtitle={t('staffPromoters.subtitle')}
        >
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={list.resetFilters}
            />
            <AdminTable
                title={t('staffPromoters.title')}
                columns={columns}
                rows={list.rows}
                rowKey="userId"
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                meta={list.meta}
                onPageChange={list.setPage}
                onRowClick={(row) => navigate(`/Owner/Promoter/${row.userId}`)}
            />
        </AdminPage>
    );
}
