import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { FaFileArchive } from 'react-icons/fa';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import { zipAdmin } from '../../../services/admin/zipAdmin';
import {
    AdminModal,
    AdminPage,
    AdminTable,
    DetailList,
    EmptyState,
    ErrorState,
    FilterBar,
    LoadingState,
    ReasonModal,
    StatTile,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatBytes, formatDate, formatNumber, shortId } from '../_shared/formatters';

const DEFAULT_FILTERS = {
    userId: '',
    zipFileId: '',
    status: '',
    from: '',
    to: '',
};

const CANCELLABLE_STATUSES = new Set(['pending', 'extracting']);

function statusMeta(status) {
    switch (status) {
        case 'pending':
            return { tone: 'warning', labelKey: 'staffZips.statusPending' };
        case 'extracting':
            return { tone: 'info', labelKey: 'staffZips.statusExtracting' };
        case 'completed':
            return { tone: 'success', labelKey: 'staffZips.statusCompleted' };
        case 'failed':
            return { tone: 'danger', labelKey: 'staffZips.statusFailed' };
        case 'cancelled':
            return { tone: 'neutral', labelKey: 'staffZips.statusCancelled' };
        default:
            return { tone: 'neutral', labelKey: null };
    }
}

function sourceLabelKey(sourceType) {
    if (sourceType === 'normal') return 'staffZips.sourceNormal';
    if (sourceType === 'saves') return 'staffZips.sourceSaves';
    return null;
}

function renderOwnerLink(userId, owner) {
    if (!userId) return '—';
    const label = owner?.username || owner?.email || shortId(userId);
    return (
        <Link to={`/Owner/Users/${userId}`} onClick={(e) => e.stopPropagation()}>
            {label}
        </Link>
    );
}

export default function AdminZips() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedId, setSelectedId] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);

    const initialFilters = useMemo(
        () => ({
            ...DEFAULT_FILTERS,
            userId: searchParams.get('userId') || '',
            zipFileId: searchParams.get('zipFileId') || '',
            status: searchParams.get('status') || '',
            from: searchParams.get('from') || '',
            to: searchParams.get('to') || '',
        }),
        [searchParams],
    );

    const list = useAdminList('staff:zip-extractions', zipAdmin.listExtractions, {
        initialFilters,
        defaultFilters: DEFAULT_FILTERS,
    });

    const detailQuery = useQuery(
        ['staff:zip-extraction', selectedId],
        () => zipAdmin.getExtraction(selectedId),
        {
            enabled: Boolean(selectedId),
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const detail = detailQuery.data;

    const handleReset = () => {
        if (searchParams.toString()) {
            setSearchParams({});
        }
        list.resetFilters();
    };

    const handleCancel = async (reason) => {
        if (!cancelTarget) return;
        const targetId = cancelTarget._id;
        try {
            await zipAdmin.cancelExtraction(targetId, reason);
            await Promise.all([
                queryClient.invalidateQueries('staff:zip-extractions'),
                queryClient.invalidateQueries(['staff:zip-extraction', targetId]),
            ]);
            setCancelTarget(null);
            toast.success(t('staffZips.cancelSuccess'), ToastOptions('success'));
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                setCancelTarget(null);
                await Promise.all([
                    list.refetch(),
                    selectedId === targetId ? detailQuery.refetch() : Promise.resolve(),
                ]);
                toast.warning(t('staffCommon.conflictReload'), ToastOptions('warning'));
                return;
            }
            throw error;
        }
    };

    const filterFields = [
        {
            key: 'userId',
            label: t('staffZips.userId'),
            type: 'text',
            placeholder: t('staffZips.userIdPlaceholder'),
        },
        {
            key: 'zipFileId',
            label: t('staffZips.zipFileId'),
            type: 'text',
            placeholder: t('staffZips.zipFileIdPlaceholder'),
        },
        {
            key: 'status',
            label: t('staffCommon.status'),
            type: 'select',
            options: [
                { value: 'pending', label: t('staffZips.statusPending') },
                { value: 'extracting', label: t('staffZips.statusExtracting') },
                { value: 'completed', label: t('staffZips.statusCompleted') },
                { value: 'failed', label: t('staffZips.statusFailed') },
                { value: 'cancelled', label: t('staffZips.statusCancelled') },
            ],
        },
        { key: 'from', label: t('staffCommon.from'), type: 'date' },
        { key: 'to', label: t('staffCommon.to'), type: 'date' },
    ];

    const columns = [
        {
            key: 'archiveFileName',
            header: t('staffZips.archiveName'),
            render: (row) => (
                <div>
                    <div>{row.archiveFileName || '—'}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{shortId(row._id)}</div>
                </div>
            ),
        },
        {
            key: 'sourceType',
            header: t('staffZips.sourceType'),
            render: (row) => {
                const key = sourceLabelKey(row.sourceType);
                return (
                    <StatusBadge tone={row.sourceType === 'normal' ? 'info' : 'neutral'}>
                        {key ? t(key) : row.sourceType || '—'}
                    </StatusBadge>
                );
            },
        },
        {
            key: 'owner',
            header: t('staffCommon.owner'),
            render: (row) => renderOwnerLink(row.userId, row.owner),
        },
        {
            key: 'status',
            header: t('staffCommon.status'),
            render: (row) => {
                const meta = statusMeta(row.status);
                return (
                    <StatusBadge tone={meta.tone}>
                        {meta.labelKey ? t(meta.labelKey) : row.status || '—'}
                    </StatusBadge>
                );
            },
        },
        {
            key: 'progress',
            header: t('staffZips.progress'),
            render: (row) =>
                t('staffZips.progressRatio', {
                    processed: formatNumber(row.processedEntries, language),
                    total: formatNumber(row.totalEntries, language),
                    percent: formatNumber(row.progress, language),
                }),
        },
        {
            key: 'error',
            header: t('staffZips.error'),
            render: (row) =>
                row.error ? (
                    <span title={row.error}>
                        {row.error.length > 48 ? `${row.error.slice(0, 48)}…` : row.error}
                    </span>
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
            key: 'actions',
            header: t('staffCommon.actions'),
            render: (row) => (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(row._id);
                        }}
                    >
                        {t('staffCommon.view')}
                    </button>
                    {CANCELLABLE_STATUSES.has(row.status) && (
                        <button
                            type="button"
                            className="admin-btn admin-btn--danger admin-btn--sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCancelTarget(row);
                            }}
                        >
                            {t('staffZips.cancelAction')}
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const sampleColumns = [
        { key: 'entryPath', header: t('staffZips.entryPath') },
        { key: 'fileType', header: t('staffZips.fileType') },
        {
            key: 'fileSize',
            header: t('staffZips.fileSize'),
            render: (item) => formatBytes(item.fileSize),
        },
        {
            key: 'isVideo',
            header: t('staffZips.video'),
            render: (item) => (item.isVideo ? t('staffCommon.yes') : t('staffCommon.no')),
        },
    ];

    const detailStatus = detail ? statusMeta(detail.status) : null;
    const detailSourceKey = detail ? sourceLabelKey(detail.sourceType) : null;

    return (
        <AdminPage
            icon={FaFileArchive}
            title={t('staffZips.title')}
            subtitle={t('staffZips.subtitle')}
        >
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={handleReset}
            />

            <AdminTable
                title={t('staffZips.tableTitle')}
                columns={columns}
                rows={list.rows}
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                emptyMessage={t('staffZips.empty')}
                onRowClick={(row) => setSelectedId(row._id)}
                meta={list.meta}
                onPageChange={list.setPage}
            />

            <AdminModal
                open={Boolean(selectedId)}
                title={t('staffZips.detailTitle')}
                size="lg"
                onClose={() => setSelectedId(null)}
                footer={
                    <>
                        {detail && CANCELLABLE_STATUSES.has(detail.status) && (
                            <button
                                type="button"
                                className="admin-btn admin-btn--danger"
                                onClick={() => setCancelTarget(detail)}
                            >
                                {t('staffZips.cancelAction')}
                            </button>
                        )}
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => setSelectedId(null)}
                        >
                            {t('staffCommon.close')}
                        </button>
                    </>
                }
            >
                {detailQuery.isLoading ? (
                    <LoadingState />
                ) : detailQuery.error ? (
                    <ErrorState error={detailQuery.error} onRetry={detailQuery.refetch} />
                ) : detail ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <DetailList
                            items={[
                                { label: t('staffZips.extractionId'), value: detail._id },
                                { label: t('staffZips.archiveName'), value: detail.archiveFileName },
                                {
                                    label: t('staffCommon.status'),
                                    value: (
                                        <StatusBadge tone={detailStatus.tone}>
                                            {detailStatus.labelKey
                                                ? t(detailStatus.labelKey)
                                                : detail.status}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    label: t('staffZips.sourceType'),
                                    value: detailSourceKey ? t(detailSourceKey) : detail.sourceType,
                                },
                                {
                                    label: t('staffCommon.owner'),
                                    value: renderOwnerLink(detail.userId, detail.owner),
                                },
                                {
                                    label: t('staffZips.zipFileId'),
                                    value: detail.zipFileId ? (
                                        detail.sourceType === 'normal' ? (
                                            <Link to={`/Owner/Files/${detail.zipFileId}`}>
                                                {detail.zipFileId}
                                            </Link>
                                        ) : (
                                            detail.zipFileId
                                        )
                                    ) : null,
                                },
                                {
                                    label: t('staffZips.progress'),
                                    value: t('staffZips.progressRatio', {
                                        processed: formatNumber(detail.processedEntries, language),
                                        total: formatNumber(detail.totalEntries, language),
                                        percent: formatNumber(detail.progress, language),
                                    }),
                                },
                                {
                                    label: t('staffZips.rootFolder'),
                                    value: detail.rootFolderId ? (
                                        detail.sourceType === 'normal' ? (
                                            <Link to={`/Owner/Folders/${detail.rootFolderId}`}>
                                                {detail.rootFolderId}
                                            </Link>
                                        ) : (
                                            detail.rootFolderId
                                        )
                                    ) : null,
                                },
                                { label: t('staffZips.targetFolder'), value: detail.targetFolderId },
                                { label: t('staffZips.language'), value: detail.lang },
                                { label: t('staffZips.error'), value: detail.error },
                                {
                                    label: t('staffCommon.createdAt'),
                                    value: formatDate(detail.createdAt, language),
                                },
                                {
                                    label: t('staffCommon.updatedAt'),
                                    value: formatDate(detail.updatedAt, language),
                                },
                            ]}
                        />

                        {(detail.status === 'cancelled' ||
                            detail.cancelledBy ||
                            detail.cancelReason) && (
                            <div>
                                <h4 style={{ marginBottom: 8 }}>
                                    {t('staffZips.cancellationSection')}
                                </h4>
                                <DetailList
                                    items={[
                                        {
                                            label: t('staffZips.cancelledBy'),
                                            value: renderOwnerLink(
                                                detail.cancelledBy,
                                                detail.cancelledByUser,
                                            ),
                                        },
                                        {
                                            label: t('staffZips.cancelledAt'),
                                            value: formatDate(detail.cancelledAt, language),
                                        },
                                        {
                                            label: t('staffZips.cancelReason'),
                                            value: detail.cancelReason,
                                        },
                                    ]}
                                />
                            </div>
                        )}

                        <div>
                            <h4 style={{ marginBottom: 8 }}>
                                {t('staffZips.extractedFilesTitle')}
                            </h4>
                            <div className="admin-stat-grid" style={{ marginBottom: 12 }}>
                                <StatTile
                                    label={t('staffZips.extractedCount')}
                                    value={formatNumber(
                                        detail.extractedFilesSummary?.totalCount ?? 0,
                                        language,
                                    )}
                                />
                                <StatTile
                                    label={t('staffZips.extractedTotalSize')}
                                    value={formatBytes(
                                        detail.extractedFilesSummary?.totalSizeBytes ?? 0,
                                    )}
                                />
                                <StatTile
                                    label={t('staffZips.extractedVideos')}
                                    value={formatNumber(
                                        detail.extractedFilesSummary?.videoCount ?? 0,
                                        language,
                                    )}
                                />
                            </div>

                            {detail.extractedFilesSummary?.sample?.length > 0 ? (
                                <AdminTable
                                    title={t('staffZips.sampleTitle')}
                                    columns={sampleColumns}
                                    rows={detail.extractedFilesSummary.sample}
                                    emptyMessage={t('staffZips.noExtractedFiles')}
                                />
                            ) : (
                                <EmptyState message={t('staffZips.noExtractedFiles')} />
                            )}
                        </div>
                    </div>
                ) : null}
            </AdminModal>

            <ReasonModal
                open={Boolean(cancelTarget)}
                title={t('staffZips.cancelTitle')}
                description={t('staffZips.cancelDescription')}
                confirmLabel={t('staffZips.cancelConfirm')}
                tone="danger"
                maxLength={500}
                reasonRequired
                onConfirm={handleCancel}
                onClose={() => setCancelTarget(null)}
            />
        </AdminPage>
    );
}
