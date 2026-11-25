import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { MdShare } from 'react-icons/md';
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
import { formatDate, formatNumber, shortId } from '../_shared/formatters';

function sourceLabelKey(sourceType) {
    if (sourceType === 'normal') return 'staffShares.sourceNormal';
    if (sourceType === 'saves') return 'staffShares.sourceSaves';
    if (sourceType === 'channel') return 'staffShares.sourceChannel';
    return null;
}

function itemPath(item) {
    if (!item?.itemId) return null;
    if (item.itemType === 'file') return `/Owner/Files/${item.itemId}`;
    if (item.itemType === 'folder') return `/Owner/Folders/${item.itemId}`;
    return null;
}

export default function AdminShareDetail() {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const [revokeOpen, setRevokeOpen] = useState(false);

    const query = useQuery(['staff:share', id], () => contentAdmin.getShare(id), {
        retry: false,
        refetchOnWindowFocus: false,
    });

    const share = query.data;

    const handleRevoke = async (reason) => {
        try {
            await contentAdmin.revokeShare(id, reason);
            await Promise.all([
                queryClient.invalidateQueries(['staff:share', id]),
                queryClient.invalidateQueries('staff:shares'),
            ]);
            setRevokeOpen(false);
            toast.success(t('staffShares.revokedSuccess'), ToastOptions('success'));
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                setRevokeOpen(false);
                await query.refetch();
                toast.warning(t('staffCommon.conflictReload'), ToastOptions('warning'));
                return;
            }
            throw error;
        }
    };

    const itemColumns = [
        {
            key: 'itemType',
            header: t('staffShares.itemType'),
            render: (item) => (
                <StatusBadge tone={item.itemType === 'file' ? 'info' : 'neutral'}>
                    {item.itemType === 'file'
                        ? t('staffShares.itemTypeFile')
                        : item.itemType === 'folder'
                          ? t('staffShares.itemTypeFolder')
                          : item.itemType || '—'}
                </StatusBadge>
            ),
        },
        {
            key: 'itemId',
            header: t('staffShares.itemId'),
            render: (item) => item.itemId || '—',
        },
        {
            key: 'action',
            header: t('staffCommon.actions'),
            render: (item) => {
                const to = itemPath(item);
                if (!to) return '—';
                return (
                    <Link to={to} className="admin-btn admin-btn--secondary admin-btn--sm">
                        {t('staffShares.openItem')}
                    </Link>
                );
            },
        },
    ];

    const headerActions = (
        <>
            <Link to="/Owner/Shares" className="admin-btn admin-btn--secondary">
                {t('staffCommon.back')}
            </Link>
            {share?.isActive && (
                <button
                    type="button"
                    className="admin-btn admin-btn--danger"
                    onClick={() => setRevokeOpen(true)}
                >
                    {t('staffShares.revokeAction')}
                </button>
            )}
        </>
    );

    const sourceKey = share ? sourceLabelKey(share.sourceType) : null;
    const hasRevocationCard = Boolean(
        share && (!share.isActive || share.deactivatedAt || share.revokedBy || share.revocationReason),
    );

    return (
        <AdminPage
            icon={MdShare}
            title={t('staffShares.detailTitle')}
            subtitle={share ? share._id : t('staffShares.detailSubtitle')}
            actions={headerActions}
        >
            {query.isLoading && <LoadingState />}
            {query.error && <ErrorState error={query.error} onRetry={query.refetch} />}
            {share && (
                <>
                    <div className="admin-stat-grid">
                        <StatTile label={t('staffShares.items')} value={formatNumber(share.itemCount, language)} />
                        <StatTile label={t('staffShares.views')} value={formatNumber(share.viewsCount, language)} />
                        <StatTile label={t('staffShares.installs')} value={formatNumber(share.installsCount, language)} />
                        <StatTile
                            label={t('staffCommon.status')}
                            value={share.isActive ? t('staffShares.active') : t('staffShares.inactive')}
                        />
                    </div>

                    <AdminCard title={t('staffShares.overview')}>
                        <DetailList
                            items={[
                                { label: t('staffShares.shareId'), value: share._id },
                                {
                                    label: t('staffShares.sourceType'),
                                    value: (
                                        <StatusBadge tone={share.sourceType === 'channel' ? 'info' : 'neutral'}>
                                            {sourceKey ? t(sourceKey) : share.sourceType}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    label: t('staffCommon.status'),
                                    value: (
                                        <StatusBadge tone={share.isActive ? 'success' : 'danger'}>
                                            {share.isActive ? t('staffShares.active') : t('staffShares.inactive')}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    label: t('staffShares.sharedBy'),
                                    value: share.sharedBy ? (
                                        <Link to={`/Owner/Users/${share.sharedBy}`} className="admin-btn admin-btn--ghost admin-btn--sm">
                                            {share.sharedBy}
                                        </Link>
                                    ) : null,
                                },
                                { label: t('staffShares.promoterCode'), value: share.promoterCode },
                                {
                                    label: t('staffShares.branchUrl'),
                                    value: share.branchUrl ? (
                                        <a href={share.branchUrl} target="_blank" rel="noopener noreferrer">
                                            {share.branchUrl}
                                        </a>
                                    ) : null,
                                },
                                { label: t('staffCommon.createdAt'), value: formatDate(share.createdAt, language) },
                                {
                                    label: t('staffShares.deactivatedAt'),
                                    value: share.deactivatedAt ? formatDate(share.deactivatedAt, language) : null,
                                },
                            ]}
                        />
                    </AdminCard>

                    {hasRevocationCard && (
                        <AdminCard title={t('staffShares.revocationSection')}>
                            {!share.revokedBy && !share.revocationReason ? (
                                <p className="admin-modal__description">{t('staffShares.ownerDeactivatedNote')}</p>
                            ) : (
                                <DetailList
                                    items={[
                                        {
                                            label: t('staffShares.deactivatedAt'),
                                            value: share.deactivatedAt ? formatDate(share.deactivatedAt, language) : null,
                                        },
                                        {
                                            label: t('staffShares.revokedBy'),
                                            value: share.revokedBy ? (
                                                <Link
                                                    to={`/Owner/Users/${share.revokedBy}`}
                                                    className="admin-btn admin-btn--ghost admin-btn--sm"
                                                    title={share.revokedBy}
                                                >
                                                    {shortId(share.revokedBy)}
                                                </Link>
                                            ) : null,
                                        },
                                        { label: t('staffShares.revocationReason'), value: share.revocationReason },
                                    ]}
                                />
                            )}
                        </AdminCard>
                    )}

                    <AdminTable
                        title={t('staffShares.linkedItems')}
                        columns={itemColumns}
                        rows={share.items || []}
                        rowKey={(item, idx) => `${item.itemType}-${item.itemId}-${idx}`}
                        emptyMessage={t('staffShares.noItems')}
                    />
                </>
            )}

            <ReasonModal
                open={revokeOpen}
                title={t('staffShares.revokeTitle')}
                description={t('staffShares.revokeDescription')}
                confirmLabel={t('staffShares.revokeConfirm')}
                tone="danger"
                maxLength={500}
                reasonRequired
                onConfirm={handleRevoke}
                onClose={() => setRevokeOpen(false)}
            />
        </AdminPage>
    );
}
