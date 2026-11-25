import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import {
    MdArrowBack,
    MdFolder,
    MdNotifications,
    MdPerson,
    MdShare,
} from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import usersAdmin from '../../../services/admin/usersAdmin';
import storageAdmin from '../../../services/admin/storageAdmin';
import accountActivityAdmin from '../../../services/admin/accountActivityAdmin';
import {
    AdminCard,
    AdminModal,
    AdminPage,
    AdminTable,
    AdminTabs,
    DetailList,
    ErrorState,
    FilterBar,
    LoadingState,
    ReasonModal,
    StatTile,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import useStaffRole from '../_shared/useStaffRole';
import {
    formatBytes,
    formatDate,
    formatMb,
    formatNumber,
    shortId,
} from '../_shared/formatters';
import './UserDetail.scss';

function resolveAccountStatus(user) {
    if (user?.isDeleted) return { key: 'deleted', tone: 'danger' };
    if (user?.isBanned) return { key: 'banned', tone: 'danger' };
    if (user?.isclosed) return { key: 'closed', tone: 'warning' };
    return { key: 'active', tone: 'success' };
}

function roleTone(role) {
    if (role === 'Owner') return 'info';
    if (role === 'Admin') return 'warning';
    return 'neutral';
}

function stateTone(state) {
    if (state === 'available' || state === 'active' || state === 'root') return 'success';
    if (state === 'missing') return 'danger';
    if (state === 'inactive' || state === 'unverified') return 'warning';
    return 'neutral';
}

function makeRequestKey(userId) {
    const rand = Math.random().toString(36).slice(2, 10);
    return `user-notice:${userId}:${Date.now()}-${rand}`;
}

function StorageBar({ label, section, t }) {
    const pct = Math.min(100, Math.max(0, Number(section?.usage_percentage ?? 0)));
    const fillClass = pct >= 95
        ? 'user-storage-bar__fill user-storage-bar__fill--danger'
        : pct >= 80
            ? 'user-storage-bar__fill user-storage-bar__fill--warn'
            : 'user-storage-bar__fill';

    return (
        <div className="user-storage-bar">
            <div className="user-storage-bar__header">
                <span>{label}</span>
                <span>{pct}%</span>
            </div>
            <div className="user-storage-bar__track">
                <div className={fillClass} style={{ width: `${pct}%` }} />
            </div>
            <div className="user-storage-bar__meta">
                <span>
                    {t('staffUsers.detail.storage.usedOf', {
                        used: formatMb(section?.used_mb ?? 0),
                        total: formatMb(section?.total_mb ?? 0),
                        percent: pct,
                    })}
                </span>
                <span>
                    {t('staffUsers.detail.storage.available', {
                        available: formatMb(section?.available_mb ?? 0),
                    })}
                </span>
            </div>
        </div>
    );
}

function OverviewTab({ user, t, language }) {
    const status = resolveAccountStatus(user);
    const role = user.role || 'User';

    const items = [
        { label: t('staffUsers.detail.fields.id'), value: user._id },
        { label: t('staffUsers.detail.fields.username'), value: user.username },
        { label: t('staffUsers.detail.fields.email'), value: user.email },
        { label: t('staffUsers.detail.fields.provider'), value: user.provider },
        { label: t('staffUsers.detail.fields.role'), value: t(`staffUsers.roles.${role}`) },
        { label: t('staffUsers.detail.fields.status'), value: t(`staffUsers.statuses.${status.key}`) },
        { label: t('staffUsers.detail.fields.confirmed'), value: user.isConfirmed ? t('staffCommon.yes') : t('staffCommon.no') },
        { label: t('staffUsers.detail.fields.promoter'), value: user.isPromoter ? t('staffCommon.yes') : t('staffCommon.no') },
        { label: t('staffUsers.detail.fields.premium'), value: user.isBrimume ? t('staffCommon.yes') : t('staffCommon.no') },
        { label: t('staffUsers.detail.fields.premiumExpires'), value: user.brimumeExpiresAt ? formatDate(user.brimumeExpiresAt, language) : null },
        { label: t('staffUsers.detail.fields.language'), value: user.language },
        { label: t('staffUsers.detail.fields.country'), value: user.country },
        { label: t('staffUsers.detail.fields.freeQuota'), value: formatMb(user.free_storage_quota_mb) },
        { label: t('staffUsers.detail.fields.paidQuota'), value: formatMb(user.paid_storage_quota_mb) },
        { label: t('staffUsers.detail.fields.savesQuota'), value: formatMb(user.saves_quota_mb) },
        { label: t('staffUsers.detail.fields.createdAt'), value: formatDate(user.createdAt, language) },
        ...(user.bannedAt ? [{ label: t('staffUsers.detail.fields.bannedAt'), value: formatDate(user.bannedAt, language) }] : []),
        ...(user.deletedAt ? [{ label: t('staffUsers.detail.fields.deletedAt'), value: formatDate(user.deletedAt, language) }] : []),
    ];

    return (
        <>
            <AdminCard title={t('staffUsers.detail.accountInfo')}>
                <DetailList items={items} />
            </AdminCard>

            {user.adminBanDecision && (
                <AdminCard title={t('staffUsers.detail.decisions.banTitle')}>
                    <DetailList
                        items={[
                            { label: t('staffUsers.detail.decisions.actor'), value: user.adminBanDecision.actorId },
                            { label: t('staffUsers.detail.decisions.at'), value: formatDate(user.adminBanDecision.at, language) },
                            { label: t('staffUsers.detail.decisions.reason'), value: user.adminBanDecision.reason },
                        ]}
                    />
                </AdminCard>
            )}

            {user.adminRoleDecision && (
                <AdminCard title={t('staffUsers.detail.decisions.roleTitle')}>
                    <DetailList
                        items={[
                            { label: t('staffUsers.detail.decisions.actor'), value: user.adminRoleDecision.actorId },
                            { label: t('staffUsers.detail.decisions.at'), value: formatDate(user.adminRoleDecision.at, language) },
                            { label: t('staffUsers.detail.decisions.reason'), value: user.adminRoleDecision.reason },
                        ]}
                    />
                </AdminCard>
            )}
        </>
    );
}

function StorageTab({ userId, currentFreeQuota, t, language, onConflictReload }) {
    const queryClient = useQueryClient();
    const [quotaInput, setQuotaInput] = useState(
        currentFreeQuota !== undefined && currentFreeQuota !== null ? String(currentFreeQuota) : '',
    );
    const [recalcResult, setRecalcResult] = useState(null);

    useEffect(() => {
        setQuotaInput(
            currentFreeQuota !== undefined && currentFreeQuota !== null ? String(currentFreeQuota) : '',
        );
    }, [currentFreeQuota]);

    const storageQuery = useQuery(
        ['staff:user:storage', userId],
        () => storageAdmin.getUserStorage(userId),
        { retry: false, refetchOnWindowFocus: false },
    );

    const recalcMutation = useMutation(
        () => storageAdmin.recalculateUserStorage(userId),
        {
            onSuccess: (res) => {
                setRecalcResult(res);
                toast.success(t('staffUsers.detail.storage.recalculateSuccess'), ToastOptions('success'));
                queryClient.invalidateQueries(['staff:user:storage', userId]);
            },
            onError: (err) => {
                if (apiErrorStatus(err) === 409) {
                    onConflictReload();
                    queryClient.invalidateQueries(['staff:user:storage', userId]);
                }
            },
        },
    );

    const quotaMutation = useMutation(
        (mb) => storageAdmin.updateUserSpace(userId, mb),
        {
            onSuccess: () => {
                toast.success(t('staffUsers.detail.storage.quotaSuccess'), ToastOptions('success'));
                queryClient.invalidateQueries(['staff:user', userId]);
                queryClient.invalidateQueries(['staff:user:storage', userId]);
            },
        },
    );

    const parsedQuota = quotaInput === '' ? null : Number(quotaInput);
    const quotaValid = parsedQuota !== null
        && Number.isFinite(parsedQuota)
        && parsedQuota >= 0
        && parsedQuota <= Number.MAX_SAFE_INTEGER;

    const submitQuota = (e) => {
        e.preventDefault();
        if (!quotaValid || quotaMutation.isLoading) return;
        quotaMutation.mutate(parsedQuota);
    };

    if (storageQuery.isLoading) return <LoadingState />;
    if (storageQuery.error) return <ErrorState error={storageQuery.error} onRetry={storageQuery.refetch} />;

    const usage = storageQuery.data;
    const grace = usage?.grace_period;

    return (
        <>
            <AdminCard
                title={t('staffUsers.detail.storage.usageTitle')}
                actions={(
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        disabled={recalcMutation.isLoading}
                        onClick={() => recalcMutation.mutate()}
                    >
                        {recalcMutation.isLoading
                            ? t('staffUsers.detail.storage.recalculating')
                            : t('staffUsers.detail.storage.recalculate')}
                    </button>
                )}
            >
                <div className="user-storage-bars">
                    <StorageBar label={t('staffUsers.detail.storage.freeDrive')} section={usage?.free_drive} t={t} />
                    <StorageBar label={t('staffUsers.detail.storage.paidDrive')} section={usage?.paid_drive} t={t} />
                    <StorageBar label={t('staffUsers.detail.storage.saves')} section={usage?.saves} t={t} />
                </div>
            </AdminCard>

            {grace && (
                <AdminCard title={t('staffUsers.detail.storage.graceTitle')}>
                    <DetailList
                        items={[
                            {
                                label: t('staffUsers.detail.storage.inGrace'),
                                value: (
                                    <StatusBadge tone={grace.in_grace_period ? 'warning' : 'success'}>
                                        {grace.in_grace_period ? t('staffCommon.yes') : t('staffCommon.no')}
                                    </StatusBadge>
                                ),
                            },
                            ...(grace.in_grace_period
                                ? [
                                    { label: t('staffUsers.detail.storage.suspendedSpace'), value: formatMb(grace.suspended_mb) },
                                    { label: t('staffUsers.detail.storage.suspendedFiles'), value: formatNumber(grace.files_count, language) },
                                    { label: t('staffUsers.detail.storage.deletionDeadline'), value: formatDate(grace.deletion_deadline, language) },
                                ]
                                : []),
                        ]}
                    />
                </AdminCard>
            )}

            {recalcResult && (
                <AdminCard title={t('staffUsers.detail.storage.recalcResultTitle')}>
                    <div className="user-recalc-grid">
                        <DetailList
                            items={[
                                { label: `${t('staffUsers.detail.storage.before')} — ${t('staffUsers.detail.storage.freeDrive')}`, value: formatMb(recalcResult.before?.free_drive?.used_mb) },
                                { label: `${t('staffUsers.detail.storage.after')} — ${t('staffUsers.detail.storage.freeDrive')}`, value: formatMb(recalcResult.after?.free_drive?.used_mb) },
                                { label: `${t('staffUsers.detail.storage.before')} — ${t('staffUsers.detail.storage.paidDrive')}`, value: formatMb(recalcResult.before?.paid_drive?.used_mb) },
                                { label: `${t('staffUsers.detail.storage.after')} — ${t('staffUsers.detail.storage.paidDrive')}`, value: formatMb(recalcResult.after?.paid_drive?.used_mb) },
                                { label: t('staffUsers.detail.storage.recalculatedAt'), value: formatDate(recalcResult.recalculatedAt, language) },
                                ...(recalcResult.recalculatedBy
                                    ? [{ label: t('staffUsers.detail.storage.recalculatedBy'), value: recalcResult.recalculatedBy }]
                                    : []),
                            ]}
                        />
                    </div>
                </AdminCard>
            )}

            <AdminCard title={t('staffUsers.detail.storage.quotaTitle')}>
                <form className="admin-form" onSubmit={submitQuota}>
                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffUsers.detail.storage.quotaLabel')}</span>
                            <input
                                className="admin-input"
                                type="number"
                                min="0"
                                step="1"
                                value={quotaInput}
                                onChange={(e) => setQuotaInput(e.target.value)}
                                required
                            />
                        </label>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={!quotaValid || quotaMutation.isLoading}
                        >
                            {quotaMutation.isLoading ? t('staffCommon.saving') : t('staffUsers.detail.storage.quotaSubmit')}
                        </button>
                    </div>
                </form>
            </AdminCard>
        </>
    );
}

function DownloadsTab({ userId, t, language }) {
    const allowanceQuery = useQuery(
        ['staff:user:downloads:allowance', userId],
        () => accountActivityAdmin.getDownloadAllowance(userId),
        { retry: false, refetchOnWindowFocus: false },
    );

    const historyList = useAdminList(
        ['staff:user:downloads:history', userId],
        (params) => accountActivityAdmin.listDownloadHistory(userId, params),
        { initialFilters: { fileId: '', from: '', to: '' }, limit: 20 },
    );

    const filterFields = useMemo(
        () => [
            { key: 'fileId', label: t('staffUsers.detail.downloads.fileId'), type: 'text' },
            { key: 'from', label: t('staffCommon.from'), type: 'date' },
            { key: 'to', label: t('staffCommon.to'), type: 'date' },
        ],
        [t],
    );

    const columns = useMemo(
        () => [
            { key: 'fileName', header: t('staffUsers.detail.downloads.fileName'), render: (r) => r.fileName || '—' },
            { key: 'fileId', header: t('staffUsers.detail.downloads.fileId'), render: (r) => shortId(r.fileId) },
            { key: 'fileType', header: t('staffUsers.detail.downloads.fileType'), render: (r) => r.fileType || '—' },
            { key: 'fileSize', header: t('staffUsers.detail.downloads.fileSize'), render: (r) => formatBytes(r.fileSize) },
            { key: 'createdAt', header: t('staffUsers.detail.downloads.downloadedAt'), render: (r) => formatDate(r.createdAt, language) },
        ],
        [t, language],
    );

    const allowance = allowanceQuery.data;

    return (
        <>
            <AdminCard title={t('staffUsers.detail.downloads.allowanceTitle')}>
                {allowanceQuery.isLoading && <LoadingState />}
                {!allowanceQuery.isLoading && allowanceQuery.error && (
                    <ErrorState error={allowanceQuery.error} onRetry={allowanceQuery.refetch} />
                )}
                {!allowanceQuery.isLoading && !allowanceQuery.error && allowance && (
                    <div className="admin-stat-grid">
                        <StatTile
                            label={t('staffUsers.detail.downloads.allowed')}
                            value={allowance.allowed ? t('staffCommon.yes') : t('staffCommon.no')}
                        />
                        <StatTile
                            label={t('staffUsers.detail.downloads.used')}
                            value={formatNumber(allowance.used, language)}
                        />
                        <StatTile
                            label={t('staffUsers.detail.downloads.remaining')}
                            value={formatNumber(allowance.remaining, language)}
                        />
                        <StatTile
                            label={t('staffUsers.detail.downloads.limit')}
                            value={formatNumber(allowance.limit, language)}
                        />
                        <StatTile
                            label={t('staffUsers.detail.downloads.resetAt')}
                            value={allowance.downloadsResetAt ? formatDate(allowance.downloadsResetAt, language) : '—'}
                        />
                    </div>
                )}
            </AdminCard>

            <FilterBar
                fields={filterFields}
                values={historyList.filters}
                onChange={historyList.setFilter}
                onReset={historyList.resetFilters}
            />

            <AdminTable
                title={t('staffUsers.detail.downloads.historyTitle')}
                columns={columns}
                rows={historyList.rows}
                loading={historyList.isLoading}
                error={historyList.error}
                onRetry={historyList.refetch}
                meta={historyList.meta}
                onPageChange={historyList.setPage}
            />
        </>
    );
}

function SavesTab({ userId, t, language }) {
    const list = useAdminList(
        ['staff:user:saves', userId],
        (params) => accountActivityAdmin.listSavedItems(userId, params),
        {
            initialFilters: { folderId: '', itemType: '', shareId: '', originalFileId: '' },
            limit: 20,
        },
    );

    const filterFields = useMemo(
        () => [
            {
                key: 'folderId',
                label: t('staffUsers.detail.saves.folderId'),
                type: 'text',
                placeholder: t('staffUsers.detail.saves.folderIdPlaceholder'),
            },
            {
                key: 'itemType',
                label: t('staffUsers.detail.saves.itemType'),
                type: 'select',
                options: [
                    { value: 'file', label: t('staffUsers.detail.saves.types.file') },
                    { value: 'folder', label: t('staffUsers.detail.saves.types.folder') },
                ],
            },
            { key: 'shareId', label: t('staffUsers.detail.saves.shareId'), type: 'text' },
            { key: 'originalFileId', label: t('staffUsers.detail.saves.originalFileId'), type: 'text' },
        ],
        [t],
    );

    const columns = useMemo(
        () => [
            {
                key: 'itemType',
                header: t('staffUsers.detail.saves.columns.type'),
                render: (r) => (
                    <StatusBadge tone="info">
                        {t(`staffUsers.detail.saves.types.${r.itemType}`)}
                    </StatusBadge>
                ),
            },
            {
                key: 'name',
                header: t('staffUsers.detail.saves.columns.name'),
                render: (r) => r.fileName || r.name || '—',
            },
            {
                key: 'fileSize',
                header: t('staffUsers.detail.saves.columns.size'),
                render: (r) => (r.itemType === 'file' ? formatBytes(r.fileSize) : '—'),
            },
            {
                key: 'parent',
                header: t('staffUsers.detail.saves.columns.parent'),
                render: (r) => r.parent?.name || (r.parentFolder ? shortId(r.parentFolder) : '—'),
            },
            {
                key: 'parentState',
                header: t('staffUsers.detail.saves.columns.parentState'),
                render: (r) => (
                    <StatusBadge tone={stateTone(r.parentState)}>
                        {t(`staffUsers.detail.saves.states.${r.parentState}`)}
                    </StatusBadge>
                ),
            },
            {
                key: 'originalState',
                header: t('staffUsers.detail.saves.columns.originalState'),
                render: (r) => (
                    <StatusBadge tone={stateTone(r.originalState)}>
                        {t(`staffUsers.detail.saves.states.${r.originalState}`)}
                    </StatusBadge>
                ),
            },
            {
                key: 'shareState',
                header: t('staffUsers.detail.saves.columns.shareState'),
                render: (r) => (
                    r.shareState
                        ? (
                            <StatusBadge tone={stateTone(r.shareState)}>
                                {t(`staffUsers.detail.saves.states.${r.shareState}`)}
                            </StatusBadge>
                        )
                        : '—'
                ),
            },
            {
                key: 'createdAt',
                header: t('staffUsers.detail.saves.columns.created'),
                render: (r) => formatDate(r.createdAt, language),
            },
        ],
        [t, language],
    );

    return (
        <>
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={list.resetFilters}
            />
            <AdminTable
                title={t('staffUsers.detail.saves.title')}
                columns={columns}
                rows={list.rows}
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                meta={list.meta}
                onPageChange={list.setPage}
            />
        </>
    );
}

function ArchivesTab({ userId, t, language }) {
    const list = useAdminList(
        ['staff:user:archives', userId],
        (params) => accountActivityAdmin.listArchives(userId, params),
        { initialFilters: { itemType: '' }, limit: 20 },
    );

    const filterFields = useMemo(
        () => [
            {
                key: 'itemType',
                label: t('staffUsers.detail.archives.itemType'),
                type: 'select',
                options: [
                    { value: 'file', label: t('staffUsers.detail.saves.types.file') },
                    { value: 'folder', label: t('staffUsers.detail.saves.types.folder') },
                ],
            },
        ],
        [t],
    );

    const columns = useMemo(
        () => [
            {
                key: 'itemType',
                header: t('staffUsers.detail.archives.columns.type'),
                render: (r) => (
                    <StatusBadge tone="info">
                        {t(`staffUsers.detail.saves.types.${r.itemType}`)}
                    </StatusBadge>
                ),
            },
            { key: 'name', header: t('staffUsers.detail.archives.columns.name'), render: (r) => r.name || '—' },
            { key: 'fileType', header: t('staffUsers.detail.archives.columns.fileType'), render: (r) => r.fileType || '—' },
            {
                key: 'fileSize',
                header: t('staffUsers.detail.archives.columns.size'),
                render: (r) => (r.itemType === 'file' ? formatBytes(r.fileSize) : '—'),
            },
            {
                key: 'uploadStatus',
                header: t('staffUsers.detail.archives.columns.uploadStatus'),
                render: (r) => r.uploadStatus || '—',
            },
            {
                key: 'createdAt',
                header: t('staffUsers.detail.archives.columns.created'),
                render: (r) => formatDate(r.createdAt, language),
            },
            {
                key: 'detailPath',
                header: t('staffUsers.detail.archives.columns.detail'),
                render: (r) => {
                    if (!r.detailPath) return '—';
                    const target = r.itemType === 'folder'
                        ? `/Owner/Folders/${r._id}`
                        : `/Owner/Files/${r._id}`;
                    return (
                        <Link to={target} className="admin-btn admin-btn--ghost admin-btn--sm">
                            {t('staffUsers.detail.archives.openDetail')}
                        </Link>
                    );
                },
            },
        ],
        [t, language],
    );

    return (
        <>
            <FilterBar
                fields={filterFields}
                values={list.filters}
                onChange={list.setFilter}
                onReset={list.resetFilters}
            />
            <AdminTable
                title={t('staffUsers.detail.archives.title')}
                columns={columns}
                rows={list.rows}
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                meta={list.meta}
                onPageChange={list.setPage}
            />
        </>
    );
}

function EarningsTab({ userId, t, language }) {
    const list = useAdminList(
        ['staff:user:earnings', userId],
        (params) => accountActivityAdmin.listEarnings(userId, params),
        { initialFilters: {}, limit: 20 },
    );

    const totals = list.data?.totals;

    const columns = useMemo(
        () => [
            {
                key: 'fileName',
                header: t('staffUsers.detail.earnings.columns.fileName'),
                render: (r) => (
                    <Link to={`/Owner/Files/${r.fileId}`} className="admin-btn admin-btn--ghost admin-btn--sm">
                        {r.fileName || shortId(r.fileId)}
                    </Link>
                ),
            },
            {
                key: 'totalEarnings',
                header: t('staffUsers.detail.earnings.columns.totalEarnings'),
                render: (r) => formatNumber(r.totalEarnings, language),
            },
            {
                key: 'pendingRewards',
                header: t('staffUsers.detail.earnings.columns.pendingRewards'),
                render: (r) => formatNumber(r.pendingRewards, language),
            },
            {
                key: 'confirmedRewards',
                header: t('staffUsers.detail.earnings.columns.confirmedRewards'),
                render: (r) => formatNumber(r.confirmedRewards, language),
            },
            {
                key: 'lastUpdated',
                header: t('staffUsers.detail.earnings.columns.lastUpdated'),
                render: (r) => formatDate(r.lastUpdated, language),
            },
        ],
        [t, language],
    );

    return (
        <>
            {totals && (
                <div className="admin-stat-grid">
                    <StatTile
                        label={t('staffUsers.detail.earnings.totalEarnings')}
                        value={formatNumber(totals.totalEarnings, language)}
                    />
                    <StatTile
                        label={t('staffUsers.detail.earnings.pendingRewards')}
                        value={formatNumber(totals.pendingRewards, language)}
                    />
                    <StatTile
                        label={t('staffUsers.detail.earnings.confirmedRewards')}
                        value={formatNumber(totals.confirmedRewards, language)}
                    />
                </div>
            )}
            <AdminTable
                title={t('staffUsers.detail.earnings.title')}
                columns={columns}
                rows={list.rows}
                rowKey="fileId"
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                meta={list.meta}
                onPageChange={list.setPage}
            />
        </>
    );
}

export default function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t, language } = useLanguage();
    const { userId: staffUserId, isOwner } = useStaffRole();

    const [activeTab, setActiveTab] = useState('overview');
    const [banModalOpen, setBanModalOpen] = useState(false);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [nextRole, setNextRole] = useState('Admin');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [grantModalOpen, setGrantModalOpen] = useState(false);
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [notifyModalOpen, setNotifyModalOpen] = useState(false);

    // Grant premium form state
    const [planId, setPlanId] = useState('');
    const [durationDays, setDurationDays] = useState('');
    const [pricePaid, setPricePaid] = useState('');
    const [paymentReference, setPaymentReference] = useState('');

    // Notification form state
    const [notifyTitle, setNotifyTitle] = useState('');
    const [notifyBody, setNotifyBody] = useState('');

    const userQuery = useQuery(
        ['staff:user', id],
        () => usersAdmin.get(id),
        { retry: false, refetchOnWindowFocus: false, enabled: Boolean(id) },
    );

    const plansQuery = useQuery(
        'staff:plans',
        usersAdmin.listPlans,
        { retry: false, refetchOnWindowFocus: false, enabled: grantModalOpen },
    );

    const activePaidPlans = useMemo(
        () => (plansQuery.data?.plans || []).filter((p) => p.is_active && p.type !== 'free'),
        [plansQuery.data],
    );

    const handleConflictReload = () => {
        toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
        queryClient.invalidateQueries(['staff:user', id]);
        queryClient.invalidateQueries(['staff:user:storage', id]);
        queryClient.invalidateQueries('staff:users');
    };

    const onMutationError = (err) => {
        if (apiErrorStatus(err) === 409) {
            setBanModalOpen(false);
            setRoleModalOpen(false);
            setDeleteModalOpen(false);
            setGrantModalOpen(false);
            setRevokeModalOpen(false);
            handleConflictReload();
        }
    };

    const banMutation = useMutation(
        ({ isBanned, reason }) => usersAdmin.setBan(id, { isBanned, reason }),
        {
            onSuccess: (_, { isBanned }) => {
                toast.success(
                    isBanned ? t('staffUsers.detail.modals.banSuccess') : t('staffUsers.detail.modals.unbanSuccess'),
                    ToastOptions('success'),
                );
                setBanModalOpen(false);
                queryClient.invalidateQueries(['staff:user', id]);
                queryClient.invalidateQueries('staff:users');
            },
            onError: onMutationError,
        },
    );

    const roleMutation = useMutation(
        ({ role, reason }) => usersAdmin.setRole(id, { role, reason }),
        {
            onSuccess: () => {
                toast.success(t('staffUsers.detail.modals.roleSuccess'), ToastOptions('success'));
                setRoleModalOpen(false);
                queryClient.invalidateQueries(['staff:user', id]);
                queryClient.invalidateQueries('staff:users');
            },
            onError: onMutationError,
        },
    );

    const deleteMutation = useMutation(
        () => usersAdmin.deleteUser(id),
        {
            onSuccess: () => {
                toast.success(t('staffUsers.detail.modals.deleteSuccess'), ToastOptions('success'));
                setDeleteModalOpen(false);
                queryClient.invalidateQueries('staff:users');
                navigate('/Owner/Users');
            },
            onError: onMutationError,
        },
    );

    const grantMutation = useMutation(
        (payload) => usersAdmin.grantSubscription(id, payload),
        {
            onSuccess: () => {
                toast.success(t('staffUsers.detail.modals.grantSuccess'), ToastOptions('success'));
                setGrantModalOpen(false);
                queryClient.invalidateQueries(['staff:user', id]);
                queryClient.invalidateQueries(['staff:user:storage', id]);
                queryClient.invalidateQueries('staff:users');
            },
            onError: onMutationError,
        },
    );

    const revokeMutation = useMutation(
        ({ reason }) => usersAdmin.revokeSubscription(id, { reason }),
        {
            onSuccess: () => {
                toast.success(t('staffUsers.detail.modals.revokeSuccess'), ToastOptions('success'));
                setRevokeModalOpen(false);
                queryClient.invalidateQueries(['staff:user', id]);
                queryClient.invalidateQueries(['staff:user:storage', id]);
                queryClient.invalidateQueries('staff:users');
            },
            onError: onMutationError,
        },
    );

    const notifyMutation = useMutation(
        (payload) => usersAdmin.sendNotification(payload),
        {
            onSuccess: () => {
                toast.success(t('staffUsers.detail.modals.notifySuccess'), ToastOptions('success'));
                setNotifyModalOpen(false);
                setNotifyTitle('');
                setNotifyBody('');
            },
            onError: onMutationError,
        },
    );

    const user = userQuery.data;
    const targetRole = user?.role || 'User';
    const isSelf = Boolean(staffUserId && user?._id && String(staffUserId) === String(user._id));
    const isOwnerTarget = targetRole === 'Owner';
    const canModerate = Boolean(user) && !isSelf && !isOwnerTarget && (targetRole === 'User' || isOwner);
    const canBanToggle = canModerate && !user?.isDeleted;
    const canChangeRole = isOwner && canModerate && !user?.isDeleted;
    const canDelete = isOwner && canModerate;
    const canManageSubscription = canBanToggle;
    const canSendNotification = Boolean(user) && !user?.isDeleted && !isSelf && (isOwner || !isOwnerTarget);

    const tabs = useMemo(
        () => [
            { key: 'overview', label: t('staffUsers.detail.tabs.overview') },
            { key: 'storage', label: t('staffUsers.detail.tabs.storage') },
            { key: 'downloads', label: t('staffUsers.detail.tabs.downloads') },
            { key: 'saves', label: t('staffUsers.detail.tabs.saves') },
            { key: 'archives', label: t('staffUsers.detail.tabs.archives') },
            { key: 'earnings', label: t('staffUsers.detail.tabs.earnings') },
        ],
        [t],
    );

    const openRoleModal = () => {
        setNextRole(targetRole === 'Admin' ? 'User' : 'Admin');
        setRoleModalOpen(true);
    };

    const openGrantModal = () => {
        setPlanId('');
        setDurationDays('');
        setPricePaid('');
        setPaymentReference('');
        setGrantModalOpen(true);
    };

    const durationValid = durationDays === '' || (
        Number.isInteger(Number(durationDays))
        && Number(durationDays) >= 1
        && Number(durationDays) <= 36500
    );
    const priceValid = pricePaid === '' || (Number.isFinite(Number(pricePaid)) && Number(pricePaid) >= 0);
    const refValid = paymentReference.trim().length <= 200;
    const canConfirmGrant = Boolean(planId) && durationValid && priceValid && refValid;

    const handleGrantConfirm = (reason) => {
        const payload = {
            planId,
            reason,
            ...(durationDays !== '' ? { durationDays: Number(durationDays) } : {}),
            ...(pricePaid !== '' ? { pricePaid: Number(pricePaid) } : {}),
            ...(paymentReference.trim() ? { paymentReference: paymentReference.trim() } : {}),
        };
        return grantMutation.mutateAsync(payload);
    };

    const trimmedNotifyTitle = notifyTitle.trim();
    const trimmedNotifyBody = notifyBody.trim();
    const notifyValid = trimmedNotifyTitle.length >= 1
        && trimmedNotifyTitle.length <= 200
        && trimmedNotifyBody.length >= 1
        && trimmedNotifyBody.length <= 2000;

    const handleSendNotification = (e) => {
        e.preventDefault();
        if (!notifyValid || notifyMutation.isLoading) return;
        notifyMutation.mutate({
            userId: id,
            title: trimmedNotifyTitle,
            body: trimmedNotifyBody,
            type: 'system',
            requestKey: makeRequestKey(id),
        });
    };

    const status = resolveAccountStatus(user);

    return (
        <AdminPage
            icon={MdPerson}
            title={user ? (user.username || user.email || t('staffUsers.detail.title')) : t('staffUsers.detail.title')}
            subtitle={user ? `${user.email || ''} · ${user._id}` : t('staffUsers.detail.subtitle')}
            actions={(
                <>
                    <Link to="/Owner/Users" className="admin-btn admin-btn--secondary admin-btn--sm">
                        <MdArrowBack size={16} />
                        <span>{t('staffCommon.back')}</span>
                    </Link>
                    <Link to={`/Owner/Folders?userId=${id}`} className="admin-btn admin-btn--secondary admin-btn--sm">
                        <MdFolder size={16} />
                        <span>{t('staffUsers.detail.viewFolders')}</span>
                    </Link>
                    <Link to={`/Owner/Shares?sharedBy=${id}`} className="admin-btn admin-btn--secondary admin-btn--sm">
                        <MdShare size={16} />
                        <span>{t('staffUsers.detail.viewShares')}</span>
                    </Link>
                </>
            )}
        >
            {userQuery.isLoading && <LoadingState />}
            {!userQuery.isLoading && userQuery.error && (
                <ErrorState error={userQuery.error} onRetry={userQuery.refetch} />
            )}

            {!userQuery.isLoading && !userQuery.error && user && (
                <>
                    <div className="user-detail-badges">
                        <StatusBadge tone={status.tone}>
                            {t(`staffUsers.statuses.${status.key}`)}
                        </StatusBadge>
                        <StatusBadge tone={roleTone(targetRole)}>
                            {t(`staffUsers.roles.${targetRole}`)}
                        </StatusBadge>
                        {user.isBrimume && (
                            <StatusBadge tone="info">
                                {t('staffUsers.columns.premium')}
                                {user.brimumeExpiresAt ? ` · ${formatDate(user.brimumeExpiresAt, language)}` : ''}
                            </StatusBadge>
                        )}
                        {user.isPromoter && (
                            <StatusBadge tone="success">
                                {t('staffUsers.columns.promoter')}
                            </StatusBadge>
                        )}
                    </div>

                    {(canBanToggle || canChangeRole || canManageSubscription || canSendNotification || canDelete) && (
                        <div className="user-detail-actions">
                            {canBanToggle && (
                                <button
                                    type="button"
                                    className={`admin-btn admin-btn--sm ${user.isBanned ? 'admin-btn--secondary' : 'admin-btn--danger'}`}
                                    onClick={() => setBanModalOpen(true)}
                                >
                                    {user.isBanned
                                        ? t('staffUsers.detail.actions.unban')
                                        : t('staffUsers.detail.actions.ban')}
                                </button>
                            )}
                            {canChangeRole && (
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--secondary admin-btn--sm"
                                    onClick={openRoleModal}
                                >
                                    {t('staffUsers.detail.actions.changeRole')}
                                </button>
                            )}
                            {canManageSubscription && (
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--primary admin-btn--sm"
                                    onClick={openGrantModal}
                                >
                                    {t('staffUsers.detail.actions.grantPremium')}
                                </button>
                            )}
                            {canManageSubscription && user.isBrimume && (
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--secondary admin-btn--sm"
                                    onClick={() => setRevokeModalOpen(true)}
                                >
                                    {t('staffUsers.detail.actions.revokePremium')}
                                </button>
                            )}
                            {canSendNotification && (
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--secondary admin-btn--sm"
                                    onClick={() => setNotifyModalOpen(true)}
                                >
                                    <MdNotifications size={16} />
                                    <span>{t('staffUsers.detail.actions.sendNotification')}</span>
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--danger admin-btn--sm"
                                    onClick={() => setDeleteModalOpen(true)}
                                >
                                    {t('staffUsers.detail.actions.deleteUser')}
                                </button>
                            )}
                        </div>
                    )}

                    <AdminTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

                    {activeTab === 'overview' && (
                        <OverviewTab user={user} t={t} language={language} />
                    )}
                    {activeTab === 'storage' && (
                        <StorageTab
                            key={id}
                            userId={id}
                            currentFreeQuota={user.free_storage_quota_mb}
                            t={t}
                            language={language}
                            onConflictReload={handleConflictReload}
                        />
                    )}
                    {activeTab === 'downloads' && (
                        <DownloadsTab key={id} userId={id} t={t} language={language} />
                    )}
                    {activeTab === 'saves' && (
                        <SavesTab key={id} userId={id} t={t} language={language} />
                    )}
                    {activeTab === 'archives' && (
                        <ArchivesTab key={id} userId={id} t={t} language={language} />
                    )}
                    {activeTab === 'earnings' && (
                        <EarningsTab key={id} userId={id} t={t} language={language} />
                    )}
                </>
            )}

            <ReasonModal
                open={banModalOpen}
                title={
                    user?.isBanned
                        ? t('staffUsers.detail.modals.unbanTitle')
                        : t('staffUsers.detail.modals.banTitle')
                }
                description={
                    user?.isBanned
                        ? t('staffUsers.detail.modals.unbanDescription')
                        : t('staffUsers.detail.modals.banDescription')
                }
                confirmLabel={
                    user?.isBanned
                        ? t('staffUsers.detail.modals.unbanConfirm')
                        : t('staffUsers.detail.modals.banConfirm')
                }
                tone={user?.isBanned ? 'primary' : 'danger'}
                maxLength={500}
                onClose={() => setBanModalOpen(false)}
                onConfirm={(reason) => banMutation.mutateAsync({ isBanned: !user?.isBanned, reason })}
            />

            <ReasonModal
                open={roleModalOpen}
                title={t('staffUsers.detail.modals.roleTitle')}
                description={t('staffUsers.detail.modals.roleDescription')}
                confirmLabel={t('staffUsers.detail.modals.roleConfirm')}
                maxLength={500}
                onClose={() => setRoleModalOpen(false)}
                onConfirm={(reason) => roleMutation.mutateAsync({ role: nextRole, reason })}
            >
                <label className="admin-field">
                    <span className="admin-field__label">{t('staffUsers.detail.modals.roleLabel')}</span>
                    <select
                        className="admin-input"
                        value={nextRole}
                        onChange={(e) => setNextRole(e.target.value)}
                    >
                        <option value="User">{t('staffUsers.roles.User')}</option>
                        <option value="Admin">{t('staffUsers.roles.Admin')}</option>
                    </select>
                </label>
            </ReasonModal>

            <ReasonModal
                open={deleteModalOpen}
                title={t('staffUsers.detail.modals.deleteTitle')}
                description={t('staffUsers.detail.modals.deleteDescription')}
                confirmLabel={t('staffUsers.detail.modals.deleteConfirm')}
                tone="danger"
                hideReason
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={() => deleteMutation.mutateAsync()}
            />

            <ReasonModal
                open={grantModalOpen}
                title={t('staffUsers.detail.modals.grantTitle')}
                description={t('staffUsers.detail.modals.grantDescription')}
                confirmLabel={t('staffUsers.detail.modals.grantConfirm')}
                maxLength={500}
                canConfirm={canConfirmGrant}
                onClose={() => setGrantModalOpen(false)}
                onConfirm={handleGrantConfirm}
            >
                <label className="admin-field">
                    <span className="admin-field__label">{t('staffUsers.detail.modals.grantPlan')} *</span>
                    <select
                        className="admin-input"
                        value={planId}
                        onChange={(e) => setPlanId(e.target.value)}
                        disabled={plansQuery.isLoading}
                    >
                        <option value="">
                            {activePaidPlans.length === 0 && !plansQuery.isLoading
                                ? t('staffUsers.detail.modals.grantNoPlans')
                                : t('staffUsers.detail.modals.grantPlanPlaceholder')}
                        </option>
                        {activePaidPlans.map((plan) => (
                            <option key={plan._id} value={plan._id}>
                                {plan.name} ({plan.type} · {plan.days}d · {formatMb(plan.storage_limit_mb)})
                            </option>
                        ))}
                    </select>
                </label>
                <div className="admin-form-grid">
                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffUsers.detail.modals.grantDuration')}</span>
                        <input
                            className="admin-input"
                            type="number"
                            min="1"
                            max="36500"
                            step="1"
                            value={durationDays}
                            onChange={(e) => setDurationDays(e.target.value)}
                            placeholder={t('staffUsers.detail.modals.grantDurationHint')}
                        />
                    </label>
                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffUsers.detail.modals.grantPrice')}</span>
                        <input
                            className="admin-input"
                            type="number"
                            min="0"
                            step="any"
                            value={pricePaid}
                            onChange={(e) => setPricePaid(e.target.value)}
                        />
                    </label>
                </div>
                <label className="admin-field">
                    <span className="admin-field__label">{t('staffUsers.detail.modals.grantReference')}</span>
                    <input
                        className="admin-input"
                        type="text"
                        maxLength={200}
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                    />
                </label>
            </ReasonModal>

            <ReasonModal
                open={revokeModalOpen}
                title={t('staffUsers.detail.modals.revokeTitle')}
                description={t('staffUsers.detail.modals.revokeDescription')}
                confirmLabel={t('staffUsers.detail.modals.revokeConfirm')}
                tone="danger"
                maxLength={500}
                onClose={() => setRevokeModalOpen(false)}
                onConfirm={(reason) => revokeMutation.mutateAsync({ reason })}
            />

            <AdminModal
                open={notifyModalOpen}
                title={t('staffUsers.detail.modals.notifyTitle')}
                onClose={notifyMutation.isLoading ? undefined : () => setNotifyModalOpen(false)}
            >
                <form className="admin-form" onSubmit={handleSendNotification}>
                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffUsers.detail.modals.notifyTitleField')} *</span>
                        <input
                            className="admin-input"
                            type="text"
                            maxLength={200}
                            value={notifyTitle}
                            onChange={(e) => setNotifyTitle(e.target.value)}
                            placeholder={t('staffUsers.detail.modals.notifyTitlePlaceholder')}
                            required
                        />
                        <span className="admin-field__hint">{trimmedNotifyTitle.length}/200</span>
                    </label>
                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffUsers.detail.modals.notifyBodyField')} *</span>
                        <textarea
                            className="admin-input admin-input--textarea"
                            rows={4}
                            maxLength={2000}
                            value={notifyBody}
                            onChange={(e) => setNotifyBody(e.target.value)}
                            placeholder={t('staffUsers.detail.modals.notifyBodyPlaceholder')}
                            required
                        />
                        <span className="admin-field__hint">{trimmedNotifyBody.length}/2000</span>
                    </label>
                    <div className="admin-modal__footer">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            disabled={notifyMutation.isLoading}
                            onClick={() => setNotifyModalOpen(false)}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={!notifyValid || notifyMutation.isLoading}
                        >
                            {notifyMutation.isLoading
                                ? t('staffCommon.saving')
                                : t('staffUsers.detail.modals.notifySend')}
                        </button>
                    </div>
                </form>
            </AdminModal>
        </AdminPage>
    );
}
