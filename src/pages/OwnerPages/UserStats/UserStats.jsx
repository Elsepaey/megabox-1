import React from 'react';
import { useQuery } from 'react-query';
import { MdBarChart } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import usersAdmin from '../../../services/admin/usersAdmin';
import { AdminPage, ErrorState, LoadingState, StatTile } from '../_shared/AdminUI';
import { formatNumber } from '../_shared/formatters';

export default function UserStats() {
    const { t, language } = useLanguage();

    const { data, isLoading, error, refetch } = useQuery(
        'staff:users:stats',
        usersAdmin.getStats,
        { retry: false, refetchOnWindowFocus: false },
    );

    const stats = data?.data;

    return (
        <AdminPage
            icon={MdBarChart}
            title={t('staffUsers.stats.title')}
            subtitle={t('staffUsers.stats.subtitle')}
        >
            {isLoading && <LoadingState />}
            {!isLoading && error && <ErrorState error={error} onRetry={refetch} />}
            {!isLoading && !error && stats && (
                <div className="admin-stat-grid">
                    <StatTile
                        label={t('staffUsers.stats.totalUsers')}
                        value={formatNumber(stats.totalUsers, language)}
                    />
                    <StatTile
                        label={t('staffUsers.stats.usersLast30Days')}
                        value={formatNumber(stats.usersLast30Days, language)}
                    />
                    <StatTile
                        label={t('staffUsers.stats.promotersCount')}
                        value={formatNumber(stats.promotersCount, language)}
                    />
                    <StatTile
                        label={t('staffUsers.stats.premiumCount')}
                        value={formatNumber(stats.brimumeCount, language)}
                    />
                </div>
            )}
        </AdminPage>
    );
}
