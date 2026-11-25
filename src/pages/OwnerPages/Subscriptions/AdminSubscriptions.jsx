import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { FaIdCard, FaPlus } from 'react-icons/fa';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import financeAdmin from '../../../services/admin/financeAdmin';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import {
    AdminModal,
    AdminPage,
    AdminTable,
    AdminTabs,
    DetailList,
    FilterBar,
    ReasonModal,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import useStaffRole from '../_shared/useStaffRole';
import { formatDate, formatDay, formatNumber, shortId } from '../_shared/formatters';

const STATUS_TONE = {
    active: 'success',
    expired: 'neutral',
    cancelled: 'danger',
};

const REQUEST_STATUS_TONE = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
};

const INITIAL_FILTERS = {
    status: '',
    planId: '',
    userId: '',
};

const INITIAL_REQUEST_FILTERS = {
    status: 'pending',
    planId: '',
    userId: '',
};

function emptyGrantForm() {
    return {
        planId: '',
        durationDays: '',
        pricePaid: '',
        paymentReference: '',
        reason: '',
    };
}

export default function AdminSubscriptions() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const { userId: staffUserId, isOwner } = useStaffRole();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') === 'requests' ? 'requests' : 'subscriptions';

    const [grantOpen, setGrantOpen] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [grantForm, setGrantForm] = useState(emptyGrantForm);
    const [grantError, setGrantError] = useState(null);
    const [granting, setGranting] = useState(false);

    const [revokeTarget, setRevokeTarget] = useState(null);
    const [detailRow, setDetailRow] = useState(null);

    const [approveTarget, setApproveTarget] = useState(null);
    const [approveDuration, setApproveDuration] = useState('');
    const [approveReason, setApproveReason] = useState('');
    const [approveError, setApproveError] = useState(null);
    const [approving, setApproving] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [requestDetailRow, setRequestDetailRow] = useState(null);
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
        return () => clearTimeout(id);
    }, [searchInput]);

    const plansQuery = useQuery(['staff:plans'], financeAdmin.listPlans, {
        retry: false,
        refetchOnWindowFocus: false,
    });

    const allPlans = useMemo(() => plansQuery.data?.plans ?? [], [plansQuery.data]);
    const activePaidPlans = useMemo(
        () => allPlans.filter((p) => p.is_active && p.type !== 'free'),
        [allPlans],
    );

    const list = useAdminList('staff:subscriptions', financeAdmin.listSubscriptions, {
        initialFilters: INITIAL_FILTERS,
        limit: 20,
        enabled: activeTab === 'subscriptions',
    });

    const requestsList = useAdminList(
        'staff:subscription-requests',
        financeAdmin.listSubscriptionRequests,
        {
            initialFilters: INITIAL_REQUEST_FILTERS,
            defaultFilters: { status: '', planId: '', userId: '' },
            limit: 20,
            enabled: activeTab === 'requests',
        },
    );
    const handleTabChange = (tab) => {
        const next = new URLSearchParams(searchParams);
        if (tab === 'requests') {
            next.set('tab', 'requests');
        } else {
            next.delete('tab');
        }
        setSearchParams(next, { replace: true });
    };
    const userSearchQuery = useQuery(
        ['staff:subscriptions:userSearch', debouncedSearch],
        () => financeAdmin.searchUsers(debouncedSearch, 10),
        {
            enabled: grantOpen && !selectedUser && debouncedSearch.length >= 2,
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const canManageUser = (targetUser, targetUserId) => {
        if (
            staffUserId &&
            targetUserId &&
            String(targetUserId).toLowerCase() === String(staffUserId).toLowerCase()
        ) {
            return false;
        }
        if (targetUser?.isDeleted) return false;
        const role = targetUser?.role ?? 'User';
        if (role === 'Owner') return false;
        if (role === 'Admin' && !isOwner) return false;
        return true;
    };

    const searchResults = (userSearchQuery.data?.data ?? []).filter((u) =>
        canManageUser(u, u._id),
    );

    const selectedPlan = useMemo(
        () => activePaidPlans.find((p) => p._id === grantForm.planId) || null,
        [activePaidPlans, grantForm.planId],
    );

    const statusLabel = (status) => {
        const map = {
            active: t('staffSubscriptions.statusActive'),
            expired: t('staffSubscriptions.statusExpired'),
            cancelled: t('staffSubscriptions.statusCancelled'),
        };
        return map[status] || status || '—';
    };

    const requestStatusLabel = (status) => {
        const map = {
            pending: t('staffSubscriptions.requestStatusPending'),
            approved: t('staffSubscriptions.requestStatusApproved'),
            rejected: t('staffSubscriptions.requestStatusRejected'),
        };
        return map[status] || status || '—';
    };

    const userLabel = (row) => {
        if (row?.user) return row.user.username || row.user.email || shortId(row.user._id);
        return shortId(row?.userId);
    };

    const userIdOf = (row) => row?.user?._id || row?.userId;

    const openGrantModal = () => {
        setSearchInput('');
        setDebouncedSearch('');
        setSelectedUser(null);
        setGrantForm({
            ...emptyGrantForm(),
            planId: activePaidPlans[0]?._id || '',
        });
        setGrantError(null);
        setGrantOpen(true);
    };

    const closeGrantModal = () => {
        if (granting) return;
        setGrantOpen(false);
        setGrantError(null);
    };

    const handleGrantSubmit = async (event) => {
        event.preventDefault();
        if (!selectedUser?._id) {
            setGrantError(t('staffSubscriptions.validationUser'));
            return;
        }
        if (!grantForm.planId) {
            setGrantError(t('staffSubscriptions.validationPlan'));
            return;
        }

        const payload = { planId: grantForm.planId };

        if (grantForm.durationDays !== '') {
            const durationDays = Number(grantForm.durationDays);
            if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 36500) {
                setGrantError(t('staffSubscriptions.validationDuration'));
                return;
            }
            payload.durationDays = durationDays;
        }

        if (grantForm.pricePaid !== '') {
            const pricePaid = Number(grantForm.pricePaid);
            if (Number.isNaN(pricePaid) || pricePaid < 0) {
                setGrantError(t('staffSubscriptions.validationPrice'));
                return;
            }
            payload.pricePaid = pricePaid;
        }

        const ref = grantForm.paymentReference.trim();
        if (ref.length > 200) {
            setGrantError(t('staffSubscriptions.validationReference'));
            return;
        }
        if (ref) {
            payload.paymentReference = ref;
        }

        const reason = grantForm.reason.trim();
        if (reason.length < 1 || reason.length > 500) {
            setGrantError(t('staffSubscriptions.validationReason'));
            return;
        }
        payload.reason = reason;

        setGrantError(null);
        setGranting(true);
        try {
            await financeAdmin.grantSubscription(selectedUser._id, payload);
            toast.success(t('staffSubscriptions.grantSuccess'), ToastOptions('success'));
            setGrantOpen(false);
            queryClient.invalidateQueries('staff:subscriptions');
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
                setGrantOpen(false);
                queryClient.invalidateQueries('staff:subscriptions');
            }
        } finally {
            setGranting(false);
        }
    };

    const handleRevokeConfirm = async (reason) => {
        if (!revokeTarget) return;
        const uid = userIdOf(revokeTarget);
        if (!uid) return;
        try {
            await financeAdmin.revokeSubscription(uid, { reason });
            toast.success(t('staffSubscriptions.revokeSuccess'), ToastOptions('success'));
            setRevokeTarget(null);
            queryClient.invalidateQueries('staff:subscriptions');
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
                setRevokeTarget(null);
                queryClient.invalidateQueries('staff:subscriptions');
                return;
            }
            throw error;
        }
    };

    const openApproveModal = (row) => {
        setApproveTarget(row);
        setApproveDuration('');
        setApproveReason('');
        setApproveError(null);
    };

    const closeApproveModal = () => {
        if (approving) return;
        setApproveTarget(null);
        setApproveError(null);
    };

    const handleApproveSubmit = async (event) => {
        event.preventDefault();
        if (!approveTarget) return;

        const payload = {};
        if (approveDuration !== '') {
            const durationDays = Number(approveDuration);
            if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 36500) {
                setApproveError(t('staffSubscriptions.validationDuration'));
                return;
            }
            payload.durationDays = durationDays;
        }

        const reason = approveReason.trim();
        if (reason.length < 1 || reason.length > 500) {
            setApproveError(t('staffSubscriptions.validationReason'));
            return;
        }
        payload.reason = reason;

        setApproveError(null);
        setApproving(true);
        try {
            await financeAdmin.approveSubscriptionRequest(approveTarget._id, payload);
            toast.success(t('staffSubscriptions.approveSuccess'), ToastOptions('success'));
            setApproveTarget(null);
            queryClient.invalidateQueries('staff:subscription-requests');
            queryClient.invalidateQueries('staff:subscriptions');
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
                setApproveTarget(null);
                queryClient.invalidateQueries('staff:subscription-requests');
                queryClient.invalidateQueries('staff:subscriptions');
            }
        } finally {
            setApproving(false);
        }
    };

    const handleRejectConfirm = async (reason) => {
        if (!rejectTarget) return;
        try {
            await financeAdmin.rejectSubscriptionRequest(rejectTarget._id, { reason });
            toast.success(t('staffSubscriptions.rejectSuccess'), ToastOptions('success'));
            setRejectTarget(null);
            queryClient.invalidateQueries('staff:subscription-requests');
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
                setRejectTarget(null);
                queryClient.invalidateQueries('staff:subscription-requests');
                return;
            }
            throw error;
        }
    };

    const filterFields = [
        {
            key: 'status',
            label: t('staffCommon.status'),
            type: 'select',
            options: [
                { value: 'active', label: t('staffSubscriptions.statusActive') },
                { value: 'expired', label: t('staffSubscriptions.statusExpired') },
                { value: 'cancelled', label: t('staffSubscriptions.statusCancelled') },
            ],
        },
        {
            key: 'planId',
            label: t('staffSubscriptions.plan'),
            type: 'select',
            options: allPlans.map((p) => ({ value: p._id, label: p.name })),
        },
        {
            key: 'userId',
            label: t('staffSubscriptions.userId'),
            type: 'text',
        },
    ];

    const columns = [
        {
            key: 'user',
            header: t('staffCommon.user'),
            render: (row) => {
                const uid = userIdOf(row);
                return (
                    <div>
                        {uid ? (
                            <Link to={`/Owner/Users/${uid}`} style={{ fontWeight: 600 }}>
                                {userLabel(row)}
                            </Link>
                        ) : (
                            '—'
                        )}
                        {row.user?.email && (
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                {row.user.email}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'plan',
            header: t('staffSubscriptions.plan'),
            render: (row) =>
                row.plan ? (
                    <div>
                        <strong>{row.plan.name}</strong>
                        {row.plan.type && (
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                {row.plan.type}
                            </div>
                        )}
                    </div>
                ) : (
                    shortId(row.planId)
                ),
        },
        {
            key: 'status',
            header: t('staffCommon.status'),
            render: (row) => (
                <StatusBadge tone={STATUS_TONE[row.status] || 'neutral'}>
                    {statusLabel(row.status)}
                </StatusBadge>
            ),
        },
        {
            key: 'period',
            header: t('staffSubscriptions.period'),
            render: (row) =>
                `${formatDay(row.startDate, language)} → ${formatDay(row.endDate, language)}`,
        },
        {
            key: 'pricePaid',
            header: t('staffSubscriptions.pricePaid'),
            render: (row) =>
                row.pricePaid !== undefined && row.pricePaid !== null
                    ? formatNumber(row.pricePaid, language)
                    : '—',
        },
        {
            key: 'paymentReference',
            header: t('staffSubscriptions.paymentReference'),
            render: (row) => row.paymentReference || '—',
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
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => setDetailRow(row)}
                    >
                        {t('staffCommon.view')}
                    </button>
                    {row.status === 'active' && canManageUser(row.user, userIdOf(row)) && (
                        <button
                            type="button"
                            className="admin-btn admin-btn--danger admin-btn--sm"
                            onClick={() => setRevokeTarget(row)}
                        >
                            {t('staffSubscriptions.revoke')}
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const requestFilterFields = [
        {
            key: 'status',
            label: t('staffCommon.status'),
            type: 'select',
            options: [
                { value: 'pending', label: t('staffSubscriptions.requestStatusPending') },
                { value: 'approved', label: t('staffSubscriptions.requestStatusApproved') },
                { value: 'rejected', label: t('staffSubscriptions.requestStatusRejected') },
            ],
        },
        {
            key: 'planId',
            label: t('staffSubscriptions.plan'),
            type: 'select',
            options: allPlans.map((p) => ({ value: p._id, label: p.name })),
        },
        {
            key: 'userId',
            label: t('staffSubscriptions.userId'),
            type: 'text',
        },
    ];

    const requestColumns = [
        {
            key: 'user',
            header: t('staffCommon.user'),
            render: (row) => {
                const uid = userIdOf(row);
                return (
                    <div>
                        {uid ? (
                            <Link to={`/Owner/Users/${uid}`} style={{ fontWeight: 600 }}>
                                {userLabel(row)}
                            </Link>
                        ) : (
                            '—'
                        )}
                        {row.user?.email && (
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                {row.user.email}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'plan',
            header: t('staffSubscriptions.plan'),
            render: (row) =>
                row.plan ? (
                    <div>
                        <strong>{row.plan.name}</strong>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                            {row.plan.type}
                            {row.plan.price !== undefined && row.plan.price !== null
                                ? ` · ${formatNumber(row.plan.price, language)}`
                                : ''}
                        </div>
                    </div>
                ) : (
                    shortId(row.planId)
                ),
        },
        {
            key: 'status',
            header: t('staffCommon.status'),
            render: (row) => (
                <StatusBadge tone={REQUEST_STATUS_TONE[row.status] || 'neutral'}>
                    {requestStatusLabel(row.status)}
                </StatusBadge>
            ),
        },
        {
            key: 'paymentReference',
            header: t('staffSubscriptions.paymentReference'),
            render: (row) => row.paymentReference || '—',
        },
        {
            key: 'invoiceUrl',
            header: t('staffSubscriptions.invoice'),
            render: (row) =>
                row.invoiceUrl ? (
                    <a
                        href={row.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                    >
                        {t('staffSubscriptions.viewInvoice')}
                    </a>
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
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => setRequestDetailRow(row)}
                    >
                        {t('staffCommon.view')}
                    </button>
                    {row.status === 'pending' && canManageUser(row.user, userIdOf(row)) && (
                        <>
                            <button
                                type="button"
                                className="admin-btn admin-btn--primary admin-btn--sm"
                                onClick={() => openApproveModal(row)}
                            >
                                {t('staffSubscriptions.approve')}
                            </button>
                            <button
                                type="button"
                                className="admin-btn admin-btn--danger admin-btn--sm"
                                onClick={() => setRejectTarget(row)}
                            >
                                {t('staffSubscriptions.reject')}
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const tabs = [
        { key: 'subscriptions', label: t('staffSubscriptions.tabSubscriptions') },
        { key: 'requests', label: t('staffSubscriptions.tabRequests') },
    ];

    return (
        <AdminPage
            icon={FaIdCard}
            title={t('staffSubscriptions.title')}
            subtitle={t('staffSubscriptions.subtitle')}
            actions={
                <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={openGrantModal}
                >
                    <FaPlus /> {t('staffSubscriptions.grantPremium')}
                </button>
            }
        >
            <AdminTabs tabs={tabs} active={activeTab} onChange={handleTabChange} />

            {activeTab === 'subscriptions' ? (
                <>
                    <FilterBar
                        fields={filterFields}
                        values={list.filters}
                        onChange={list.setFilter}
                        onReset={list.resetFilters}
                    />

                    <AdminTable
                        title={t('staffSubscriptions.title')}
                        columns={columns}
                        rows={list.rows}
                        rowKey="_id"
                        loading={list.isLoading}
                        error={list.error}
                        onRetry={list.refetch}
                        meta={list.meta}
                        onPageChange={list.setPage}
                    />
                </>
            ) : (
                <>
                    <FilterBar
                        fields={requestFilterFields}
                        values={requestsList.filters}
                        onChange={requestsList.setFilter}
                        onReset={requestsList.resetFilters}
                    />

                    <AdminTable
                        title={t('staffSubscriptions.requestsTitle')}
                        columns={requestColumns}
                        rows={requestsList.rows}
                        rowKey="_id"
                        loading={requestsList.isLoading}
                        error={requestsList.error}
                        onRetry={requestsList.refetch}
                        emptyMessage={t('staffSubscriptions.noRequests')}
                        meta={requestsList.meta}
                        onPageChange={requestsList.setPage}
                    />
                </>
            )}

            <AdminModal
                open={grantOpen}
                title={t('staffSubscriptions.grantPremium')}
                size="lg"
                onClose={closeGrantModal}
            >
                <form className="admin-form" onSubmit={handleGrantSubmit}>
                    <div className="admin-field">
                        <span className="admin-field__label">
                            {selectedUser
                                ? t('staffSubscriptions.selectedUser')
                                : t('staffSubscriptions.searchUser')}
                        </span>
                        {selectedUser ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.75rem',
                                    padding: '0.6rem 0.85rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(148, 163, 184, 0.4)',
                                }}
                            >
                                <div>
                                    <strong>{selectedUser.username || selectedUser.email}</strong>
                                    {selectedUser.email && (
                                        <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                                            {selectedUser.email}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--secondary admin-btn--sm"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    {t('staffSubscriptions.changeUser')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    className="admin-input"
                                    placeholder={t('staffSubscriptions.searchUserPlaceholder')}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                                {debouncedSearch.length < 2 ? (
                                    <span
                                        className="admin-field__hint"
                                        style={{ alignSelf: 'flex-start' }}
                                    >
                                        {t('staffSubscriptions.searchHint')}
                                    </span>
                                ) : userSearchQuery.isFetching ? (
                                    <span
                                        className="admin-field__hint"
                                        style={{ alignSelf: 'flex-start' }}
                                    >
                                        {t('staffCommon.loading')}
                                    </span>
                                ) : searchResults.length === 0 ? (
                                    <span
                                        className="admin-field__hint"
                                        style={{ alignSelf: 'flex-start' }}
                                    >
                                        {t('staffSubscriptions.noUsersFound')}
                                    </span>
                                ) : (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.35rem',
                                            maxHeight: '180px',
                                            overflowY: 'auto',
                                            marginTop: '0.25rem',
                                        }}
                                    >
                                        {searchResults.map((u) => (
                                            <button
                                                key={u._id}
                                                type="button"
                                                className="admin-btn admin-btn--secondary admin-btn--sm"
                                                style={{
                                                    justifyContent: 'space-between',
                                                    width: '100%',
                                                    textAlign: 'start',
                                                }}
                                                onClick={() => setSelectedUser(u)}
                                            >
                                                <span>
                                                    <strong>{u.username || shortId(u._id)}</strong>
                                                    {u.email ? ` · ${u.email}` : ''}
                                                </span>
                                                {u.isBrimume && (
                                                    <StatusBadge tone="info">
                                                        {t('staffSubscriptions.statusActive')}
                                                    </StatusBadge>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffSubscriptions.plan')}
                            </span>
                            <select
                                className="admin-input"
                                value={grantForm.planId}
                                onChange={(e) =>
                                    setGrantForm((p) => ({ ...p, planId: e.target.value }))
                                }
                                required
                            >
                                <option value="">
                                    {activePaidPlans.length === 0
                                        ? t('staffSubscriptions.noActivePlans')
                                        : t('staffSubscriptions.selectPlan')}
                                </option>
                                {activePaidPlans.map((p) => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} ({p.type})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffSubscriptions.durationDays')}
                            </span>
                            <input
                                type="number"
                                min="1"
                                max="36500"
                                step="1"
                                className="admin-input"
                                placeholder={
                                    selectedPlan?.days
                                        ? t('staffSubscriptions.durationPlaceholder', {
                                              days: selectedPlan.days,
                                          })
                                        : ''
                                }
                                value={grantForm.durationDays}
                                onChange={(e) =>
                                    setGrantForm((p) => ({ ...p, durationDays: e.target.value }))
                                }
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffSubscriptions.pricePaid')}
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                className="admin-input"
                                placeholder={
                                    selectedPlan?.price !== undefined
                                        ? t('staffSubscriptions.pricePaidPlaceholder', {
                                              price: formatNumber(selectedPlan.price, language),
                                          })
                                        : ''
                                }
                                value={grantForm.pricePaid}
                                onChange={(e) =>
                                    setGrantForm((p) => ({ ...p, pricePaid: e.target.value }))
                                }
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffSubscriptions.paymentReference')}
                            </span>
                            <input
                                type="text"
                                maxLength={200}
                                className="admin-input"
                                placeholder={t('staffSubscriptions.paymentReferencePlaceholder')}
                                value={grantForm.paymentReference}
                                onChange={(e) =>
                                    setGrantForm((p) => ({
                                        ...p,
                                        paymentReference: e.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>

                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffCommon.reason')}</span>
                        <textarea
                            className="admin-input admin-input--textarea"
                            rows={3}
                            maxLength={500}
                            placeholder={t('staffCommon.reasonPlaceholder')}
                            value={grantForm.reason}
                            onChange={(e) =>
                                setGrantForm((p) => ({ ...p, reason: e.target.value }))
                            }
                            required
                        />
                        <span className="admin-field__hint">{grantForm.reason.length}/500</span>
                    </label>

                    {grantError && <p className="admin-field__error">{grantError}</p>}

                    <div className="admin-modal__footer">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={closeGrantModal}
                            disabled={granting}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={granting || activePaidPlans.length === 0}
                        >
                            {granting
                                ? t('staffCommon.saving')
                                : t('staffSubscriptions.grantSubmit')}
                        </button>
                    </div>
                </form>
            </AdminModal>

            <ReasonModal
                open={Boolean(revokeTarget)}
                title={t('staffSubscriptions.revokeTitle')}
                description={
                    revokeTarget
                        ? t('staffSubscriptions.revokeDescription', {
                              user: userLabel(revokeTarget),
                          })
                        : ''
                }
                confirmLabel={t('staffSubscriptions.revokeConfirm')}
                tone="danger"
                reasonRequired
                maxLength={500}
                onConfirm={handleRevokeConfirm}
                onClose={() => setRevokeTarget(null)}
            />

            <AdminModal
                open={Boolean(detailRow)}
                title={t('staffSubscriptions.detailsTitle')}
                onClose={() => setDetailRow(null)}
                footer={
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        onClick={() => setDetailRow(null)}
                    >
                        {t('staffCommon.close')}
                    </button>
                }
            >
                {detailRow && (
                    <DetailList
                        items={[
                            { label: t('staffCommon.id'), value: detailRow._id },
                            {
                                label: t('staffCommon.user'),
                                value: userIdOf(detailRow) ? (
                                    <Link to={`/Owner/Users/${userIdOf(detailRow)}`}>
                                        {userLabel(detailRow)}
                                    </Link>
                                ) : null,
                            },
                            {
                                label: t('staffSubscriptions.plan'),
                                value: detailRow.plan
                                    ? `${detailRow.plan.name} (${detailRow.plan.type})`
                                    : detailRow.planId,
                            },
                            {
                                label: t('staffCommon.status'),
                                value: (
                                    <StatusBadge tone={STATUS_TONE[detailRow.status] || 'neutral'}>
                                        {statusLabel(detailRow.status)}
                                    </StatusBadge>
                                ),
                            },
                            {
                                label: t('staffSubscriptions.startDate'),
                                value: formatDate(detailRow.startDate, language),
                            },
                            {
                                label: t('staffSubscriptions.endDate'),
                                value: formatDate(detailRow.endDate, language),
                            },
                            {
                                label: t('staffSubscriptions.pricePaid'),
                                value:
                                    detailRow.pricePaid !== undefined && detailRow.pricePaid !== null
                                        ? formatNumber(detailRow.pricePaid, language)
                                        : null,
                            },
                            {
                                label: t('staffSubscriptions.paymentReference'),
                                value: detailRow.paymentReference,
                            },
                            {
                                label: t('staffSubscriptions.grantReason'),
                                value: detailRow.grantReason,
                            },
                            {
                                label: t('staffSubscriptions.grantedBy'),
                                value: detailRow.grantedBy,
                            },
                            {
                                label: t('staffSubscriptions.cancelledAt'),
                                value: formatDate(detailRow.cancelledAt, language),
                            },
                            {
                                label: t('staffSubscriptions.cancelledBy'),
                                value: detailRow.cancelledBy,
                            },
                            {
                                label: t('staffSubscriptions.cancelReason'),
                                value: detailRow.cancelReason,
                            },
                            {
                                label: t('staffCommon.createdAt'),
                                value: formatDate(detailRow.createdAt, language),
                            },
                        ]}
                    />
                )}
            </AdminModal>

            <AdminModal
                open={Boolean(approveTarget)}
                title={t('staffSubscriptions.approveTitle')}
                onClose={closeApproveModal}
            >
                {approveTarget && (
                    <form className="admin-form" onSubmit={handleApproveSubmit}>
                        <p style={{ margin: 0 }}>
                            {t('staffSubscriptions.approveDescription', {
                                user: userLabel(approveTarget),
                                plan: approveTarget.plan?.name || shortId(approveTarget.planId),
                            })}
                        </p>

                        <DetailList
                            items={[
                                {
                                    label: t('staffSubscriptions.paymentReference'),
                                    value: approveTarget.paymentReference,
                                },
                                {
                                    label: t('staffSubscriptions.note'),
                                    value: approveTarget.note,
                                },
                                {
                                    label: t('staffSubscriptions.invoice'),
                                    value: approveTarget.invoiceUrl ? (
                                        <a
                                            href={approveTarget.invoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {t('staffSubscriptions.viewInvoice')}
                                        </a>
                                    ) : null,
                                },
                            ]}
                        />

                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffSubscriptions.durationDays')}
                            </span>
                            <input
                                type="number"
                                min="1"
                                max="36500"
                                step="1"
                                className="admin-input"
                                placeholder={
                                    approveTarget.plan?.days
                                        ? t('staffSubscriptions.durationPlaceholder', {
                                              days: approveTarget.plan.days,
                                          })
                                        : ''
                                }
                                value={approveDuration}
                                onChange={(e) => setApproveDuration(e.target.value)}
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffCommon.reason')}</span>
                            <textarea
                                className="admin-input admin-input--textarea"
                                rows={3}
                                maxLength={500}
                                placeholder={t('staffCommon.reasonPlaceholder')}
                                value={approveReason}
                                onChange={(e) => setApproveReason(e.target.value)}
                                required
                            />
                            <span className="admin-field__hint">{approveReason.length}/500</span>
                        </label>

                        {approveError && <p className="admin-field__error">{approveError}</p>}

                        <div className="admin-modal__footer">
                            <button
                                type="button"
                                className="admin-btn admin-btn--secondary"
                                onClick={closeApproveModal}
                                disabled={approving}
                            >
                                {t('staffCommon.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="admin-btn admin-btn--primary"
                                disabled={approving}
                            >
                                {approving
                                    ? t('staffCommon.saving')
                                    : t('staffSubscriptions.approveSubmit')}
                            </button>
                        </div>
                    </form>
                )}
            </AdminModal>

            <ReasonModal
                open={Boolean(rejectTarget)}
                title={t('staffSubscriptions.rejectTitle')}
                description={
                    rejectTarget
                        ? t('staffSubscriptions.rejectDescription', {
                              user: userLabel(rejectTarget),
                              plan: rejectTarget.plan?.name || shortId(rejectTarget.planId),
                          })
                        : ''
                }
                confirmLabel={t('staffSubscriptions.rejectConfirm')}
                tone="danger"
                reasonRequired
                maxLength={500}
                onConfirm={handleRejectConfirm}
                onClose={() => setRejectTarget(null)}
            />

            <AdminModal
                open={Boolean(requestDetailRow)}
                title={t('staffSubscriptions.requestDetailsTitle')}
                onClose={() => setRequestDetailRow(null)}
                footer={
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        onClick={() => setRequestDetailRow(null)}
                    >
                        {t('staffCommon.close')}
                    </button>
                }
            >
                {requestDetailRow && (
                    <DetailList
                        items={[
                            { label: t('staffCommon.id'), value: requestDetailRow._id },
                            {
                                label: t('staffCommon.user'),
                                value: userIdOf(requestDetailRow) ? (
                                    <Link to={`/Owner/Users/${userIdOf(requestDetailRow)}`}>
                                        {userLabel(requestDetailRow)}
                                    </Link>
                                ) : null,
                            },
                            {
                                label: t('staffSubscriptions.plan'),
                                value: requestDetailRow.plan
                                    ? `${requestDetailRow.plan.name} (${requestDetailRow.plan.type})`
                                    : requestDetailRow.planId,
                            },
                            {
                                label: t('staffCommon.status'),
                                value: (
                                    <StatusBadge
                                        tone={REQUEST_STATUS_TONE[requestDetailRow.status] || 'neutral'}
                                    >
                                        {requestStatusLabel(requestDetailRow.status)}
                                    </StatusBadge>
                                ),
                            },
                            {
                                label: t('staffSubscriptions.paymentReference'),
                                value: requestDetailRow.paymentReference,
                            },
                            {
                                label: t('staffSubscriptions.note'),
                                value: requestDetailRow.note,
                            },
                            {
                                label: t('staffSubscriptions.invoice'),
                                value: requestDetailRow.invoiceUrl ? (
                                    <a
                                        href={requestDetailRow.invoiceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {t('staffSubscriptions.viewInvoice')}
                                    </a>
                                ) : null,
                            },
                            {
                                label: t('staffSubscriptions.reviewedBy'),
                                value: requestDetailRow.reviewedBy,
                            },
                            {
                                label: t('staffSubscriptions.reviewedAt'),
                                value: formatDate(requestDetailRow.reviewedAt, language),
                            },
                            {
                                label: t('staffSubscriptions.reviewReason'),
                                value: requestDetailRow.reviewReason,
                            },
                            {
                                label: t('staffSubscriptions.linkedSubscription'),
                                value: requestDetailRow.subscriptionId,
                            },
                            {
                                label: t('staffCommon.createdAt'),
                                value: formatDate(requestDetailRow.createdAt, language),
                            },
                        ]}
                    />
                )}
            </AdminModal>
        </AdminPage>
    );
}
