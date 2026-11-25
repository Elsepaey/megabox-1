import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MdInsertDriveFile } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { contentAdmin } from '../../../services/admin/contentAdmin';
import { AdminPage, AdminTable, FilterBar, StatusBadge } from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatBytes, formatDate, shortId } from '../_shared/formatters';

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

const DEFAULT_FILTERS = {
    ownerId: '',
    channelId: '',
    fileType: '',
    uploadStatus: '',
    moderationStatus: '',
    from: '',
    to: '',
};

export default function AdminFiles() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialFilters = {
        ownerId: searchParams.get('ownerId') || '',
        channelId: searchParams.get('channelId') || '',
        fileType: searchParams.get('fileType') || '',
        uploadStatus: searchParams.get('uploadStatus') || '',
        moderationStatus: searchParams.get('moderationStatus') || '',
        from: searchParams.get('from') || '',
        to: searchParams.get('to') || '',
    };

    const list = useAdminList('staff:files', contentAdmin.listFiles, {
        initialFilters,
        defaultFilters: DEFAULT_FILTERS,
    });

    const handleReset = () => {
        list.resetFilters();
        setSearchParams({}, { replace: true });
    };

    const filterFields = [
        {
            key: 'ownerId',
            label: t('staffFiles.ownerId'),
            type: 'text',
            placeholder: t('staffFiles.ownerIdPlaceholder'),
        },
        {
            key: 'channelId',
            label: t('staffFiles.channelId'),
            type: 'text',
            placeholder: t('staffFiles.channelIdPlaceholder'),
        },
        {
            key: 'fileType',
            label: t('staffFiles.fileType'),
            type: 'text',
            placeholder: t('staffFiles.fileTypePlaceholder'),
        },
        {
            key: 'uploadStatus',
            label: t('staffFiles.uploadStatus'),
            type: 'select',
            options: [
                { value: 'pending', label: t('staffFiles.uploadPending') },
                { value: 'uploading', label: t('staffFiles.uploadUploading') },
                { value: 'completed', label: t('staffFiles.uploadCompleted') },
                { value: 'failed', label: t('staffFiles.uploadFailed') },
            ],
        },
        {
            key: 'moderationStatus',
            label: t('staffFiles.moderationStatus'),
            type: 'select',
            options: [
                { value: 'active', label: t('staffFiles.statusActive') },
                { value: 'restricted', label: t('staffFiles.statusRestricted') },
            ],
        },
        { key: 'from', label: t('staffCommon.from'), type: 'date' },
        { key: 'to', label: t('staffCommon.to'), type: 'date' },
    ];

    const columns = [
        { key: 'fileName', header: t('staffFiles.fileName') },
        { key: 'fileType', header: t('staffFiles.fileType') },
        {
            key: 'fileSize',
            header: t('staffFiles.fileSize'),
            render: (row) => formatBytes(row.fileSize),
        },
        {
            key: 'userId',
            header: t('staffCommon.owner'),
            render: (row) =>
                row.userId ? (
                    <Link
                        to={`/Owner/Users/${row.userId}`}
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        title={row.userId}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {shortId(row.userId)}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'channelId',
            header: t('staffFolders.channel'),
            render: (row) =>
                row.channelId ? (
                    <Link
                        to={`/Owner/Channels/${row.channelId}`}
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        title={row.channelId}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {shortId(row.channelId)}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'uploadStatus',
            header: t('staffFiles.uploadStatus'),
            render: (row) => {
                const labelKey = uploadStatusKey(row.uploadStatus);
                return (
                    <StatusBadge tone={uploadStatusTone(row.uploadStatus)}>
                        {labelKey ? t(labelKey) : row.uploadStatus || '—'}
                    </StatusBadge>
                );
            },
        },
        {
            key: 'moderationStatus',
            header: t('staffFiles.moderationStatus'),
            render: (row) => {
                const restricted = row.moderationStatus === 'restricted';
                return (
                    <StatusBadge tone={restricted ? 'danger' : 'success'}>
                        {restricted ? t('staffFiles.statusRestricted') : t('staffFiles.statusActive')}
                    </StatusBadge>
                );
            },
        },
        {
            key: 'createdAt',
            header: t('staffCommon.createdAt'),
            render: (row) => formatDate(row.createdAt, language),
        },
    ];

    return (
        <AdminPage icon={MdInsertDriveFile} title={t('staffFiles.title')} subtitle={t('staffFiles.subtitle')}>
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={handleReset}
            />
            <AdminTable
                title={t('staffFiles.tableTitle')}
                columns={columns}
                rows={list.rows}
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                onRowClick={(row) => navigate(`/Owner/Files/${row._id}`)}
                meta={list.meta}
                onPageChange={list.setPage}
            />
        </AdminPage>
    );
}
