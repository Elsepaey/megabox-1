import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { MdStorage } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import storageAdmin from '../../../services/admin/storageAdmin';
import {
    AdminCard,
    AdminPage,
    ErrorState,
    LoadingState,
    ReasonModal,
    StatTile,
} from '../_shared/AdminUI';
import useStaffRole from '../_shared/useStaffRole';
import { formatMb, formatNumber } from '../_shared/formatters';

function parseQuotaMb(raw) {
    if (raw === '' || raw === null || raw === undefined) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) return null;
    return value;
}

export default function Storage() {
    const { t, language } = useLanguage();
    const { isOwner } = useStaffRole();
    const queryClient = useQueryClient();

    const [allQuotaInput, setAllQuotaInput] = useState('');
    const [freeQuotaInput, setFreeQuotaInput] = useState('');
    const [confirmTarget, setConfirmTarget] = useState(null); // { scope: 'all'|'free', quota: number }
    const [lastResult, setLastResult] = useState({ all: null, free: null });

    const { data, isLoading, error, refetch } = useQuery(
        'staff:storage:stats',
        storageAdmin.getStats,
        { retry: false, refetchOnWindowFocus: false },
    );

    const bulkMutation = useMutation(
        ({ scope, quota }) => (
            scope === 'all'
                ? storageAdmin.updateAllUsersSpace(quota)
                : storageAdmin.updateFreeUsersSpace(quota)
        ),
        {
            onSuccess: (res, { scope, quota }) => {
                const count = res?.modifiedCount ?? 0;
                const appliedQuota = res?.free_storage_quota_mb ?? quota;
                setLastResult((prev) => ({
                    ...prev,
                    [scope]: { count, quota: appliedQuota },
                }));
                toast.success(
                    t('staffStorage.bulk.updatedResult', {
                        count: formatNumber(count, language),
                        quota: formatNumber(appliedQuota, language),
                    }),
                    ToastOptions('success'),
                );
                setConfirmTarget(null);
                queryClient.invalidateQueries('staff:storage:stats');
            },
        },
    );

    const stats = data?.stats;
    const allQuota = parseQuotaMb(allQuotaInput);
    const freeQuota = parseQuotaMb(freeQuotaInput);

    const handleSubmit = (scope, parsedQuota) => (e) => {
        e.preventDefault();
        if (parsedQuota === null) {
            toast.error(t('staffStorage.bulk.invalidQuota'), ToastOptions('error'));
            return;
        }
        setConfirmTarget({ scope, quota: parsedQuota });
    };

    return (
        <AdminPage
            icon={MdStorage}
            title={t('staffStorage.title')}
            subtitle={t('staffStorage.subtitle')}
        >
            {isLoading && <LoadingState />}
            {!isLoading && error && <ErrorState error={error} onRetry={refetch} />}
            {!isLoading && !error && stats && (
                <div className="admin-stat-grid">
                    <StatTile
                        label={t('staffStorage.stats.totalFiles')}
                        value={formatNumber(stats.totalFiles, language)}
                    />
                    <StatTile
                        label={t('staffStorage.stats.completedFiles')}
                        value={formatNumber(stats.completedFiles, language)}
                    />
                    <StatTile
                        label={t('staffStorage.stats.totalFolders')}
                        value={formatNumber(stats.totalFolders, language)}
                    />
                    <StatTile
                        label={t('staffStorage.stats.sharedFiles')}
                        value={formatNumber(stats.sharedFiles, language)}
                    />
                    <StatTile
                        label={t('staffStorage.stats.uniqueSharedUsers')}
                        value={formatNumber(stats.uniqueSharedUsers, language)}
                    />
                    <StatTile
                        label={t('staffStorage.stats.totalUsedSpace')}
                        value={formatMb(stats.totalUsedSpaceMB)}
                    />
                </div>
            )}

            {isOwner && (
                <AdminCard title={t('staffStorage.bulk.title')}>
                    <div className="admin-form-grid">
                        <form className="admin-form" onSubmit={handleSubmit('all', allQuota)}>
                            <div>
                                <strong>{t('staffStorage.bulk.allTitle')}</strong>
                                <p className="admin-modal__description">
                                    {t('staffStorage.bulk.allDescription')}
                                </p>
                            </div>
                            <label className="admin-field">
                                <span className="admin-field__label">
                                    {t('staffStorage.bulk.quotaLabel')}
                                </span>
                                <input
                                    className="admin-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={allQuotaInput}
                                    onChange={(e) => setAllQuotaInput(e.target.value)}
                                    required
                                />
                            </label>
                            <div>
                                <button
                                    type="submit"
                                    className="admin-btn admin-btn--primary"
                                    disabled={allQuota === null || bulkMutation.isLoading}
                                >
                                    {t('staffStorage.bulk.applyAll')}
                                </button>
                            </div>
                            {lastResult.all && (
                                <p className="admin-modal__description">
                                    {t('staffStorage.bulk.updatedResult', {
                                        count: formatNumber(lastResult.all.count, language),
                                        quota: formatNumber(lastResult.all.quota, language),
                                    })}
                                </p>
                            )}
                        </form>

                        <form className="admin-form" onSubmit={handleSubmit('free', freeQuota)}>
                            <div>
                                <strong>{t('staffStorage.bulk.freeTitle')}</strong>
                                <p className="admin-modal__description">
                                    {t('staffStorage.bulk.freeDescription')}
                                </p>
                            </div>
                            <label className="admin-field">
                                <span className="admin-field__label">
                                    {t('staffStorage.bulk.quotaLabel')}
                                </span>
                                <input
                                    className="admin-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={freeQuotaInput}
                                    onChange={(e) => setFreeQuotaInput(e.target.value)}
                                    required
                                />
                            </label>
                            <div>
                                <button
                                    type="submit"
                                    className="admin-btn admin-btn--primary"
                                    disabled={freeQuota === null || bulkMutation.isLoading}
                                >
                                    {t('staffStorage.bulk.applyFree')}
                                </button>
                            </div>
                            {lastResult.free && (
                                <p className="admin-modal__description">
                                    {t('staffStorage.bulk.updatedResult', {
                                        count: formatNumber(lastResult.free.count, language),
                                        quota: formatNumber(lastResult.free.quota, language),
                                    })}
                                </p>
                            )}
                        </form>
                    </div>
                </AdminCard>
            )}

            <ReasonModal
                open={Boolean(confirmTarget)}
                title={
                    confirmTarget?.scope === 'all'
                        ? t('staffStorage.bulk.confirmAllTitle')
                        : t('staffStorage.bulk.confirmFreeTitle')
                }
                description={
                    confirmTarget
                        ? t(
                            confirmTarget.scope === 'all'
                                ? 'staffStorage.bulk.confirmAllDescription'
                                : 'staffStorage.bulk.confirmFreeDescription',
                            { quota: formatNumber(confirmTarget.quota, language) },
                        )
                        : ''
                }
                confirmLabel={t('staffCommon.confirm')}
                hideReason
                onClose={() => setConfirmTarget(null)}
                onConfirm={() => bulkMutation.mutateAsync(confirmTarget)}
            />
        </AdminPage>
    );
}
