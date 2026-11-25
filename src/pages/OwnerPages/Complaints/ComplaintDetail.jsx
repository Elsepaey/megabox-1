import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { MdArrowBack, MdEmail, MdFeedback, MdInfoOutline, MdOpenInNew } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { moderationAdmin } from '../../../services/admin/moderationAdmin';
import {
    AdminCard,
    AdminPage,
    DetailList,
    ErrorState,
    LoadingState,
    StatusBadge,
} from '../_shared/AdminUI';
import { formatDate, shortId } from '../_shared/formatters';
import '../Reports/moderation.scss';

const COMPLAINT_STATUS_TONES = {
    pending: 'warning',
    reviewed: 'info',
    resolved: 'success',
};

export default function ComplaintDetail() {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState('pending');
    const [adminNote, setAdminNote] = useState('');

    const {
        data: complaint,
        isLoading,
        error,
        refetch,
    } = useQuery(['staff:complaint', id], () => moderationAdmin.getComplaint(id), {
        enabled: Boolean(id),
        retry: false,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (complaint?.status) {
            setStatus(complaint.status);
        }
    }, [complaint?.status]);

    const updateMutation = useMutation(
        (payload) =>
            moderationAdmin.updateComplaintStatus(id, payload, t('staffComplaints.updateFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffComplaints.statusUpdated'), ToastOptions('success'));
                setAdminNote('');
                queryClient.invalidateQueries(['staff:complaint', id]);
                queryClient.invalidateQueries('staff:complaints');
            },
        },
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedNote = adminNote.trim();
        updateMutation.mutate({
            status,
            ...(trimmedNote ? { adminNote: trimmedNote } : {}),
        });
    };

    const overviewItems = useMemo(() => {
        if (!complaint) return [];

        const primaryTypeName = complaint.type
            ? language === 'ar'
                ? complaint.type.name_ar || complaint.type.name_en
                : complaint.type.name_en || complaint.type.name_ar
            : null;
        const secondaryTypeName = complaint.type
            ? language === 'ar'
                ? complaint.type.name_en
                : complaint.type.name_ar
            : null;

        const typeValue = complaint.type ? (
            <span className="moderation-inline-meta">
                <span>
                    {primaryTypeName}
                    {secondaryTypeName && secondaryTypeName !== primaryTypeName
                        ? ` / ${secondaryTypeName}`
                        : ''}
                </span>
                {!complaint.type.isActive && (
                    <StatusBadge tone="neutral">{t('staffComplaints.retiredTag')}</StatusBadge>
                )}
            </span>
        ) : complaint.typeId ? (
            <span className="moderation-inline-meta">
                <span className="moderation-muted">{t('staffComplaints.typeUnavailable')}</span>
                <span className="moderation-mono">({shortId(complaint.typeId)})</span>
            </span>
        ) : null;

        const submitterValue = complaint.userId ? (
            <span className="moderation-inline-meta">
                <Link to={`/Owner/Users/${complaint.userId}`} className="moderation-link">
                    {complaint.submitter?.username
                        ? `${complaint.submitter.username} (${shortId(complaint.userId)})`
                        : complaint.userId}
                </Link>
                {!complaint.submitter && (
                    <span className="moderation-muted">
                        ({t('staffComplaints.submitterUnavailable')})
                    </span>
                )}
            </span>
        ) : null;

        const reviewedByValue = complaint.reviewedBy ? (
            <Link to={`/Owner/Users/${complaint.reviewedBy}`} className="moderation-link moderation-mono">
                {shortId(complaint.reviewedBy)}
            </Link>
        ) : null;

        return [
            {
                label: t('staffCommon.id'),
                value: <span className="moderation-mono">{complaint._id}</span>,
            },
            {
                label: t('staffCommon.status'),
                value: (
                    <StatusBadge tone={COMPLAINT_STATUS_TONES[complaint.status] || 'neutral'}>
                        {t(`staffComplaints.statuses.${complaint.status}`)}
                    </StatusBadge>
                ),
            },
            {
                label: t('staffComplaints.type'),
                value: typeValue,
            },
            {
                label: t('staffComplaints.submitter'),
                value: submitterValue,
            },
            {
                label: t('staffComplaints.email'),
                value: complaint.email,
            },
            {
                label: t('staffCommon.createdAt'),
                value: formatDate(complaint.createdAt, language),
            },
            {
                label: t('staffComplaints.reviewedBy'),
                value: reviewedByValue,
            },
            {
                label: t('staffComplaints.reviewedAt'),
                value: formatDate(complaint.reviewedAt, language),
            },
        ];
    }, [complaint, t, language]);

    return (
        <AdminPage
            icon={MdFeedback}
            title={t('staffComplaints.detailTitle')}
            subtitle={t('staffComplaints.detailSubtitle')}
            actions={
                <Link to="/Owner/Complaints" className="admin-btn admin-btn--secondary">
                    <MdArrowBack size={18} />
                    {t('staffCommon.back')}
                </Link>
            }
        >
            {isLoading && <LoadingState />}
            {!isLoading && error && <ErrorState error={error} onRetry={refetch} />}
            {!isLoading && !error && complaint && (
                <>
                    <AdminCard title={t('staffComplaints.overviewTitle')}>
                        <DetailList items={overviewItems} />
                    </AdminCard>

                    <AdminCard title={t('staffComplaints.contentTitle')}>
                        <div>
                            <span className="moderation-section__label">
                                {t('staffComplaints.description')}
                            </span>
                            <p className="moderation-text-box">{complaint.description || '—'}</p>
                        </div>

                        <div className="moderation-section">
                            <span className="moderation-section__label">
                                {t('staffComplaints.attachments')}
                            </span>
                            {complaint.images?.length > 0 ? (
                                <div className="moderation-gallery">
                                    {complaint.images.map((img, idx) => (
                                        <a
                                            key={`${img.secure_url}-${idx}`}
                                            href={img.secure_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="moderation-gallery__item"
                                            aria-label={t('staffComplaints.openImage', {
                                                index: idx + 1,
                                            })}
                                        >
                                            {/\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i.test(img.secure_url || '') ? (
                                                <img
                                                    src={img.secure_url}
                                                    alt={t('staffComplaints.openImage', {
                                                        index: idx + 1,
                                                    })}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span className="moderation-gallery__file">
                                                    {decodeURIComponent((img.secure_url || '').split('?')[0].split('/').pop() || '')}
                                                </span>
                                            )}
                                            <span
                                                className="moderation-gallery__badge"
                                                aria-hidden="true"
                                            >
                                                <MdOpenInNew size={14} />
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="moderation-muted">
                                    {t('staffComplaints.noAttachments')}
                                </p>
                            )}
                        </div>

                        <div className="moderation-section">
                            <span className="moderation-section__label">
                                {t('staffComplaints.currentAdminNote')}
                            </span>
                            {complaint.adminNote ? (
                                <p className="moderation-text-box">{complaint.adminNote}</p>
                            ) : (
                                <p className="moderation-muted">{t('staffComplaints.noAdminNote')}</p>
                            )}
                        </div>
                    </AdminCard>

                    <AdminCard title={t('staffComplaints.updateTitle')}>
                        <form onSubmit={handleSubmit} className="admin-form">
                            <div
                                className={`moderation-notice ${
                                    complaint.email
                                        ? 'moderation-notice--warning'
                                        : 'moderation-notice--info'
                                }`}
                            >
                                {complaint.email ? (
                                    <MdEmail size={18} className="moderation-notice__icon" />
                                ) : (
                                    <MdInfoOutline size={18} className="moderation-notice__icon" />
                                )}
                                <span>
                                    {complaint.email
                                        ? t('staffComplaints.emailNoticeWithEmail', {
                                              email: complaint.email,
                                          })
                                        : t('staffComplaints.emailNoticeNoEmail')}
                                </span>
                            </div>

                            <div className="admin-form-grid">
                                <label className="admin-field">
                                    <span className="admin-field__label">
                                        {t('staffCommon.status')}
                                    </span>
                                    <select
                                        className="admin-input"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        disabled={updateMutation.isLoading}
                                    >
                                        <option value="pending">
                                            {t('staffComplaints.statuses.pending')}
                                        </option>
                                        <option value="reviewed">
                                            {t('staffComplaints.statuses.reviewed')}
                                        </option>
                                        <option value="resolved">
                                            {t('staffComplaints.statuses.resolved')}
                                        </option>
                                    </select>
                                </label>
                            </div>

                            <label className="admin-field">
                                <span className="admin-field__label">
                                    {t('staffComplaints.adminNote')}
                                </span>
                                <textarea
                                    className="admin-input admin-input--textarea"
                                    rows={4}
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder={t('staffComplaints.adminNotePlaceholder')}
                                    disabled={updateMutation.isLoading}
                                />
                            </label>

                            <div className="moderation-actions-row">
                                <button
                                    type="submit"
                                    className="admin-btn admin-btn--primary"
                                    disabled={updateMutation.isLoading}
                                >
                                    {updateMutation.isLoading
                                        ? t('staffCommon.saving')
                                        : t('staffComplaints.updateSubmit')}
                                </button>
                            </div>
                        </form>
                    </AdminCard>
                </>
            )}
        </AdminPage>
    );
}
