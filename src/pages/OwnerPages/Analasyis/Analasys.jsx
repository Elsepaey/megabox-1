import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FaChartBar, FaUsers, FaFlag, FaMoneyBillWave } from 'react-icons/fa';
import { useLanguage } from '../../../context/LanguageContext';
import analyticsAdmin from '../../../services/admin/analyticsAdmin';
import {
    AdminCard,
    AdminPage,
    ErrorState,
    LoadingState,
    StatTile,
} from '../_shared/AdminUI';
import {
    formatDay,
    formatMb,
    formatNumber,
    todayIso,
} from '../_shared/formatters';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const MAX_RANGE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function defaultRange() {
    return {
        from: todayIso(-29),
        to: todayIso(1),
        fileId: '',
        ownerId: '',
    };
}

function validateRange(form, t) {
    if (!form.from || !form.to) return t('staffAnalytics.invalidRangeRequired');
    const fromMs = Date.parse(`${form.from}T00:00:00Z`);
    const toMs = Date.parse(`${form.to}T00:00:00Z`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) {
        return t('staffAnalytics.invalidRangeOrder');
    }
    if ((toMs - fromMs) / MS_PER_DAY > MAX_RANGE_DAYS) {
        return t('staffAnalytics.invalidRangeMax');
    }
    const trimmedFileId = form.fileId.trim();
    if (trimmedFileId && !OBJECT_ID_RE.test(trimmedFileId)) {
        return `${t('staffAnalytics.fileId')}: ${t('staffAnalytics.invalidObjectId')}`;
    }
    const trimmedOwnerId = form.ownerId.trim();
    if (trimmedOwnerId && !OBJECT_ID_RE.test(trimmedOwnerId)) {
        return `${t('staffAnalytics.ownerId')}: ${t('staffAnalytics.invalidObjectId')}`;
    }
    return null;
}

export default function Analasys() {
    const { t, language } = useLanguage();
    const [form, setForm] = useState(defaultRange);
    const [applied, setApplied] = useState(defaultRange);
    const [formError, setFormError] = useState(null);

    const userStatsQuery = useQuery(
        ['staff:analytics:userStats'],
        analyticsAdmin.getUserStats,
        { retry: false, refetchOnWindowFocus: false },
    );

    const storageStatsQuery = useQuery(
        ['staff:analytics:storageStats'],
        analyticsAdmin.getStorageStats,
        { retry: false, refetchOnWindowFocus: false },
    );

    const summaryParams = useMemo(
        () => ({
            from: applied.from,
            to: applied.to,
            fileId: applied.fileId.trim(),
            ownerId: applied.ownerId.trim(),
        }),
        [applied],
    );

    const summaryQuery = useQuery(
        ['staff:analytics:summary', summaryParams],
        () => analyticsAdmin.getSummary(summaryParams),
        { retry: false, refetchOnWindowFocus: false, keepPreviousData: true },
    );

    const userStats = userStatsQuery.data?.data;
    const storageStats = storageStatsQuery.data?.stats;
    const summary = summaryQuery.data;

    const handleSubmit = (event) => {
        event.preventDefault();
        const error = validateRange(form, t);
        setFormError(error);
        if (!error) {
            setApplied({ ...form });
        }
    };

    const handleReset = () => {
        const next = defaultRange();
        setForm(next);
        setApplied(next);
        setFormError(null);
    };

    return (
        <AdminPage
            icon={FaChartBar}
            title={t('staffAnalytics.title')}
            subtitle={t('staffAnalytics.subtitle')}
            actions={
                <>
                    <Link to="/Owner/Users" className="admin-btn admin-btn--secondary admin-btn--sm">
                        <FaUsers /> {t('staffAnalytics.manageUsers')}
                    </Link>
                    <Link to="/Owner/Reports" className="admin-btn admin-btn--secondary admin-btn--sm">
                        <FaFlag /> {t('staffAnalytics.reviewReports')}
                    </Link>
                    <Link to="/Owner/Withdrawals" className="admin-btn admin-btn--primary admin-btn--sm">
                        <FaMoneyBillWave /> {t('staffAnalytics.processWithdrawals')}
                    </Link>
                </>
            }
        >
            <AdminCard title={t('staffAnalytics.usersSection')}>
                {userStatsQuery.isLoading ? (
                    <LoadingState />
                ) : userStatsQuery.error ? (
                    <ErrorState error={userStatsQuery.error} onRetry={userStatsQuery.refetch} />
                ) : (
                    <div className="admin-stat-grid">
                        <StatTile
                            label={t('staffAnalytics.totalUsers')}
                            value={formatNumber(userStats?.totalUsers, language)}
                        />
                        <StatTile
                            label={t('staffAnalytics.newUsers30d')}
                            value={formatNumber(userStats?.usersLast30Days, language)}
                        />
                        <StatTile
                            label={t('staffAnalytics.promotersCount')}
                            value={formatNumber(userStats?.promotersCount, language)}
                        />
                        <StatTile
                            label={t('staffAnalytics.premiumUsers')}
                            value={formatNumber(userStats?.brimumeCount, language)}
                        />
                    </div>
                )}
            </AdminCard>

            <AdminCard title={t('staffAnalytics.storageSection')}>
                {storageStatsQuery.isLoading ? (
                    <LoadingState />
                ) : storageStatsQuery.error ? (
                    <ErrorState error={storageStatsQuery.error} onRetry={storageStatsQuery.refetch} />
                ) : (
                    <div className="admin-stat-grid">
                        <StatTile
                            label={t('staffAnalytics.totalFiles')}
                            value={formatNumber(storageStats?.totalFiles, language)}
                        />
                        <StatTile
                            label={t('staffAnalytics.completedFiles')}
                            value={formatNumber(storageStats?.completedFiles, language)}
                        />
                        <StatTile
                            label={t('staffAnalytics.totalFolders')}
                            value={formatNumber(storageStats?.totalFolders, language)}
                        />
                        <StatTile
                            label={t('staffAnalytics.sharedFiles')}
                            value={formatNumber(storageStats?.sharedFiles, language)}
                        />
                        <StatTile
                            label={t('staffAnalytics.uniqueSharedUsers')}
                            value={formatNumber(storageStats?.uniqueSharedUsers, language)}
                        />
                        <StatTile
                            label={t('staffAnalytics.totalUsedSpace')}
                            value={formatMb(storageStats?.totalUsedSpaceMB)}
                        />
                    </div>
                )}
            </AdminCard>

            <AdminCard
                title={t('staffAnalytics.rangeTitle')}
                actions={
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={handleReset}
                    >
                        {t('staffAnalytics.resetRange')}
                    </button>
                }
            >
                <form className="admin-form" onSubmit={handleSubmit}>
                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffAnalytics.from')}</span>
                            <input
                                type="date"
                                className="admin-input"
                                value={form.from}
                                onChange={(e) => setForm((prev) => ({ ...prev, from: e.target.value }))}
                                required
                            />
                        </label>
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffAnalytics.to')}</span>
                            <input
                                type="date"
                                className="admin-input"
                                value={form.to}
                                onChange={(e) => setForm((prev) => ({ ...prev, to: e.target.value }))}
                                required
                            />
                        </label>
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffAnalytics.fileId')}</span>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder={t('staffAnalytics.idPlaceholder')}
                                value={form.fileId}
                                onChange={(e) => setForm((prev) => ({ ...prev, fileId: e.target.value }))}
                            />
                        </label>
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffAnalytics.ownerId')}</span>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder={t('staffAnalytics.idPlaceholder')}
                                value={form.ownerId}
                                onChange={(e) => setForm((prev) => ({ ...prev, ownerId: e.target.value }))}
                            />
                        </label>
                    </div>

                    {formError && <p className="admin-field__error">{formError}</p>}

                    <div>
                        <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
                            {t('staffAnalytics.apply')}
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: '1.25rem' }}>
                    {summaryQuery.isLoading ? (
                        <LoadingState />
                    ) : summaryQuery.error ? (
                        <ErrorState error={summaryQuery.error} onRetry={summaryQuery.refetch} />
                    ) : (
                        <>
                            <div className="admin-stat-grid">
                                <StatTile
                                    label={t('staffAnalytics.views')}
                                    value={formatNumber(summary?.totals?.views, language)}
                                    hint={
                                        summary?.from && summary?.to
                                            ? t('staffAnalytics.resolvedRange', {
                                                  from: formatDay(summary.from, language),
                                                  to: formatDay(summary.to, language),
                                              })
                                            : undefined
                                    }
                                />
                                <StatTile
                                    label={t('staffAnalytics.downloads')}
                                    value={formatNumber(summary?.totals?.downloads, language)}
                                    hint={
                                        summary?.from && summary?.to
                                            ? t('staffAnalytics.resolvedRange', {
                                                  from: formatDay(summary.from, language),
                                                  to: formatDay(summary.to, language),
                                              })
                                            : undefined
                                    }
                                />
                            </div>
                            <p className="admin-field__hint" style={{ alignSelf: 'flex-start', margin: 0 }}>
                                {t('staffAnalytics.viewLogHint')}
                            </p>
                        </>
                    )}
                </div>
            </AdminCard>
        </AdminPage>
    );
}
