import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { MdHistory, MdPublish, MdSettings } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import { appConfigAdmin } from '../../../services/admin/appConfigAdmin';
import {
    AdminCard,
    AdminPage,
    AdminTable,
    EmptyState,
    ErrorState,
    LoadingState,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate } from '../_shared/formatters';
import { APP_PLATFORMS, compareParsedVersions, parseAppVersion } from './compareAppVersions';

// Mirrors Mega-Box-backend UpdateAppLinksDto (https://, no creds, no whitespace/control/backslash)
function isValidHttpsUrl(raw) {
    if (typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    if (!trimmed.toLowerCase().startsWith('https://')) return false;
    for (let i = 0; i < trimmed.length; i += 1) {
        const code = trimmed.charCodeAt(i);
        if (code <= 0x20 || code === 0x7f || trimmed[i] === '\\') return false;
    }
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'https:' && !parsed.username && !parsed.password && Boolean(parsed.hostname);
    } catch {
        return false;
    }
}

const EMPTY_PLATFORM = { android: '', ios: '', web: '' };

export default function AdminAppConfig() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    // Version form state
    const [maintenance, setMaintenance] = useState(false);
    const [minVersion, setMinVersion] = useState(EMPTY_PLATFORM);
    const [currentVersion, setCurrentVersion] = useState(EMPTY_PLATFORM);
    const [versionError, setVersionError] = useState('');
    const prefilledVersionRef = useRef(false);

    // App links form state
    const [linksForm, setLinksForm] = useState({ playStore: '', appStore: '', web: '' });
    const [linksError, setLinksError] = useState('');
    const prefilledLinksRef = useRef(false);

    const versionHistory = useAdminList(
        'staff:version-history',
        appConfigAdmin.listVersionHistory,
    );

    const appLinksQuery = useQuery(
        'staff:app-links',
        appConfigAdmin.getAppLinks,
        {
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const linksNotFound = apiErrorStatus(appLinksQuery.error) === 404;

    useEffect(() => {
        if (prefilledVersionRef.current || versionHistory.page !== 1 || versionHistory.isPreviousData || !versionHistory.rows.length) {
            return;
        }
        const activeRow = versionHistory.rows.find((r) => r.isActive) || versionHistory.rows[0];
        if (!activeRow) return;
        setMaintenance(Boolean(activeRow.maintenance));
        setMinVersion({
            android: activeRow.minVersion?.android || '',
            ios: activeRow.minVersion?.ios || '',
            web: activeRow.minVersion?.web || '',
        });
        setCurrentVersion({
            android: activeRow.currentVersion?.android || '',
            ios: activeRow.currentVersion?.ios || '',
            web: activeRow.currentVersion?.web || '',
        });
        prefilledVersionRef.current = true;
    }, [versionHistory.rows, versionHistory.page, versionHistory.isPreviousData]);

    useEffect(() => {
        if (prefilledLinksRef.current || !appLinksQuery.data) return;
        setLinksForm({
            playStore: appLinksQuery.data.playStore || '',
            appStore: appLinksQuery.data.appStore || '',
            web: appLinksQuery.data.web || '',
        });
        prefilledLinksRef.current = true;
    }, [appLinksQuery.data]);

    const publishVersionMutation = useMutation(
        (payload) => appConfigAdmin.publishVersion(payload, t('staffAppConfig.versionPublishFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffAppConfig.versionPublished'), ToastOptions('success'));
                setVersionError('');
                queryClient.invalidateQueries('staff:version-history');
            },
            onError: (error) => {
                if (apiErrorStatus(error) === 409) {
                    toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
                    prefilledVersionRef.current = false;
                    versionHistory.setPage(1);
                    queryClient.invalidateQueries('staff:version-history');
                }
            },
        },
    );

    const publishLinksMutation = useMutation(
        (payload) => appConfigAdmin.publishAppLinks(payload, t('staffAppConfig.linksPublishFailed')),
        {
            onSuccess: (data) => {
                toast.success(t('staffAppConfig.linksPublished'), ToastOptions('success'));
                setLinksError('');
                if (data) {
                    setLinksForm({
                        playStore: data.playStore || '',
                        appStore: data.appStore || '',
                        web: data.web || '',
                    });
                }
                queryClient.invalidateQueries('staff:app-links');
            },
            onError: (error) => {
                if (apiErrorStatus(error) === 409) {
                    toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
                    prefilledLinksRef.current = false;
                    queryClient.invalidateQueries('staff:app-links');
                }
            },
        },
    );

    const platformLabel = (platform) => {
        if (platform === 'android') return t('staffAppConfig.platformAndroid');
        if (platform === 'ios') return t('staffAppConfig.platformIos');
        return t('staffAppConfig.platformWeb');
    };

    const handlePublishVersion = (e) => {
        e.preventDefault();
        const normalizedMin = {};
        const normalizedCurrent = {};

        for (const platform of APP_PLATFORMS) {
            const pLabel = platformLabel(platform);
            const parsedMin = parseAppVersion(minVersion[platform]);
            if (!parsedMin) {
                setVersionError(
                    t('staffAppConfig.errVersionFormat', {
                        field: `${t('staffAppConfig.minVersionGroup')} (${pLabel})`,
                    }),
                );
                return;
            }
            const parsedCurrent = parseAppVersion(currentVersion[platform]);
            if (!parsedCurrent) {
                setVersionError(
                    t('staffAppConfig.errVersionFormat', {
                        field: `${t('staffAppConfig.currentVersionGroup')} (${pLabel})`,
                    }),
                );
                return;
            }
            if (compareParsedVersions(parsedMin, parsedCurrent) > 0) {
                setVersionError(t('staffAppConfig.errMinGtCurrent', { platform: pLabel }));
                return;
            }
            normalizedMin[platform] = parsedMin.text;
            normalizedCurrent[platform] = parsedCurrent.text;
        }

        setVersionError('');
        publishVersionMutation.mutate({
            maintenance: Boolean(maintenance),
            minVersion: normalizedMin,
            currentVersion: normalizedCurrent,
        });
    };

    const handleRestoreRow = (row) => {
        setMaintenance(Boolean(row.maintenance));
        setMinVersion({
            android: row.minVersion?.android || '',
            ios: row.minVersion?.ios || '',
            web: row.minVersion?.web || '',
        });
        setCurrentVersion({
            android: row.currentVersion?.android || '',
            ios: row.currentVersion?.ios || '',
            web: row.currentVersion?.web || '',
        });
        setVersionError('');
        toast.info(t('staffAppConfig.restoredNotice'), ToastOptions('info'));
    };

    const handlePublishLinks = (e) => {
        e.preventDefault();
        const fields = [
            { key: 'playStore', label: t('staffAppConfig.playStoreLabel') },
            { key: 'appStore', label: t('staffAppConfig.appStoreLabel') },
            { key: 'web', label: t('staffAppConfig.webLabel') },
        ];
        const payload = {};
        for (const field of fields) {
            const value = linksForm[field.key].trim();
            if (!isValidHttpsUrl(value)) {
                setLinksError(t('staffAppConfig.errHttpsUrl', { field: field.label }));
                return;
            }
            payload[field.key] = value;
        }
        setLinksError('');
        publishLinksMutation.mutate(payload);
    };

    const renderVersionSummary = (versions) => {
        if (!versions) return '—';
        return `A: ${versions.android || '—'} · iOS: ${versions.ios || '—'} · W: ${versions.web || '—'}`;
    };

    const historyColumns = [
        {
            key: 'publishedAt',
            header: t('staffAppConfig.colPublishedAt'),
            render: (row) => formatDate(row.publishedAt, language),
        },
        {
            key: 'maintenance',
            header: t('staffAppConfig.colMaintenance'),
            render: (row) => (
                <StatusBadge tone={row.maintenance ? 'danger' : 'success'}>
                    {row.maintenance ? t('staffAppConfig.maintenanceOn') : t('staffAppConfig.maintenanceOff')}
                </StatusBadge>
            ),
        },
        {
            key: 'minVersion',
            header: t('staffAppConfig.colMinVersion'),
            render: (row) => renderVersionSummary(row.minVersion),
        },
        {
            key: 'currentVersion',
            header: t('staffAppConfig.colCurrentVersion'),
            render: (row) => renderVersionSummary(row.currentVersion),
        },
        {
            key: 'isActive',
            header: t('staffAppConfig.colState'),
            render: (row) => (
                <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive ? t('staffAppConfig.active') : t('staffAppConfig.historical')}
                </StatusBadge>
            ),
        },
        {
            key: 'actions',
            header: t('staffCommon.actions'),
            render: (row) => (
                <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => handleRestoreRow(row)}
                >
                    <MdHistory size={15} />
                    {t('staffAppConfig.restore')}
                </button>
            ),
        },
    ];

    return (
        <AdminPage
            icon={MdSettings}
            title={t('staffAppConfig.title')}
            subtitle={t('staffAppConfig.subtitle')}
        >
            <AdminCard title={t('staffAppConfig.versionFormTitle')}>
                <form className="admin-form" onSubmit={handlePublishVersion}>
                    <div className="admin-field">
                        <label className="admin-field admin-field--checkbox">
                            <input
                                type="checkbox"
                                checked={maintenance}
                                onChange={(e) => setMaintenance(e.target.checked)}
                            />
                            <span>{t('staffAppConfig.maintenanceLabel')}</span>
                        </label>
                        <span className="admin-field__hint" style={{ alignSelf: 'flex-start' }}>
                            {t('staffAppConfig.maintenanceHint')}
                        </span>
                    </div>

                    <div className="admin-field">
                        <span className="admin-field__label">{t('staffAppConfig.minVersionGroup')}</span>
                        <div className="admin-form-grid">
                            {APP_PLATFORMS.map((platform) => (
                                <label key={`min-${platform}`} className="admin-field">
                                    <span className="admin-field__label">{platformLabel(platform)} *</span>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        value={minVersion[platform]}
                                        onChange={(e) =>
                                            setMinVersion((prev) => ({ ...prev, [platform]: e.target.value }))
                                        }
                                        placeholder={t('staffAppConfig.versionPlaceholder')}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="admin-field">
                        <span className="admin-field__label">{t('staffAppConfig.currentVersionGroup')}</span>
                        <div className="admin-form-grid">
                            {APP_PLATFORMS.map((platform) => (
                                <label key={`cur-${platform}`} className="admin-field">
                                    <span className="admin-field__label">{platformLabel(platform)} *</span>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        value={currentVersion[platform]}
                                        onChange={(e) =>
                                            setCurrentVersion((prev) => ({ ...prev, [platform]: e.target.value }))
                                        }
                                        placeholder={t('staffAppConfig.versionPlaceholder')}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    {versionError && <p className="admin-field__error">{versionError}</p>}

                    <div className="admin-modal__footer">
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={publishVersionMutation.isLoading}
                        >
                            <MdPublish size={18} />
                            {publishVersionMutation.isLoading
                                ? t('staffCommon.saving')
                                : t('staffAppConfig.publishVersion')}
                        </button>
                    </div>
                </form>
            </AdminCard>

            <AdminTable
                title={t('staffAppConfig.versionHistoryTitle')}
                columns={historyColumns}
                rows={versionHistory.rows}
                rowKey="id"
                loading={versionHistory.isLoading}
                error={versionHistory.error}
                onRetry={versionHistory.refetch}
                meta={versionHistory.meta}
                onPageChange={versionHistory.setPage}
            />

            <AdminCard
                title={t('staffAppConfig.linksTitle')}
                actions={
                    appLinksQuery.data?.updatedAt ? (
                        <span className="admin-field__hint">
                            {t('staffAppConfig.lastUpdated', {
                                date: formatDate(appLinksQuery.data.updatedAt, language),
                            })}
                        </span>
                    ) : null
                }
            >
                {appLinksQuery.isLoading ? (
                    <LoadingState />
                ) : appLinksQuery.error && !linksNotFound ? (
                    <ErrorState error={appLinksQuery.error} onRetry={appLinksQuery.refetch} />
                ) : (
                    <form className="admin-form" onSubmit={handlePublishLinks}>
                        {linksNotFound && (
                            <EmptyState message={t('staffAppConfig.linksEmpty')} />
                        )}

                        <div className="admin-form-grid">
                            <label className="admin-field">
                                <span className="admin-field__label">{t('staffAppConfig.playStoreLabel')} *</span>
                                <input
                                    type="url"
                                    className="admin-input"
                                    value={linksForm.playStore}
                                    onChange={(e) =>
                                        setLinksForm((prev) => ({ ...prev, playStore: e.target.value }))
                                    }
                                    placeholder={t('staffAppConfig.urlPlaceholder')}
                                />
                            </label>

                            <label className="admin-field">
                                <span className="admin-field__label">{t('staffAppConfig.appStoreLabel')} *</span>
                                <input
                                    type="url"
                                    className="admin-input"
                                    value={linksForm.appStore}
                                    onChange={(e) =>
                                        setLinksForm((prev) => ({ ...prev, appStore: e.target.value }))
                                    }
                                    placeholder={t('staffAppConfig.urlPlaceholder')}
                                />
                            </label>

                            <label className="admin-field">
                                <span className="admin-field__label">{t('staffAppConfig.webLabel')} *</span>
                                <input
                                    type="url"
                                    className="admin-input"
                                    value={linksForm.web}
                                    onChange={(e) =>
                                        setLinksForm((prev) => ({ ...prev, web: e.target.value }))
                                    }
                                    placeholder={t('staffAppConfig.urlPlaceholder')}
                                />
                            </label>
                        </div>

                        {linksError && <p className="admin-field__error">{linksError}</p>}

                        <div className="admin-modal__footer">
                            <button
                                type="submit"
                                className="admin-btn admin-btn--primary"
                                disabled={publishLinksMutation.isLoading}
                            >
                                <MdPublish size={18} />
                                {publishLinksMutation.isLoading
                                    ? t('staffCommon.saving')
                                    : t('staffAppConfig.publishLinks')}
                            </button>
                        </div>
                    </form>
                )}
            </AdminCard>
        </AdminPage>
    );
}
