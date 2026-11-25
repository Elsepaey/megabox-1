import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaMoneyBillWave } from 'react-icons/fa';
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
    ReasonModal,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import useStaffRole from '../_shared/useStaffRole';
import { formatDate, formatNumber, shortId } from '../_shared/formatters';

const STATUS_TONE = {
    pending: 'warning',
    approved: 'info',
    completed: 'success',
    rejected: 'danger',
};

function methodNameOf(row, language) {
    const info = row?.paymentMethodInfo;
    if (info && typeof info === 'object') {
        return (language === 'ar' ? info.name_ar : info.name_en) || info.name_en || row?.paymentMethod || '—';
    }
    return row?.paymentMethod || '—';
}

function formatPaymentDetails(row, language) {
    const map = row?.paymentDetailsMap;
    if (map && typeof map === 'object' && !Array.isArray(map)) {
        const fieldLabels = new Map(
            (row?.paymentMethodInfo?.fields || []).map((f) => [
                f.key,
                (language === 'ar' ? f.label_ar : f.label_en) || f.key,
            ]),
        );
        const entries = Object.entries(map).filter(
            ([, v]) => v !== undefined && v !== null && v !== '',
        );
        if (entries.length > 0) {
            return entries.map(([k, v]) => `${fieldLabels.get(k) || k}: ${String(v)}`).join(' · ');
        }
    }
    const details = row?.paymentDetails;
    if (!details) return '—';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
        const entries = Object.entries(details).filter(
            ([, v]) => v !== undefined && v !== null && v !== '',
        );
        if (entries.length === 0) return '—';
        return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' · ');
    }
    return String(details);
}
function userDisplay(row) {
    const u = row?.userId;
    if (u && typeof u === 'object') {
        return u.username || u.email || shortId(u._id);
    }
    return shortId(u);
}

function userIdOf(row) {
    const u = row?.userId;
    if (u && typeof u === 'object') return u._id;
    return u;
}

export default function Withdrawals() {
    const { t, language } = useLanguage();
    const { userId: currentStaffId } = useStaffRole();
    const [actionModal, setActionModal] = useState(null); // { row, nextStatus }
    const [detailRow, setDetailRow] = useState(null);

    const list = useAdminList('staff:withdrawals', financeAdmin.listWithdrawals, {
        initialFilters: { status: '' },
        limit: 20,
    });

    const tabs = [
        { key: '', label: t('staffWithdrawals.statusAll') },
        { key: 'pending', label: t('staffWithdrawals.statusPending') },
        { key: 'approved', label: t('staffWithdrawals.statusApproved') },
        { key: 'completed', label: t('staffWithdrawals.statusCompleted') },
        { key: 'rejected', label: t('staffWithdrawals.statusRejected') },
    ];

    const statusLabel = (status) => {
        const map = {
            pending: t('staffWithdrawals.statusPending'),
            approved: t('staffWithdrawals.statusApproved'),
            completed: t('staffWithdrawals.statusCompleted'),
            rejected: t('staffWithdrawals.statusRejected'),
        };
        return map[status] || status || '—';
    };

    const handleConfirmAction = async (reason) => {
        if (!actionModal) return;
        const { row, nextStatus } = actionModal;
        const body =
            nextStatus === 'rejected'
                ? { status: 'rejected', rejectionReason: reason }
                : { status: nextStatus };

        try {
            await financeAdmin.updateWithdrawalStatus(row._id, body);
            const successKey =
                nextStatus === 'approved'
                    ? 'staffWithdrawals.approvedSuccess'
                    : nextStatus === 'completed'
                      ? 'staffWithdrawals.completedSuccess'
                      : 'staffWithdrawals.rejectedSuccess';
            toast.success(t(successKey), ToastOptions('success'));
            setActionModal(null);
            list.refetch();
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
                setActionModal(null);
                list.refetch();
            }
        }
    };

    const columns = [
        {
            key: 'user',
            header: t('staffCommon.user'),
            render: (row) => {
                const uid = userIdOf(row);
                const email = row.userId && typeof row.userId === 'object' ? row.userId.email : null;
                return (
                    <div>
                        {uid ? (
                            <Link to={`/Owner/Users/${uid}`} style={{ fontWeight: 600 }}>
                                {userDisplay(row)}
                            </Link>
                        ) : (
                            '—'
                        )}
                        {email && (
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{email}</div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'amount',
            header: t('staffWithdrawals.amount'),
            render: (row) => <strong>{formatNumber(row.amount, language)}</strong>,
        },
        {
            key: 'paymentMethod',
            header: t('staffWithdrawals.paymentMethod'),
            render: (row) => {
                const detailsText = formatPaymentDetails(row, language);
                return (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600 }}>{methodNameOf(row, language)}</span>
                            {row.paymentMethodInfo?.type && (
                                <StatusBadge tone="neutral">{row.paymentMethodInfo.type}</StatusBadge>
                            )}
                        </div>
                        <div
                            style={{
                                fontSize: '0.75rem',
                                opacity: 0.75,
                                maxWidth: '260px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            title={detailsText}
                        >
                            {detailsText}
                        </div>
                    </div>
                );
            },
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
            key: 'createdAt',
            header: t('staffCommon.createdAt'),
            render: (row) => formatDate(row.createdAt, language),
        },
        {
            key: 'processedAt',
            header: t('staffWithdrawals.processedAt'),
            render: (row) => formatDate(row.processedAt, language),
        },
        {
            key: 'actions',
            header: t('staffCommon.actions'),
            render: (row) => {
                const rowUserId = userIdOf(row);
                const isSelf =
                    Boolean(currentStaffId) &&
                    Boolean(rowUserId) &&
                    String(rowUserId).toLowerCase() === String(currentStaffId).toLowerCase();
                return (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                            onClick={() => setDetailRow(row)}
                        >
                            {t('staffWithdrawals.details')}
                        </button>
                        {!isSelf && row.status === 'pending' && (
                            <>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--primary admin-btn--sm"
                                    onClick={() => setActionModal({ row, nextStatus: 'approved' })}
                                >
                                    {t('staffWithdrawals.approve')}
                                </button>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--danger admin-btn--sm"
                                    onClick={() => setActionModal({ row, nextStatus: 'rejected' })}
                                >
                                    {t('staffWithdrawals.reject')}
                                </button>
                            </>
                        )}
                        {!isSelf && row.status === 'approved' && (
                            <>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--primary admin-btn--sm"
                                    onClick={() => setActionModal({ row, nextStatus: 'completed' })}
                                >
                                    {t('staffWithdrawals.complete')}
                                </button>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--danger admin-btn--sm"
                                    onClick={() => setActionModal({ row, nextStatus: 'rejected' })}
                                >
                                    {t('staffWithdrawals.reject')}
                                </button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    const modalTitle =
        actionModal?.nextStatus === 'approved'
            ? t('staffWithdrawals.approveTitle')
            : actionModal?.nextStatus === 'completed'
              ? t('staffWithdrawals.completeTitle')
              : t('staffWithdrawals.rejectTitle');

    const modalDescription = actionModal
        ? t(
              actionModal.nextStatus === 'approved'
                  ? 'staffWithdrawals.approveDescription'
                  : actionModal.nextStatus === 'completed'
                    ? 'staffWithdrawals.completeDescription'
                    : 'staffWithdrawals.rejectDescription',
              {
                  amount: formatNumber(actionModal.row.amount, language),
                  user: userDisplay(actionModal.row),
              },
          )
        : '';

    const modalConfirmLabel =
        actionModal?.nextStatus === 'approved'
            ? t('staffWithdrawals.approve')
            : actionModal?.nextStatus === 'completed'
              ? t('staffWithdrawals.complete')
              : t('staffWithdrawals.reject');

    return (
        <AdminPage
            icon={FaMoneyBillWave}
            title={t('staffWithdrawals.title')}
            subtitle={t('staffWithdrawals.subtitle')}
        >
            <AdminTabs
                tabs={tabs}
                active={list.filters.status || ''}
                onChange={(key) => list.setFilter('status', key)}
            />

            <AdminTable
                title={t('staffWithdrawals.title')}
                columns={columns}
                rows={list.rows}
                rowKey="_id"
                loading={list.isLoading}
                error={list.error}
                onRetry={list.refetch}
                meta={list.meta}
                onPageChange={list.setPage}
            />

            <ReasonModal
                open={Boolean(actionModal)}
                title={modalTitle}
                description={modalDescription}
                confirmLabel={modalConfirmLabel}
                tone={actionModal?.nextStatus === 'rejected' ? 'danger' : 'primary'}
                hideReason={actionModal?.nextStatus !== 'rejected'}
                reasonRequired={actionModal?.nextStatus === 'rejected'}
                maxLength={500}
                onConfirm={handleConfirmAction}
                onClose={() => setActionModal(null)}
            />

            <AdminModal
                open={Boolean(detailRow)}
                title={t('staffWithdrawals.detailsTitle')}
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
                                        {userDisplay(detailRow)}
                                    </Link>
                                ) : null,
                            },
                            {
                                label: t('staffWithdrawals.amount'),
                                value: formatNumber(detailRow.amount, language),
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
                                label: t('staffWithdrawals.paymentMethod'),
                                value: methodNameOf(detailRow, language),
                            },
                            ...(detailRow.paymentMethodInfo?.type
                                ? [
                                      {
                                          label: t('staffPaymentMethods.methodType'),
                                          value: detailRow.paymentMethodInfo.type,
                                      },
                                  ]
                                : []),
                            {
                                label: t('staffWithdrawals.paymentDetails'),
                                value: formatPaymentDetails(detailRow, language),
                            },
                            {
                                label: t('staffCommon.createdAt'),
                                value: formatDate(detailRow.createdAt, language),
                            },
                            {
                                label: t('staffWithdrawals.processedAt'),
                                value: formatDate(detailRow.processedAt, language),
                            },
                            {
                                label: t('staffWithdrawals.rejectionReason'),
                                value: detailRow.rejectionReason,
                            },
                        ]}
                    />
                )}
            </AdminModal>
        </AdminPage>
    );
}
