import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MdFolder } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { contentAdmin } from '../../../services/admin/contentAdmin';
import { AdminCard, AdminPage, AdminTable, FilterBar, StatusBadge } from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate, shortId } from '../_shared/formatters';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const PARENT_ID_RE = /^(?:root|[a-fA-F0-9]{24})$/;

function FoldersBrowser({ initialFilters, onClearScope }) {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [scopeReady, setScopeReady] = useState(
        Boolean(initialFilters.userId?.trim() || initialFilters.channelId?.trim()),
    );

    const list = useAdminList('staff:folders', contentAdmin.listFolders, {
        initialFilters,
        enabled: scopeReady,
    });

    const hasLiveScope = Boolean(list.filters.userId?.trim() || list.filters.channelId?.trim());

    useEffect(() => {
        if (!hasLiveScope) {
            setScopeReady(false);
            return undefined;
        }
        if (scopeReady) return undefined;
        const timer = setTimeout(() => setScopeReady(true), 360);
        return () => clearTimeout(timer);
    }, [hasLiveScope, scopeReady]);

    const filterFields = [
        {
            key: 'userId',
            label: t('staffFolders.userId'),
            type: 'text',
            placeholder: t('staffFolders.userIdPlaceholder'),
        },
        {
            key: 'channelId',
            label: t('staffFolders.channelId'),
            type: 'text',
            placeholder: t('staffFolders.channelIdPlaceholder'),
        },
        {
            key: 'parentId',
            label: t('staffFolders.parentId'),
            type: 'text',
            placeholder: t('staffFolders.parentIdPlaceholder'),
        },
        {
            key: 'name',
            label: t('staffFolders.name'),
            type: 'text',
            placeholder: t('staffFolders.namePlaceholder'),
        },
        {
            key: 'isArchive',
            label: t('staffFolders.isArchive'),
            type: 'select',
            options: [
                { value: 'true', label: t('staffFolders.archived') },
                { value: 'false', label: t('staffFolders.notArchived') },
            ],
        },
    ];

    const columns = [
        { key: 'name', header: t('staffFolders.name') },
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
            key: 'parentFolder',
            header: t('staffFolders.parent'),
            render: (row) =>
                row.parentFolder ? (
                    <Link
                        to={`/Owner/Folders/${row.parentFolder}`}
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        title={row.parentFolder}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {shortId(row.parentFolder)}
                    </Link>
                ) : (
                    <StatusBadge tone="info">{t('staffFolders.parentRoot')}</StatusBadge>
                ),
        },
        {
            key: 'isArchive',
            header: t('staffFolders.isArchive'),
            render: (row) => (
                <StatusBadge tone={row.isArchive ? 'warning' : 'neutral'}>
                    {row.isArchive ? t('staffCommon.yes') : t('staffCommon.no')}
                </StatusBadge>
            ),
        },
        {
            key: 'createdAt',
            header: t('staffCommon.createdAt'),
            render: (row) => formatDate(row.createdAt, language),
        },
    ];

    return (
        <>
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={list.resetFilters}
            />
            {!hasLiveScope ? (
                <AdminCard title={t('staffFolders.scopeTitle')}>
                    <p className="admin-modal__description">{t('staffFolders.scopeRequiredError')}</p>
                    <div style={{ marginTop: '1rem' }}>
                        <button type="button" className="admin-btn admin-btn--secondary" onClick={onClearScope}>
                            {t('staffFolders.changeScope')}
                        </button>
                    </div>
                </AdminCard>
            ) : (
                <AdminTable
                    title={t('staffFolders.tableTitle')}
                    columns={columns}
                    rows={list.rows}
                    loading={list.isLoading || !scopeReady}
                    error={list.error}
                    onRetry={list.refetch}
                    onRowClick={(row) => navigate(`/Owner/Folders/${row._id}`)}
                    meta={list.meta}
                    onPageChange={list.setPage}
                />
            )}
        </>
    );
}

export default function AdminFolders() {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();

    const urlUserId = (searchParams.get('userId') || '').trim();
    const urlChannelId = (searchParams.get('channelId') || '').trim();
    const urlParentId = (searchParams.get('parentId') || '').trim();
    const hasUrlScope = Boolean(urlUserId || urlChannelId);

    const [draftUserId, setDraftUserId] = useState(urlUserId);
    const [draftChannelId, setDraftChannelId] = useState(urlChannelId);
    const [draftParentId, setDraftParentId] = useState(urlParentId);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        setDraftUserId(urlUserId);
        setDraftChannelId(urlChannelId);
        setDraftParentId(urlParentId);
        setFormError('');
    }, [urlUserId, urlChannelId, urlParentId]);

    const handleScopeSubmit = (e) => {
        e.preventDefault();
        const nextUserId = draftUserId.trim();
        const nextChannelId = draftChannelId.trim();
        const nextParentId = draftParentId.trim();

        if (!nextUserId && !nextChannelId) {
            setFormError(t('staffFolders.scopeRequiredError'));
            return;
        }
        if (nextUserId && !OBJECT_ID_RE.test(nextUserId)) {
            setFormError(`${t('staffFolders.userId')}: ${t('staffFolders.invalidObjectId')}`);
            return;
        }
        if (nextChannelId && !OBJECT_ID_RE.test(nextChannelId)) {
            setFormError(`${t('staffFolders.channelId')}: ${t('staffFolders.invalidObjectId')}`);
            return;
        }
        if (nextParentId && !PARENT_ID_RE.test(nextParentId)) {
            setFormError(`${t('staffFolders.parentId')}: ${t('staffFolders.invalidParentId')}`);
            return;
        }

        setFormError('');
        const params = {};
        if (nextUserId) params.userId = nextUserId;
        if (nextChannelId) params.channelId = nextChannelId;
        if (nextParentId) params.parentId = nextParentId;
        setSearchParams(params);
    };

    const handleClearScope = () => {
        setDraftUserId('');
        setDraftChannelId('');
        setDraftParentId('');
        setFormError('');
        setSearchParams({});
    };

    const scopeKey = `${urlUserId}|${urlChannelId}|${urlParentId}`;

    return (
        <AdminPage
            icon={MdFolder}
            title={t('staffFolders.title')}
            subtitle={t('staffFolders.subtitle')}
            actions={
                hasUrlScope && (
                    <button type="button" className="admin-btn admin-btn--secondary" onClick={handleClearScope}>
                        {t('staffFolders.changeScope')}
                    </button>
                )
            }
        >
            {!hasUrlScope ? (
                <AdminCard title={t('staffFolders.scopeTitle')}>
                    <form onSubmit={handleScopeSubmit} className="admin-form">
                        <p className="admin-modal__description">{t('staffFolders.scopeDescription')}</p>
                        <div className="admin-form-grid">
                            <label className="admin-field">
                                <span className="admin-field__label">{t('staffFolders.userId')}</span>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={draftUserId}
                                    placeholder={t('staffFolders.userIdPlaceholder')}
                                    onChange={(e) => setDraftUserId(e.target.value)}
                                />
                            </label>
                            <label className="admin-field">
                                <span className="admin-field__label">{t('staffFolders.channelId')}</span>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={draftChannelId}
                                    placeholder={t('staffFolders.channelIdPlaceholder')}
                                    onChange={(e) => setDraftChannelId(e.target.value)}
                                />
                            </label>
                            <label className="admin-field">
                                <span className="admin-field__label">{t('staffFolders.parentId')}</span>
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={draftParentId}
                                    placeholder={t('staffFolders.parentIdPlaceholder')}
                                    onChange={(e) => setDraftParentId(e.target.value)}
                                />
                            </label>
                        </div>
                        {formError && <span className="admin-field__error">{formError}</span>}
                        <div>
                            <button type="submit" className="admin-btn admin-btn--primary">
                                {t('staffFolders.loadFolders')}
                            </button>
                        </div>
                    </form>
                </AdminCard>
            ) : (
                <FoldersBrowser
                    key={scopeKey}
                    initialFilters={{
                        userId: urlUserId,
                        channelId: urlChannelId,
                        parentId: urlParentId,
                        name: searchParams.get('name') || '',
                        isArchive: searchParams.get('isArchive') || '',
                    }}
                    onClearScope={handleClearScope}
                />
            )}
        </AdminPage>
    );
}
