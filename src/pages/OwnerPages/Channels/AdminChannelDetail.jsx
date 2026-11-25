import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { MdSubscriptions } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import { contentAdmin } from '../../../services/admin/contentAdmin';
import {
    AdminCard,
    AdminPage,
    DetailList,
    ErrorState,
    LoadingState,
    ReasonModal,
    StatTile,
    StatusBadge,
} from '../_shared/AdminUI';
import { formatDate, formatNumber, shortId } from '../_shared/formatters';

export default function AdminChannelDetail() {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);

    const query = useQuery(['staff:channel', id], () => contentAdmin.getChannel(id), {
        retry: false,
        refetchOnWindowFocus: false,
    });

    const channel = query.data;
    const isSuspended = channel?.moderationStatus === 'suspended';
    const nextStatus = isSuspended ? 'active' : 'suspended';

    const handleModerate = async (reason) => {
        try {
            await contentAdmin.moderateChannel(id, { status: nextStatus, reason });
            await Promise.all([
                queryClient.invalidateQueries(['staff:channel', id]),
                queryClient.invalidateQueries('staff:channels'),
            ]);
            setModalOpen(false);
            toast.success(
                t(nextStatus === 'suspended' ? 'staffChannels.suspendedSuccess' : 'staffChannels.restoredSuccess'),
                ToastOptions('success'),
            );
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                setModalOpen(false);
                await query.refetch();
                toast.warning(t('staffCommon.conflictReload'), ToastOptions('warning'));
                return;
            }
            throw error;
        }
    };

    const ownerId = channel?.owner?._id || channel?.ownerId;
    const ownerLabel = channel?.owner?.username
        ? `${channel.owner.username} (${shortId(ownerId)})`
        : ownerId
          ? shortId(ownerId)
          : null;

    const headerActions = (
        <>
            <Link to="/Owner/Channels" className="admin-btn admin-btn--secondary">
                {t('staffCommon.back')}
            </Link>
            {channel && (
                <>
                    <Link to={`/Owner/Files?channelId=${channel._id}`} className="admin-btn admin-btn--secondary">
                        {t('staffChannels.viewFiles')}
                    </Link>
                    <Link to={`/Owner/Folders?channelId=${channel._id}`} className="admin-btn admin-btn--secondary">
                        {t('staffChannels.viewFolders')}
                    </Link>
                    <button
                        type="button"
                        className={`admin-btn ${isSuspended ? 'admin-btn--primary' : 'admin-btn--danger'}`}
                        onClick={() => setModalOpen(true)}
                    >
                        {isSuspended ? t('staffChannels.restoreAction') : t('staffChannels.suspendAction')}
                    </button>
                </>
            )}
        </>
    );

    const hasModerationMeta = Boolean(channel?.moderatedBy || channel?.moderatedAt || channel?.moderationReason);

    return (
        <AdminPage
            icon={MdSubscriptions}
            title={channel?.name || t('staffChannels.detailTitle')}
            subtitle={channel ? channel._id : t('staffChannels.detailSubtitle')}
            actions={headerActions}
        >
            {query.isLoading && <LoadingState />}
            {query.error && <ErrorState error={query.error} onRetry={query.refetch} />}
            {channel && (
                <>
                    <div className="admin-stat-grid">
                        <StatTile
                            label={t('staffChannels.subscribers')}
                            value={formatNumber(channel.subscriberCount, language)}
                        />
                        <StatTile
                            label={t('staffChannels.files')}
                            value={formatNumber(channel.fileCount, language)}
                        />
                        <StatTile
                            label={t('staffChannels.folders')}
                            value={formatNumber(channel.folderCount, language)}
                        />
                        <StatTile
                            label={t('staffChannels.moderationStatus')}
                            value={isSuspended ? t('staffChannels.statusSuspended') : t('staffChannels.statusActive')}
                        />
                    </div>

                    <AdminCard title={t('staffChannels.overview')}>
                        <DetailList
                            items={[
                                { label: t('staffChannels.channelId'), value: channel._id },
                                { label: t('staffChannels.name'), value: channel.name },
                                { label: t('staffChannels.description'), value: channel.description },
                                {
                                    label: t('staffCommon.owner'),
                                    value: ownerId ? (
                                        <Link
                                            to={`/Owner/Users/${ownerId}`}
                                            className="admin-btn admin-btn--ghost admin-btn--sm"
                                            title={ownerId}
                                        >
                                            {ownerLabel}
                                        </Link>
                                    ) : null,
                                },
                                {
                                    label: t('staffChannels.visibility'),
                                    value: (
                                        <StatusBadge tone={channel.visibility === 'public' ? 'info' : 'neutral'}>
                                            {channel.visibility === 'public'
                                                ? t('staffChannels.visibilityPublic')
                                                : channel.visibility === 'private'
                                                  ? t('staffChannels.visibilityPrivate')
                                                  : channel.visibility}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    label: t('staffChannels.type'),
                                    value: (
                                        <StatusBadge tone={channel.type === 'premium' ? 'warning' : 'neutral'}>
                                            {channel.type === 'premium'
                                                ? t('staffChannels.typePremium')
                                                : channel.type === 'normal'
                                                  ? t('staffChannels.typeNormal')
                                                  : channel.type}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    label: t('staffChannels.channelActive'),
                                    value: (
                                        <StatusBadge tone={channel.isActive ? 'success' : 'neutral'}>
                                            {channel.isActive ? t('staffCommon.yes') : t('staffCommon.no')}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    label: t('staffChannels.moderationStatus'),
                                    value: (
                                        <StatusBadge tone={isSuspended ? 'danger' : 'success'}>
                                            {isSuspended
                                                ? t('staffChannels.statusSuspended')
                                                : t('staffChannels.statusActive')}
                                        </StatusBadge>
                                    ),
                                },
                                { label: t('staffChannels.iconId'), value: channel.iconId },
                                {
                                    label: t('staffChannels.coverImage'),
                                    value: channel.coverImageUrl ? (
                                        <a href={channel.coverImageUrl} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={channel.coverImageUrl}
                                                alt={channel.name || t('staffChannels.coverImage')}
                                                style={{
                                                    display: 'block',
                                                    maxWidth: '180px',
                                                    maxHeight: '100px',
                                                    objectFit: 'cover',
                                                    borderRadius: '0.5rem',
                                                    marginBottom: '0.25rem',
                                                }}
                                            />
                                            <span>{t('staffChannels.openCover')}</span>
                                        </a>
                                    ) : null,
                                },
                                { label: t('staffCommon.createdAt'), value: formatDate(channel.createdAt, language) },
                            ]}
                        />
                    </AdminCard>

                    <AdminCard title={t('staffChannels.moderationSection')}>
                        {!hasModerationMeta ? (
                            <p className="admin-modal__description">{t('staffChannels.noModerationDecision')}</p>
                        ) : (
                            <DetailList
                                items={[
                                    {
                                        label: t('staffChannels.moderationStatus'),
                                        value: (
                                            <StatusBadge tone={isSuspended ? 'danger' : 'success'}>
                                                {isSuspended
                                                    ? t('staffChannels.statusSuspended')
                                                    : t('staffChannels.statusActive')}
                                            </StatusBadge>
                                        ),
                                    },
                                    {
                                        label: t('staffChannels.moderatedBy'),
                                        value: channel.moderatedBy ? (
                                            <Link
                                                to={`/Owner/Users/${channel.moderatedBy}`}
                                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                                title={channel.moderatedBy}
                                            >
                                                {shortId(channel.moderatedBy)}
                                            </Link>
                                        ) : null,
                                    },
                                    {
                                        label: t('staffChannels.moderatedAt'),
                                        value: channel.moderatedAt ? formatDate(channel.moderatedAt, language) : null,
                                    },
                                    { label: t('staffChannels.moderationReason'), value: channel.moderationReason },
                                ]}
                            />
                        )}
                    </AdminCard>
                </>
            )}

            <ReasonModal
                open={modalOpen}
                title={isSuspended ? t('staffChannels.restoreTitle') : t('staffChannels.suspendTitle')}
                description={
                    isSuspended ? t('staffChannels.restoreDescription') : t('staffChannels.suspendDescription')
                }
                confirmLabel={isSuspended ? t('staffChannels.restoreConfirm') : t('staffChannels.suspendConfirm')}
                tone={isSuspended ? 'primary' : 'danger'}
                maxLength={500}
                reasonRequired
                onConfirm={handleModerate}
                onClose={() => setModalOpen(false)}
            />
        </AdminPage>
    );
}
