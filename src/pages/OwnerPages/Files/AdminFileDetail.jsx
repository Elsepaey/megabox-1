import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { MdInsertDriveFile } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import { contentAdmin } from '../../../services/admin/contentAdmin';
import {
    AdminCard,
    AdminPage,
    AdminTable,
    DetailList,
    ErrorState,
    LoadingState,
    ReasonModal,
    StatTile,
    StatusBadge,
} from '../_shared/AdminUI';
import { formatBytes, formatDate, formatNumber, shortId, todayIso } from '../_shared/formatters';

const MAX_ANALYTICS_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

function uploadStatusTone(status) {
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'danger';
    if (status === 'uploading' || status === 'pending') return 'warning';
    return 'neutral';
}

function uploadStatusKey(status) {
    if (status === 'pending') return 'staffFiles.uploadPending';
    if (status === 'uploading') return 'staffFiles.uploadUploading';
    if (status === 'completed') return 'staffFiles.uploadCompleted';
    if (status === 'failed') return 'staffFiles.uploadFailed';
    return null;
}

function validateAnalyticsRange(from, to) {
    if (!from && !to) return null;
    if (!from || !to) return 'staffFiles.rangePairError';
    const startMs = Date.parse(`${from}T00:00:00Z`);
    const endMs = Date.parse(`${to}T00:00:00Z`);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
        return 'staffFiles.rangeOrderError';
    }
    if (endMs - startMs > MAX_ANALYTICS_RANGE_MS) {
        return 'staffFiles.rangeMaxError';
    }
    return null;
}

export default function AdminFileDetail() {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const fileQuery = useQuery(['staff:file', id], () => contentAdmin.getFile(id), {
        retry: false,
        refetchOnWindowFocus: false,
    });

    const file = fileQuery.data;
    const isRestricted = file?.moderationStatus === 'restricted';
    const nextStatus = isRestricted ? 'active' : 'restricted';

    const rangeErrorKey = useMemo(() => validateAnalyticsRange(fromDate, toDate), [fromDate, toDate]);
    const analyticsParams = useMemo(
        () => (fromDate && toDate && !rangeErrorKey ? { from: fromDate, to: toDate } : {}),
        [fromDate, toDate, rangeErrorKey],
    );

    const analyticsEnabled = Boolean(file && file.state === 'available' && !rangeErrorKey);
    const analyticsQuery = useQuery(
        ['staff:fileAnalytics', id, analyticsParams],
        () => contentAdmin.getFileAnalytics(id, analyticsParams),
        {
            enabled: analyticsEnabled,
            keepPreviousData: true,
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const handleModerate = async (reason) => {
        try {
            await contentAdmin.moderateFile(id, { status: nextStatus, reason });
            await Promise.all([
                queryClient.invalidateQueries(['staff:file', id]),
                queryClient.invalidateQueries('staff:files'),
            ]);
            setModalOpen(false);
            toast.success(
                t(nextStatus === 'restricted' ? 'staffFiles.restrictedSuccess' : 'staffFiles.restoredSuccess'),
                ToastOptions('success'),
            );
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                setModalOpen(false);
                await fileQuery.refetch();
                toast.warning(t('staffCommon.conflictReload'), ToastOptions('warning'));
                return;
            }
            throw error;
        }
    };

    const byDayColumns = [
        { key: 'date', header: t('staffFiles.date') },
        {
            key: 'views',
            header: t('staffFiles.views'),
            render: (row) => formatNumber(row.views, language),
        },
        {
            key: 'downloads',
            header: t('staffFiles.downloads'),
            render: (row) => formatNumber(row.downloads, language),
        },
    ];

    const headerActions = (
        <>
            <Link to="/Owner/Files" className="admin-btn admin-btn--secondary">
                {t('staffCommon.back')}
            </Link>
            {file && (
                <button
                    type="button"
                    className={`admin-btn ${isRestricted ? 'admin-btn--primary' : 'admin-btn--danger'}`}
                    onClick={() => setModalOpen(true)}
                >
                    {isRestricted ? t('staffFiles.restoreAction') : t('staffFiles.restrictAction')}
                </button>
            )}
        </>
    );

    const uploadKey = file ? uploadStatusKey(file.uploadStatus) : null;
    const analytics = analyticsQuery.data;

    return (
        <AdminPage
            icon={MdInsertDriveFile}
            title={file?.fileName || t('staffFiles.detailTitle')}
            subtitle={file ? file._id : t('staffFiles.detailSubtitle')}
            actions={headerActions}
        >
            {fileQuery.isLoading && <LoadingState />}
            {fileQuery.error && <ErrorState error={fileQuery.error} onRetry={fileQuery.refetch} />}
            {file && (
                <>
                    <AdminCard title={t('staffFiles.overview')}>
                        <DetailList
                            items={[
                                { label: t('staffFiles.fileId'), value: file._id },
                                { label: t('staffFiles.fileName'), value: file.fileName },
                                {
                                    label: t('staffFiles.recordState'),
                                    value: (
                                        <StatusBadge tone={file.state === 'saved_only' ? 'warning' : 'success'}>
                                            {file.state === 'saved_only'
                                                ? t('staffFiles.stateSavedOnly')
                                                : t('staffFiles.stateAvailable')}
                                        </StatusBadge>
                                    ),
                                },
                                { label: t('staffFiles.fileType'), value: file.fileType },
                                { label: t('staffFiles.fileSize'), value: formatBytes(file.fileSize) },
                                {
                                    label: t('staffFiles.isVideo'),
                                    value:
                                        file.isVideo === undefined || file.isVideo === null
                                            ? null
                                            : file.isVideo
                                              ? t('staffCommon.yes')
                                              : t('staffCommon.no'),
                                },
                                {
                                    label: t('staffFiles.uploadStatus'),
                                    value: file.uploadStatus ? (
                                        <StatusBadge tone={uploadStatusTone(file.uploadStatus)}>
                                            {uploadKey ? t(uploadKey) : file.uploadStatus}
                                        </StatusBadge>
                                    ) : null,
                                },
                                {
                                    label: t('staffFiles.moderationStatus'),
                                    value: (
                                        <StatusBadge tone={isRestricted ? 'danger' : 'success'}>
                                            {isRestricted
                                                ? t('staffFiles.statusRestricted')
                                                : t('staffFiles.statusActive')}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    label: t('staffCommon.owner'),
                                    value: file.userId ? (
                                        <Link
                                            to={`/Owner/Users/${file.userId}`}
                                            className="admin-btn admin-btn--ghost admin-btn--sm"
                                            title={file.userId}
                                        >
                                            {shortId(file.userId)}
                                        </Link>
                                    ) : null,
                                },
                                {
                                    label: t('staffFolders.channel'),
                                    value: file.channelId ? (
                                        <Link
                                            to={`/Owner/Channels/${file.channelId}`}
                                            className="admin-btn admin-btn--ghost admin-btn--sm"
                                            title={file.channelId}
                                        >
                                            {shortId(file.channelId)}
                                        </Link>
                                    ) : null,
                                },
                                {
                                    label: t('staffFiles.folderId'),
                                    value: file.folderId ? (
                                        <Link
                                            to={`/Owner/Folders/${file.folderId}`}
                                            className="admin-btn admin-btn--ghost admin-btn--sm"
                                            title={file.folderId}
                                        >
                                            {shortId(file.folderId)}
                                        </Link>
                                    ) : null,
                                },
                                {
                                    label: t('staffCommon.createdAt'),
                                    value: file.createdAt ? formatDate(file.createdAt, language) : null,
                                },
                                {
                                    label: t('staffCommon.updatedAt'),
                                    value: file.updatedAt ? formatDate(file.updatedAt, language) : null,
                                },
                            ]}
                        />
                    </AdminCard>

                    <AdminCard title={t('staffFiles.moderationSection')}>
                        {!file.moderation ? (
                            <p className="admin-modal__description">{t('staffFiles.noModerationDecision')}</p>
                        ) : (
                            <DetailList
                                items={[
                                    {
                                        label: t('staffCommon.status'),
                                        value: (
                                            <StatusBadge
                                                tone={file.moderation.status === 'restricted' ? 'danger' : 'success'}
                                            >
                                                {file.moderation.status === 'restricted'
                                                    ? t('staffFiles.statusRestricted')
                                                    : t('staffFiles.statusActive')}
                                            </StatusBadge>
                                        ),
                                    },
                                    {
                                        label: t('staffFiles.moderatedBy'),
                                        value: file.moderation.moderatedBy ? (
                                            <Link
                                                to={`/Owner/Users/${file.moderation.moderatedBy}`}
                                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                                title={file.moderation.moderatedBy}
                                            >
                                                {shortId(file.moderation.moderatedBy)}
                                            </Link>
                                        ) : null,
                                    },
                                    {
                                        label: t('staffFiles.moderatedAt'),
                                        value: file.moderation.moderatedAt
                                            ? formatDate(file.moderation.moderatedAt, language)
                                            : null,
                                    },
                                    { label: t('staffFiles.moderationReason'), value: file.moderation.reason },
                                ]}
                            />
                        )}
                    </AdminCard>

                    <AdminCard
                        title={t('staffFiles.analyticsSection')}
                        actions={
                            file.state === 'available' && (
                                <>
                                    <button
                                        type="button"
                                        className="admin-btn admin-btn--secondary admin-btn--sm"
                                        onClick={() => {
                                            setFromDate('');
                                            setToDate('');
                                        }}
                                    >
                                        {t('staffFiles.presetLifetime')}
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn admin-btn--secondary admin-btn--sm"
                                        onClick={() => {
                                            setFromDate(todayIso(-7));
                                            setToDate(todayIso(1));
                                        }}
                                    >
                                        {t('staffFiles.preset7d')}
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn admin-btn--secondary admin-btn--sm"
                                        onClick={() => {
                                            setFromDate(todayIso(-30));
                                            setToDate(todayIso(1));
                                        }}
                                    >
                                        {t('staffFiles.preset30d')}
                                    </button>
                                </>
                            )
                        }
                    >
                        {file.state === 'saved_only' ? (
                            <p className="admin-modal__description">{t('staffFiles.analyticsSavedOnlyNote')}</p>
                        ) : (
                            <div className="admin-form">
                                <p className="admin-modal__description">{t('staffFiles.analyticsHint')}</p>
                                <div className="admin-form-grid">
                                    <label className="admin-field">
                                        <span className="admin-field__label">{t('staffCommon.from')}</span>
                                        <input
                                            type="date"
                                            className="admin-input"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                        />
                                    </label>
                                    <label className="admin-field">
                                        <span className="admin-field__label">{t('staffCommon.to')}</span>
                                        <input
                                            type="date"
                                            className="admin-input"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                        />
                                    </label>
                                </div>
                                {rangeErrorKey && <span className="admin-field__error">{t(rangeErrorKey)}</span>}

                                {!rangeErrorKey && analyticsQuery.isLoading && !analytics && <LoadingState />}
                                {!rangeErrorKey && analyticsQuery.error && (
                                    <ErrorState error={analyticsQuery.error} onRetry={analyticsQuery.refetch} />
                                )}
                                {analytics && (
                                    <>
                                        <div className="admin-stat-grid">
                                            <StatTile
                                                label={t('staffFiles.lifetimeViews')}
                                                value={formatNumber(analytics.lifetime?.views ?? 0, language)}
                                            />
                                            <StatTile
                                                label={t('staffFiles.lifetimeDownloads')}
                                                value={formatNumber(analytics.lifetime?.downloads ?? 0, language)}
                                            />
                                            <StatTile
                                                label={t('staffFiles.lastUpdated')}
                                                value={formatDate(analytics.lifetime?.lastUpdated, language)}
                                            />
                                            {analytics.events && (
                                                <>
                                                    <StatTile
                                                        label={t('staffFiles.rangeViews')}
                                                        value={formatNumber(analytics.events.totals?.views ?? 0, language)}
                                                    />
                                                    <StatTile
                                                        label={t('staffFiles.rangeDownloads')}
                                                        value={formatNumber(
                                                            analytics.events.totals?.downloads ?? 0,
                                                            language,
                                                        )}
                                                    />
                                                </>
                                            )}
                                        </div>

                                        {analytics.events && (
                                            <AdminTable
                                                title={t('staffFiles.byDayTitle')}
                                                columns={byDayColumns}
                                                rows={analytics.events.byDay || []}
                                                rowKey="date"
                                                emptyMessage={t('staffFiles.byDayEmpty')}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </AdminCard>
                </>
            )}

            <ReasonModal
                open={modalOpen}
                title={isRestricted ? t('staffFiles.restoreTitle') : t('staffFiles.restrictTitle')}
                description={
                    isRestricted ? t('staffFiles.restoreDescription') : t('staffFiles.restrictDescription')
                }
                confirmLabel={isRestricted ? t('staffFiles.restoreConfirm') : t('staffFiles.restrictConfirm')}
                tone={isRestricted ? 'primary' : 'danger'}
                maxLength={500}
                reasonRequired
                onConfirm={handleModerate}
                onClose={() => setModalOpen(false)}
            />
        </AdminPage>
    );
}
