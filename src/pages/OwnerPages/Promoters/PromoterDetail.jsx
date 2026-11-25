import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FaBullhorn, FaShareAlt, FaUser } from 'react-icons/fa';
import { useLanguage } from '../../../context/LanguageContext';
import promotersAdmin from '../../../services/admin/promotersAdmin';
import {
    AdminCard,
    AdminPage,
    AdminTable,
    DetailList,
    ErrorState,
    LoadingState,
    StatTile,
    StatusBadge,
} from '../_shared/AdminUI';
import { formatDate, formatNumber } from '../_shared/formatters';

export default function PromoterDetail() {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const [earningsPage, setEarningsPage] = useState(1);

    const detailQuery = useQuery(
        ['staff:promoter', id],
        () => promotersAdmin.get(id),
        { enabled: Boolean(id), retry: false, refetchOnWindowFocus: false },
    );

    const earningsQuery = useQuery(
        ['staff:promoter:earnings', id, earningsPage],
        () => promotersAdmin.getEarnings(id, { page: earningsPage, limit: 20 }),
        {
            enabled: Boolean(id),
            keepPreviousData: true,
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const promoter = detailQuery.data;
    const activity = promoter?.activity;
    const earningsTotals = earningsQuery.data?.totals;
    const earningsRows = earningsQuery.data?.data ?? [];
    const earningsMeta = earningsQuery.data?.meta;

    const planLabel = (plan) => {
        if (plan === 'views') return t('staffPromoters.planViews');
        if (plan === 'installs') return t('staffPromoters.planInstalls');
        return null;
    };

    const earningsColumns = [
        {
            key: 'fileName',
            header: t('staffPromoters.fileName'),
            render: (row) => (
                <Link to={`/Owner/Files/${row.fileId}`} className="admin-btn admin-btn--ghost admin-btn--sm">
                    {row.fileName || row.fileId}
                </Link>
            ),
        },
        {
            key: 'totalEarnings',
            header: t('staffPromoters.totalEarnings'),
            render: (row) => formatNumber(row.totalEarnings, language),
        },
        {
            key: 'pendingRewards',
            header: t('staffPromoters.pendingRewards'),
            render: (row) => formatNumber(row.pendingRewards, language),
        },
        {
            key: 'confirmedRewards',
            header: t('staffPromoters.confirmedRewards'),
            render: (row) => formatNumber(row.confirmedRewards, language),
        },
        {
            key: 'lastUpdated',
            header: t('staffPromoters.lastUpdated'),
            render: (row) => formatDate(row.lastUpdated, language),
        },
    ];

    return (
        <AdminPage
            icon={FaBullhorn}
            title={promoter?.username || t('staffPromoters.detailTitle')}
            subtitle={t('staffPromoters.detailSubtitle')}
            actions={
                <>
                    <Link to="/Owner/AllPromoters" className="admin-btn admin-btn--secondary admin-btn--sm">
                        {t('staffCommon.back')}
                    </Link>
                    <Link to={`/Owner/Users/${id}`} className="admin-btn admin-btn--secondary admin-btn--sm">
                        <FaUser /> {t('staffPromoters.openUser')}
                    </Link>
                    <Link
                        to={`/Owner/Shares?sharedBy=${id}`}
                        className="admin-btn admin-btn--primary admin-btn--sm"
                    >
                        <FaShareAlt /> {t('staffPromoters.openShares')}
                    </Link>
                </>
            }
        >
            <AdminCard title={t('staffPromoters.enrollmentCard')}>
                {detailQuery.isLoading ? (
                    <LoadingState />
                ) : detailQuery.error ? (
                    <ErrorState error={detailQuery.error} onRetry={detailQuery.refetch} />
                ) : (
                    <DetailList
                        items={[
                            { label: t('staffPromoters.userId'), value: promoter?.userId },
                            { label: t('staffPromoters.username'), value: promoter?.username },
                            { label: t('staffPromoters.promoterCode'), value: promoter?.promoterCode },
                            {
                                label: t('staffPromoters.plan'),
                                value: promoter?.plan ? (
                                    <StatusBadge tone={promoter.plan === 'installs' ? 'info' : 'success'}>
                                        {planLabel(promoter.plan)}
                                    </StatusBadge>
                                ) : null,
                            },
                            {
                                label: t('staffPromoters.joinedAt'),
                                value: formatDate(promoter?.joinedAt, language),
                            },
                        ]}
                    />
                )}
            </AdminCard>

            {promoter && (
                <AdminCard title={t('staffPromoters.activityCard')}>
                    <div className="admin-stat-grid">
                        <StatTile
                            label={t('staffPromoters.totalShares')}
                            value={formatNumber(activity?.totalShares, language)}
                        />
                        <StatTile
                            label={t('staffPromoters.activeShares')}
                            value={formatNumber(activity?.activeShares, language)}
                        />
                        <StatTile
                            label={t('staffPromoters.inactiveShares')}
                            value={formatNumber(activity?.inactiveShares, language)}
                        />
                        <StatTile
                            label={t('staffPromoters.views')}
                            value={formatNumber(activity?.views, language)}
                        />
                        <StatTile
                            label={t('staffPromoters.installs')}
                            value={formatNumber(activity?.installs, language)}
                        />
                    </div>
                </AdminCard>
            )}

            <AdminCard title={t('staffPromoters.earningsCard')}>
                {earningsQuery.isLoading ? (
                    <LoadingState />
                ) : earningsQuery.error ? (
                    <ErrorState error={earningsQuery.error} onRetry={earningsQuery.refetch} />
                ) : (
                    <div className="admin-stat-grid" style={{ marginBottom: 0 }}>
                        <StatTile
                            label={t('staffPromoters.totalEarnings')}
                            value={formatNumber(earningsTotals?.totalEarnings, language)}
                        />
                        <StatTile
                            label={t('staffPromoters.pendingRewards')}
                            value={formatNumber(earningsTotals?.pendingRewards, language)}
                        />
                        <StatTile
                            label={t('staffPromoters.confirmedRewards')}
                            value={formatNumber(earningsTotals?.confirmedRewards, language)}
                        />
                    </div>
                )}
            </AdminCard>

            <AdminTable
                title={t('staffPromoters.earningsCard')}
                columns={earningsColumns}
                rows={earningsRows}
                rowKey="fileId"
                loading={earningsQuery.isLoading}
                error={earningsQuery.error}
                onRetry={earningsQuery.refetch}
                emptyMessage={t('staffPromoters.noEarnings')}
                meta={earningsMeta}
                onPageChange={setEarningsPage}
            />
        </AdminPage>
    );
}
