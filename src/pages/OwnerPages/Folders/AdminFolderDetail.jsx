import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { MdFolder } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { contentAdmin } from '../../../services/admin/contentAdmin';
import {
    AdminCard,
    AdminPage,
    DetailList,
    ErrorState,
    LoadingState,
    StatTile,
    StatusBadge,
} from '../_shared/AdminUI';
import { formatDate, formatNumber, shortId } from '../_shared/formatters';

function parentStateTone(state) {
    if (state === 'available') return 'success';
    if (state === 'missing') return 'danger';
    return 'info';
}

function parentStateKey(state) {
    if (state === 'available') return 'staffFolders.parentAvailable';
    if (state === 'missing') return 'staffFolders.parentMissing';
    return 'staffFolders.parentRoot';
}

function buildFoldersLink({ userId, channelId, parentId }) {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (channelId) params.set('channelId', channelId);
    if (parentId) params.set('parentId', parentId);
    const qs = params.toString();
    return qs ? `/Owner/Folders?${qs}` : '/Owner/Folders';
}

export default function AdminFolderDetail() {
    const { id } = useParams();
    const { t, language } = useLanguage();

    const query = useQuery(['staff:folder', id], () => contentAdmin.getFolder(id), {
        retry: false,
        refetchOnWindowFocus: false,
    });

    const folder = query.data;
    const ownerId = folder?.owner?._id || folder?.userId;
    const ownerLabel = folder?.owner?.username
        ? `${folder.owner.username} (${shortId(ownerId)})`
        : ownerId
          ? shortId(ownerId)
          : null;

    const childFoldersUrl = folder
        ? buildFoldersLink({
              userId: folder.userId,
              channelId: folder.channelId,
              parentId: folder._id,
          })
        : '/Owner/Folders';

    const backUrl = folder
        ? buildFoldersLink({
              userId: folder.userId,
              channelId: folder.channelId,
          })
        : '/Owner/Folders';

    const filesUrl = folder?.channelId
        ? `/Owner/Files?channelId=${folder.channelId}`
        : folder?.userId
          ? `/Owner/Files?ownerId=${folder.userId}`
          : null;

    const headerActions = (
        <>
            <Link to={backUrl} className="admin-btn admin-btn--secondary">
                {t('staffCommon.back')}
            </Link>
            {folder && (
                <>
                    <Link to={childFoldersUrl} className="admin-btn admin-btn--primary">
                        {t('staffFolders.viewChildFolders')}
                    </Link>
                    {filesUrl && (
                        <Link to={filesUrl} className="admin-btn admin-btn--secondary">
                            {folder.channelId ? t('staffFolders.viewChannelFiles') : t('staffFolders.viewUserFiles')}
                        </Link>
                    )}
                </>
            )}
        </>
    );

    const renderParentValue = () => {
        if (!folder) return null;
        if (folder.parentState === 'root') return t('staffFolders.parentRoot');
        if (folder.parentState === 'available' && folder.parent) {
            return (
                <Link
                    to={`/Owner/Folders/${folder.parent._id}`}
                    className="admin-btn admin-btn--ghost admin-btn--sm"
                    title={folder.parent._id}
                >
                    {folder.parent.name || shortId(folder.parent._id)}
                </Link>
            );
        }
        if (folder.parentFolder) {
            return t('staffFolders.parentMissingValue', { id: folder.parentFolder });
        }
        return null;
    };

    return (
        <AdminPage
            icon={MdFolder}
            title={folder?.name || t('staffFolders.detailTitle')}
            subtitle={folder ? folder._id : t('staffFolders.detailSubtitle')}
            actions={headerActions}
        >
            {query.isLoading && <LoadingState />}
            {query.error && <ErrorState error={query.error} onRetry={query.refetch} />}
            {folder && (
                <>
                    <div className="admin-stat-grid">
                        <StatTile
                            label={t('staffFolders.directFiles')}
                            value={formatNumber(folder.fileCount, language)}
                        />
                        <StatTile
                            label={t('staffFolders.directFolders')}
                            value={formatNumber(folder.folderCount, language)}
                        />
                        <StatTile
                            label={t('staffFolders.parentState')}
                            value={t(parentStateKey(folder.parentState))}
                        />
                        <StatTile
                            label={t('staffFolders.isArchive')}
                            value={folder.isArchive ? t('staffCommon.yes') : t('staffCommon.no')}
                        />
                    </div>

                    <AdminCard title={t('staffFolders.overview')}>
                        <DetailList
                            items={[
                                { label: t('staffFolders.folderId'), value: folder._id },
                                { label: t('staffFolders.name'), value: folder.name },
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
                                    label: t('staffFolders.channel'),
                                    value: folder.channelId ? (
                                        <Link
                                            to={`/Owner/Channels/${folder.channelId}`}
                                            className="admin-btn admin-btn--ghost admin-btn--sm"
                                            title={folder.channelId}
                                        >
                                            {folder.channel?.name
                                                ? `${folder.channel.name} (${shortId(folder.channelId)})`
                                                : shortId(folder.channelId)}
                                        </Link>
                                    ) : null,
                                },
                                {
                                    label: t('staffFolders.parentState'),
                                    value: (
                                        <StatusBadge tone={parentStateTone(folder.parentState)}>
                                            {t(parentStateKey(folder.parentState))}
                                        </StatusBadge>
                                    ),
                                },
                                { label: t('staffFolders.parent'), value: renderParentValue() },
                                {
                                    label: t('staffFolders.isArchive'),
                                    value: (
                                        <StatusBadge tone={folder.isArchive ? 'warning' : 'neutral'}>
                                            {folder.isArchive ? t('staffCommon.yes') : t('staffCommon.no')}
                                        </StatusBadge>
                                    ),
                                },
                                {
                                    label: t('staffFolders.directFiles'),
                                    value: formatNumber(folder.fileCount, language),
                                },
                                {
                                    label: t('staffFolders.directFolders'),
                                    value: formatNumber(folder.folderCount, language),
                                },
                                {
                                    label: t('staffCommon.createdAt'),
                                    value: folder.createdAt ? formatDate(folder.createdAt, language) : null,
                                },
                                {
                                    label: t('staffCommon.updatedAt'),
                                    value: folder.updatedAt ? formatDate(folder.updatedAt, language) : null,
                                },
                            ]}
                        />
                    </AdminCard>
                </>
            )}
        </AdminPage>
    );
}
