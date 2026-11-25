import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { MdAdd, MdClose, MdNotifications, MdRefresh, MdSend } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { notificationsAdmin } from '../../../services/admin/notificationsAdmin';
import {
    AdminCard,
    AdminModal,
    AdminPage,
    AdminTable,
    DetailList,
    ErrorState,
    FilterBar,
    LoadingState,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate, formatNumber, shortId } from '../_shared/formatters';
import './AdminNotifications.scss';

const NOTIFICATION_TYPES = [
    'system',
    'file_shared',
    'folder_shared',
    'channel_update',
    'earnings',
    'withdrawal',
    'subscription',
    'zip_extraction',
];

const AUDIENCES = ['all', 'free', 'premium', 'promoters'];
const SEND_STATUSES = ['processing', 'completed', 'partial', 'failed'];
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const MAX_RECIPIENTS = 100;
const MAX_DATA_ENTRIES = 30;

function generateRequestKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function statusTone(status) {
    switch (status) {
        case 'completed':
            return 'success';
        case 'partial':
        case 'processing':
            return 'warning';
        case 'failed':
            return 'danger';
        default:
            return 'neutral';
    }
}

export default function AdminNotifications() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    // Composer state
    const [mode, setMode] = useState('targeted');
    const [audience, setAudience] = useState('all');
    const [type, setType] = useState('system');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [dataRows, setDataRows] = useState([]);
    const [requestKey, setRequestKey] = useState(() => generateRequestKey());

    // Targeted recipients state
    const [recipients, setRecipients] = useState([]); // [{ id, label }]
    const [userSearch, setUserSearch] = useState('');
    const [pasteText, setPasteText] = useState('');
    const [invalidIdsNotice, setInvalidIdsNotice] = useState('');
    const [formError, setFormError] = useState('');
    const [confirmBroadcastOpen, setConfirmBroadcastOpen] = useState(false);

    // Detail modal state
    const [selectedSendId, setSelectedSendId] = useState(null);

    const searchQuery = useQuery(
        ['staff:notif-user-search', userSearch.trim()],
        () => notificationsAdmin.searchUsers(userSearch.trim()),
        {
            enabled: mode === 'targeted' && userSearch.trim().length >= 2,
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const history = useAdminList(
        'staff:notification-sends',
        notificationsAdmin.listSends,
        { initialFilters: { status: '', senderId: '', from: '', to: '' } },
    );

    const detailQuery = useQuery(
        ['staff:notification-send-detail', selectedSendId],
        () => notificationsAdmin.getSend(selectedSendId),
        {
            enabled: Boolean(selectedSendId),
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const sendTargetedMutation = useMutation(
        (payload) => notificationsAdmin.sendTargeted(payload, t('staffNotifications.sendFailed')),
        {
            onSuccess: (res) => {
                toast.success(
                    t('staffNotifications.sentSuccess', { count: res?.count ?? recipients.length }),
                    ToastOptions('success'),
                );
                setTitle('');
                setBody('');
                setDataRows([]);
                setRecipients([]);
                setFormError('');
                setRequestKey(generateRequestKey());
                queryClient.invalidateQueries('staff:notification-sends');
            },
        },
    );

    const sendBroadcastMutation = useMutation(
        (payload) => notificationsAdmin.sendBroadcast(payload, t('staffNotifications.sendFailed')),
        {
            onSuccess: (res) => {
                toast.success(
                    t('staffNotifications.broadcastSuccess', { count: res?.recipientCount ?? 0 }),
                    ToastOptions('success'),
                );
                setConfirmBroadcastOpen(false);
                setTitle('');
                setBody('');
                setDataRows([]);
                setFormError('');
                setRequestKey(generateRequestKey());
                queryClient.invalidateQueries('staff:notification-sends');
                if (res?.sendId) {
                    setSelectedSendId(res.sendId);
                }
            },
        },
    );

    const recipientIds = useMemo(() => new Set(recipients.map((r) => r.id)), [recipients]);

    const addRecipient = (id, label) => {
        if (recipientIds.has(id)) return;
        if (recipients.length >= MAX_RECIPIENTS) {
            setFormError(t('staffNotifications.recipientLimitExceeded'));
            return;
        }
        setFormError('');
        setRecipients((prev) => [...prev, { id, label: label || shortId(id) }]);
    };

    const removeRecipient = (id) => {
        setRecipients((prev) => prev.filter((r) => r.id !== id));
    };

    const handlePasteIds = () => {
        const tokens = pasteText
            .split(/[\s,;]+/)
            .map((token) => token.trim())
            .filter(Boolean);
        if (!tokens.length) return;

        const invalid = [];
        const next = [...recipients];
        const seen = new Set(next.map((r) => r.id));
        let limitHit = false;

        for (const token of tokens) {
            if (!OBJECT_ID_REGEX.test(token)) {
                invalid.push(token);
                continue;
            }
            if (seen.has(token)) continue;
            if (next.length >= MAX_RECIPIENTS) {
                limitHit = true;
                break;
            }
            seen.add(token);
            next.push({ id: token, label: shortId(token) });
        }

        setRecipients(next);
        setPasteText('');
        setInvalidIdsNotice(
            invalid.length ? t('staffNotifications.invalidIdsNotice', { ids: invalid.slice(0, 5).join(', ') }) : '',
        );
        if (limitHit) {
            setFormError(t('staffNotifications.recipientLimitExceeded'));
        } else {
            setFormError('');
        }
    };

    const addDataRow = () => {
        if (dataRows.length >= MAX_DATA_ENTRIES) return;
        setDataRows((prev) => [...prev, { key: '', value: '' }]);
    };

    const updateDataRow = (index, field, value) => {
        setDataRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
    };

    const removeDataRow = (index) => {
        setDataRows((prev) => prev.filter((_, idx) => idx !== index));
    };

    const buildPayload = () => {
        const trimmedTitle = title.trim();
        const trimmedBody = body.trim();

        if (!trimmedTitle || trimmedTitle.length > 200) {
            setFormError(t('staffNotifications.validationTitle'));
            return null;
        }
        if (!trimmedBody || trimmedBody.length > 2000) {
            setFormError(t('staffNotifications.validationBody'));
            return null;
        }
        if (mode === 'targeted') {
            if (recipients.length === 0) {
                setFormError(t('staffNotifications.recipientsRequired'));
                return null;
            }
            if (recipients.length > MAX_RECIPIENTS) {
                setFormError(t('staffNotifications.recipientLimitExceeded'));
                return null;
            }
        }

        const nonEmptyRows = dataRows.filter((row) => row.key.trim() !== '' || row.value !== '');
        if (nonEmptyRows.length > MAX_DATA_ENTRIES) {
            setFormError(t('staffNotifications.validationDataLimit'));
            return null;
        }
        const dataMap = {};
        for (const row of nonEmptyRows) {
            const key = row.key.trim();
            if (!key || Object.prototype.hasOwnProperty.call(dataMap, key)) {
                setFormError(t('staffNotifications.validationDataKey'));
                return null;
            }
            dataMap[key] = String(row.value);
        }

        setFormError('');
        const base = {
            title: trimmedTitle,
            body: trimmedBody,
            type,
            requestKey,
        };
        if (Object.keys(dataMap).length > 0) {
            base.data = dataMap;
        }
        if (mode === 'targeted') {
            base.userIds = recipients.map((r) => r.id);
        } else {
            base.audience = audience;
        }
        return base;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = buildPayload();
        if (!payload) return;
        if (mode === 'broadcast') {
            setConfirmBroadcastOpen(true);
            return;
        }
        sendTargetedMutation.mutate(payload);
    };

    const handleConfirmBroadcast = () => {
        const payload = buildPayload();
        if (!payload) {
            setConfirmBroadcastOpen(false);
            return;
        }
        sendBroadcastMutation.mutate(payload);
    };

    const audienceLabel = (value) => {
        if (!value) return t('staffNotifications.audienceTargeted');
        const map = {
            all: t('staffNotifications.audienceAll'),
            free: t('staffNotifications.audienceFree'),
            premium: t('staffNotifications.audiencePremium'),
            promoters: t('staffNotifications.audiencePromoters'),
        };
        return map[value] || value;
    };

    const filterFields = [
        {
            key: 'status',
            label: t('staffNotifications.filterStatus'),
            type: 'select',
            options: SEND_STATUSES.map((s) => ({
                value: s,
                label: t(`staffNotifications.statuses.${s}`),
            })),
        },
        {
            key: 'senderId',
            label: t('staffNotifications.filterSenderId'),
            type: 'text',
            placeholder: t('staffNotifications.senderIdPlaceholder'),
        },
        { key: 'from', label: t('staffCommon.from'), type: 'date' },
        { key: 'to', label: t('staffCommon.to'), type: 'date' },
    ];

    const historyColumns = [
        {
            key: 'createdAt',
            header: t('staffNotifications.colCreatedAt'),
            render: (row) => formatDate(row.createdAt, language),
        },
        {
            key: 'type',
            header: t('staffNotifications.colType'),
            render: (row) => t(`staffNotifications.types.${row.type}`) || row.type,
        },
        {
            key: 'audience',
            header: t('staffNotifications.colAudience'),
            render: (row) => (
                <StatusBadge tone={row.audience ? 'info' : 'neutral'}>
                    {audienceLabel(row.audience)}
                </StatusBadge>
            ),
        },
        {
            key: 'status',
            header: t('staffNotifications.colStatus'),
            render: (row) => (
                <StatusBadge tone={statusTone(row.status)}>
                    {t(`staffNotifications.statuses.${row.status}`) || row.status}
                </StatusBadge>
            ),
        },
        {
            key: 'recipientCount',
            header: t('staffNotifications.colRecipients'),
            render: (row) => formatNumber(row.recipientCount, language),
        },
        {
            key: 'inbox',
            header: t('staffNotifications.colInbox'),
            render: (row) => `${formatNumber(row.inboxCount, language)} / ${formatNumber(row.inboxFailed, language)}`,
        },
        {
            key: 'push',
            header: t('staffNotifications.colPush'),
            render: (row) =>
                `${formatNumber(row.pushAccepted, language)} / ${formatNumber(row.pushSkipped, language)} / ${formatNumber(row.pushFailed, language)}`,
        },
        {
            key: 'senderId',
            header: t('staffNotifications.colSender'),
            render: (row) =>
                row.senderId ? (
                    <Link
                        to={`/Owner/Users/${row.senderId}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {shortId(row.senderId)}
                    </Link>
                ) : (
                    '—'
                ),
        },
    ];

    const submitting = sendTargetedMutation.isLoading || sendBroadcastMutation.isLoading;
    const searchResults = (searchQuery.data?.data ?? []).filter((user) => !user.isDeleted);

    return (
        <AdminPage
            icon={MdNotifications}
            title={t('staffNotifications.title')}
            subtitle={t('staffNotifications.subtitle')}
        >
            <AdminCard title={t('staffNotifications.composerTitle')}>
                <form className="admin-form" onSubmit={handleSubmit}>
                    <div className="admin-field">
                        <span className="admin-field__label">{t('staffNotifications.modeLabel')}</span>
                        <div className="admin-notif__mode-toggle">
                            <button
                                type="button"
                                className={`admin-btn admin-btn--sm ${mode === 'targeted' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                                onClick={() => {
                                    setMode('targeted');
                                    setFormError('');
                                }}
                            >
                                {t('staffNotifications.modeTargeted')}
                            </button>
                            <button
                                type="button"
                                className={`admin-btn admin-btn--sm ${mode === 'broadcast' ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
                                onClick={() => {
                                    setMode('broadcast');
                                    setFormError('');
                                }}
                            >
                                {t('staffNotifications.modeBroadcast')}
                            </button>
                        </div>
                    </div>

                    {mode === 'broadcast' ? (
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffNotifications.audienceLabel')}</span>
                            <select
                                className="admin-input"
                                value={audience}
                                onChange={(e) => setAudience(e.target.value)}
                            >
                                {AUDIENCES.map((aud) => (
                                    <option key={aud} value={aud}>
                                        {audienceLabel(aud)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <>
                            <div className="admin-notif__picker">
                                <div className="admin-field">
                                    <span className="admin-field__label">
                                        {t('staffNotifications.userSearchLabel')}
                                    </span>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        placeholder={t('staffNotifications.userSearchPlaceholder')}
                                    />
                                    {userSearch.trim().length >= 2 && (
                                        <div className="admin-notif__search-results">
                                            {searchQuery.isLoading ? (
                                                <span>{t('staffCommon.loading')}</span>
                                            ) : searchResults.length === 0 ? (
                                                <span>{t('staffNotifications.userSearchEmpty')}</span>
                                            ) : (
                                                searchResults.map((user) => {
                                                    const added = recipientIds.has(user._id);
                                                    const label = user.username || user.email || shortId(user._id);
                                                    return (
                                                        <div key={user._id} className="admin-notif__search-row">
                                                            <div className="admin-notif__search-meta">
                                                                <strong>{label}</strong>
                                                                <span>{user.email || user._id}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="admin-btn admin-btn--secondary admin-btn--sm"
                                                                disabled={added || recipients.length >= MAX_RECIPIENTS}
                                                                onClick={() => addRecipient(user._id, label)}
                                                            >
                                                                {t('staffNotifications.addUser')}
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="admin-field">
                                    <span className="admin-field__label">
                                        {t('staffNotifications.pasteIdsLabel')}
                                    </span>
                                    <textarea
                                        className="admin-input admin-input--textarea"
                                        rows={3}
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                        placeholder={t('staffNotifications.pasteIdsPlaceholder')}
                                    />
                                    <div className="admin-notif__actions">
                                        <button
                                            type="button"
                                            className="admin-btn admin-btn--secondary admin-btn--sm"
                                            onClick={handlePasteIds}
                                            disabled={!pasteText.trim()}
                                        >
                                            {t('staffNotifications.addPastedIds')}
                                        </button>
                                    </div>
                                    {invalidIdsNotice && (
                                        <span className="admin-field__error">{invalidIdsNotice}</span>
                                    )}
                                </div>
                            </div>

                            <div className="admin-field">
                                <div className="admin-notif__key-row">
                                    <span className="admin-field__label">
                                        {t('staffNotifications.selectedRecipients', { count: recipients.length })}
                                    </span>
                                    {recipients.length > 0 && (
                                        <button
                                            type="button"
                                            className="admin-btn admin-btn--ghost admin-btn--sm"
                                            onClick={() => setRecipients([])}
                                        >
                                            {t('staffNotifications.clearRecipients')}
                                        </button>
                                    )}
                                </div>
                                {recipients.length > 0 && (
                                    <div className="admin-notif__chips">
                                        {recipients.map((recipient) => (
                                            <span key={recipient.id} className="admin-notif__chip" title={recipient.id}>
                                                {recipient.label}
                                                <button
                                                    type="button"
                                                    onClick={() => removeRecipient(recipient.id)}
                                                    aria-label={t('staffNotifications.removeRecipient')}
                                                >
                                                    <MdClose size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffNotifications.typeLabel')}</span>
                            <select
                                className="admin-input"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                {NOTIFICATION_TYPES.map((nt) => (
                                    <option key={nt} value={nt}>
                                        {t(`staffNotifications.types.${nt}`)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="admin-field">
                            <span className="admin-field__label">{t('staffNotifications.requestKeyLabel')}</span>
                            <div className="admin-notif__key-row">
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={requestKey}
                                    readOnly
                                />
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--secondary admin-btn--sm"
                                    onClick={() => setRequestKey(generateRequestKey())}
                                >
                                    <MdRefresh size={16} />
                                    {t('staffNotifications.regenerateKey')}
                                </button>
                            </div>
                            <span className="admin-field__hint">{t('staffNotifications.requestKeyHint')}</span>
                        </div>
                    </div>

                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffNotifications.titleLabel')} *</span>
                        <input
                            type="text"
                            className="admin-input"
                            maxLength={200}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('staffNotifications.titlePlaceholder')}
                        />
                        <span className="admin-field__hint">{title.trim().length}/200</span>
                    </label>

                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffNotifications.bodyLabel')} *</span>
                        <textarea
                            className="admin-input admin-input--textarea"
                            rows={4}
                            maxLength={2000}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={t('staffNotifications.bodyPlaceholder')}
                        />
                        <span className="admin-field__hint">{body.trim().length}/2000</span>
                    </label>

                    <div className="admin-field">
                        <div className="admin-notif__key-row">
                            <span className="admin-field__label">{t('staffNotifications.dataLabel')}</span>
                            <button
                                type="button"
                                className="admin-btn admin-btn--secondary admin-btn--sm"
                                onClick={addDataRow}
                                disabled={dataRows.length >= MAX_DATA_ENTRIES}
                            >
                                <MdAdd size={16} />
                                {t('staffNotifications.addDataRow')}
                            </button>
                        </div>
                        <span className="admin-field__hint">{t('staffNotifications.dataHint')}</span>
                        {dataRows.map((row, index) => (
                            <div key={index} className="admin-notif__data-row">
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={row.key}
                                    onChange={(e) => updateDataRow(index, 'key', e.target.value)}
                                    placeholder={t('staffNotifications.dataKeyPlaceholder')}
                                />
                                <input
                                    type="text"
                                    className="admin-input"
                                    value={row.value}
                                    onChange={(e) => updateDataRow(index, 'value', e.target.value)}
                                    placeholder={t('staffNotifications.dataValuePlaceholder')}
                                />
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--ghost admin-btn--sm"
                                    onClick={() => removeDataRow(index)}
                                    aria-label={t('staffNotifications.removeDataRow')}
                                >
                                    <MdClose size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {formError && <p className="admin-field__error">{formError}</p>}

                    <div className="admin-notif__actions">
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={submitting}
                        >
                            <MdSend size={18} />
                            {submitting
                                ? t('staffCommon.saving')
                                : mode === 'broadcast'
                                    ? t('staffNotifications.sendBroadcast')
                                    : t('staffNotifications.sendTargeted')}
                        </button>
                    </div>
                </form>
            </AdminCard>

            <FilterBar
                fields={filterFields}
                values={history.filters}
                onChange={history.setFilter}
                onReset={history.resetFilters}
            />

            <AdminTable
                title={t('staffNotifications.historyTitle')}
                columns={historyColumns}
                rows={history.rows}
                loading={history.isLoading}
                error={history.error}
                onRetry={history.refetch}
                meta={history.meta}
                onPageChange={history.setPage}
                onRowClick={(row) => setSelectedSendId(row._id)}
            />

            <AdminModal
                open={confirmBroadcastOpen}
                title={t('staffNotifications.broadcastConfirmTitle')}
                onClose={sendBroadcastMutation.isLoading ? undefined : () => setConfirmBroadcastOpen(false)}
                footer={(
                    <>
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => setConfirmBroadcastOpen(false)}
                            disabled={sendBroadcastMutation.isLoading}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="button"
                            className="admin-btn admin-btn--primary"
                            onClick={handleConfirmBroadcast}
                            disabled={sendBroadcastMutation.isLoading}
                        >
                            {sendBroadcastMutation.isLoading
                                ? t('staffCommon.saving')
                                : t('staffNotifications.broadcastConfirmButton')}
                        </button>
                    </>
                )}
            >
                <p className="admin-modal__description">
                    {t('staffNotifications.broadcastConfirmDesc', { audience: audienceLabel(audience) })}
                </p>
                <DetailList
                    items={[
                        { label: t('staffNotifications.typeLabel'), value: t(`staffNotifications.types.${type}`) },
                        { label: t('staffNotifications.titleLabel'), value: title.trim() },
                        { label: t('staffNotifications.bodyLabel'), value: body.trim() },
                    ]}
                />
            </AdminModal>

            <AdminModal
                open={Boolean(selectedSendId)}
                title={t('staffNotifications.detailTitle')}
                onClose={() => setSelectedSendId(null)}
                size="lg"
                footer={(
                    <>
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => detailQuery.refetch()}
                            disabled={detailQuery.isFetching}
                        >
                            <MdRefresh size={16} />
                            {t('staffNotifications.refreshDetail')}
                        </button>
                        <button
                            type="button"
                            className="admin-btn admin-btn--primary"
                            onClick={() => setSelectedSendId(null)}
                        >
                            {t('staffCommon.close')}
                        </button>
                    </>
                )}
            >
                {detailQuery.isLoading ? (
                    <LoadingState />
                ) : detailQuery.error ? (
                    <ErrorState error={detailQuery.error} onRetry={detailQuery.refetch} />
                ) : detailQuery.data ? (
                    <DetailList
                        items={[
                            { label: t('staffCommon.id'), value: detailQuery.data._id },
                            {
                                label: t('staffNotifications.colSender'),
                                value: detailQuery.data.senderId ? (
                                    <Link to={`/Owner/Users/${detailQuery.data.senderId}`}>
                                        {detailQuery.data.senderId}
                                    </Link>
                                ) : null,
                            },
                            {
                                label: t('staffNotifications.colType'),
                                value: t(`staffNotifications.types.${detailQuery.data.type}`) || detailQuery.data.type,
                            },
                            {
                                label: t('staffNotifications.colAudience'),
                                value: audienceLabel(detailQuery.data.audience),
                            },
                            {
                                label: t('staffNotifications.colStatus'),
                                value: (
                                    <StatusBadge tone={statusTone(detailQuery.data.status)}>
                                        {t(`staffNotifications.statuses.${detailQuery.data.status}`) || detailQuery.data.status}
                                    </StatusBadge>
                                ),
                            },
                            {
                                label: t('staffNotifications.colRecipients'),
                                value: formatNumber(detailQuery.data.recipientCount, language),
                            },
                            {
                                label: t('staffNotifications.inboxCount'),
                                value: formatNumber(detailQuery.data.inboxCount, language),
                            },
                            {
                                label: t('staffNotifications.inboxFailed'),
                                value: formatNumber(detailQuery.data.inboxFailed, language),
                            },
                            {
                                label: t('staffNotifications.pushAccepted'),
                                value: formatNumber(detailQuery.data.pushAccepted, language),
                            },
                            {
                                label: t('staffNotifications.pushSkipped'),
                                value: formatNumber(detailQuery.data.pushSkipped, language),
                            },
                            {
                                label: t('staffNotifications.pushFailed'),
                                value: formatNumber(detailQuery.data.pushFailed, language),
                            },
                            {
                                label: t('staffNotifications.colCreatedAt'),
                                value: formatDate(detailQuery.data.createdAt, language),
                            },
                            {
                                label: t('staffNotifications.completedAt'),
                                value: formatDate(detailQuery.data.completedAt, language),
                            },
                        ]}
                    />
                ) : null}
            </AdminModal>
        </AdminPage>
    );
}
