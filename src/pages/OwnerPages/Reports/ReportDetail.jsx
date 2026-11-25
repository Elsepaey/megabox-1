import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { MdArrowBack, MdFlag, MdInfoOutline, MdOpenInNew } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import { moderationAdmin } from '../../../services/admin/moderationAdmin';
import {
    AdminCard,
    AdminPage,
    DetailList,
    ErrorState,
    LoadingState,
    ReasonModal,
    StatusBadge,
} from '../_shared/AdminUI';
import { formatDate, shortId } from '../_shared/formatters';
import './moderation.scss';

const REPORT_STATUS_TONES = {
    pending: 'warning',
    in_review: 'info',
    resolved: 'success',
    dismissed: 'neutral',
};

const TARGET_STATE_TONES = {
    available: 'success',
    saved_only: 'warning',
    removed: 'danger',
};

const ALLOWED_TRANSITIONS = {
    pending: ['in_review', 'resolved', 'dismissed'],
    in_review: ['resolved', 'dismissed'],
    resolved: [],
    dismissed: [],
};

export default function ReportDetail() {
    const { id } = useParams();
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const [activeTransition, setActiveTransition] = useState(null);

    const {
        data: report,
        isLoading,
        error,
        refetch,
    } = useQuery(['staff:report', id], () => moderationAdmin.getReport(id), {
        enabled: Boolean(id),
        retry: false,
        refetchOnWindowFocus: false,
    });

    const allowedActions = useMemo(
        () => ALLOWED_TRANSITIONS[report?.status] || [],
        [report?.status],
    );

    const handleConfirmTransition = async (decisionNote) => {
        if (!activeTransition) return;
        try {
            await moderationAdmin.updateReportStatus(
                id,
                { status: activeTransition, decisionNote },
                t('staffReports.updateFailed'),
            );
            toast.success(t('staffReports.statusUpdated'), ToastOptions('success'));
            setActiveTransition(null);
            await Promise.all([
                queryClient.invalidateQueries(['staff:report', id]),
                queryClient.invalidateQueries('staff:reports'),
            ]);
        } catch (err) {
            if (apiErrorStatus(err) === 409) {
                toast.warning(t('staffCommon.conflictReload'), ToastOptions('warning'));
                setActiveTransition(null);
                queryClient.invalidateQueries('staff:reports');
                await refetch();
                return;
            }
            throw err;
        }
    };

    const modalConfig = useMemo(() => {
        if (activeTransition === 'in_review') {
            return {
                title: t('staffReports.modals.inReviewTitle'),
                description: t('staffReports.modals.inReviewDescription'),
                confirmLabel: t('staffReports.actions.markInReview'),
                tone: 'primary',
                reasonRequired: false,
            };
        }
        if (activeTransition === 'resolved') {
            return {
                title: t('staffReports.modals.resolveTitle'),
                description: t('staffReports.modals.resolveDescription'),
                confirmLabel: t('staffReports.actions.resolve'),
                tone: 'primary',
                reasonRequired: true,
            };
        }
        if (activeTransition === 'dismissed') {
            return {
                title: t('staffReports.modals.dismissTitle'),
                description: t('staffReports.modals.dismissDescription'),
                confirmLabel: t('staffReports.actions.dismiss'),
                tone: 'danger',
                reasonRequired: true,
            };
        }
        return null;
    }, [activeTransition, t]);

    const targetHref = report
        ? report.targetType === 'channel'
            ? `/Owner/Channels/${report.targetId}`
            : `/Owner/Files/${report.targetId}`
        : null;

    const overviewItems = useMemo(() => {
        if (!report) return [];
        const reporterValue = report.reporterId ? (
            <span className="moderation-inline-meta">
                <Link to={`/Owner/Users/${report.reporterId}`} className="moderation-link">
                    {report.reporter?.username
                        ? `${report.reporter.username} (${shortId(report.reporterId)})`
                        : report.reporterId}
                </Link>
                {!report.reporter && (
                    <span className="moderation-muted">({t('staffReports.reporterUnavailable')})</span>
                )}
            </span>
        ) : null;

        const reviewedByValue = report.reviewedBy ? (
            <Link to={`/Owner/Users/${report.reviewedBy}`} className="moderation-link moderation-mono">
                {shortId(report.reviewedBy)}
            </Link>
        ) : null;

        return [
            {
                label: t('staffCommon.id'),
                value: <span className="moderation-mono">{report._id}</span>,
            },
            {
                label: t('staffCommon.status'),
                value: (
                    <StatusBadge tone={REPORT_STATUS_TONES[report.status] || 'neutral'}>
                        {t(`staffReports.statuses.${report.status}`)}
                    </StatusBadge>
                ),
            },
            {
                label: t('staffReports.targetType'),
                value: t(`staffReports.targetTypes.${report.targetType}`),
            },
            {
                label: t('staffCommon.createdAt'),
                value: formatDate(report.createdAt, language),
            },
            {
                label: t('staffReports.reporter'),
                value: reporterValue,
            },
            {
                label: t('staffReports.reviewedBy'),
                value: reviewedByValue,
            },
            {
                label: t('staffReports.reviewedAt'),
                value: formatDate(report.reviewedAt, language),
            },
        ];
    }, [report, t, language]);

    const targetItems = useMemo(() => {
        if (!report) return [];
        const target = report.target || {};
        const items = [
            {
                label: t('staffReports.targetState'),
                value: target.state ? (
                    <StatusBadge tone={TARGET_STATE_TONES[target.state] || 'neutral'}>
                        {t(`staffReports.targetStates.${target.state}`)}
                    </StatusBadge>
                ) : null,
            },
            {
                label: t('staffReports.targetId'),
                value: <span className="moderation-mono">{report.targetId}</span>,
            },
            {
                label: t('staffReports.targetName'),
                value: target.name,
            },
            {
                label: t('staffCommon.owner'),
                value: target.ownerId ? (
                    <Link to={`/Owner/Users/${target.ownerId}`} className="moderation-link moderation-mono">
                        {shortId(target.ownerId)}
                    </Link>
                ) : null,
            },
        ];

        if (report.targetType === 'file') {
            items.push(
                { label: t('staffReports.fileType'), value: target.fileType },
                { label: t('staffReports.uploadStatus'), value: target.uploadStatus },
                {
                    label: t('staffReports.channel'),
                    value: target.channelId ? (
                        <Link
                            to={`/Owner/Channels/${target.channelId}`}
                            className="moderation-link moderation-mono"
                        >
                            {shortId(target.channelId)}
                        </Link>
                    ) : null,
                },
            );
        } else if (report.targetType === 'channel') {
            items.push(
                { label: t('staffReports.visibility'), value: target.visibility },
                {
                    label: t('staffReports.active'),
                    value:
                        target.isActive === undefined
                            ? null
                            : target.isActive
                              ? t('staffCommon.yes')
                              : t('staffCommon.no'),
                },
            );
        }

        return items;
    }, [report, t]);

    return (
        <AdminPage
            icon={MdFlag}
            title={t('staffReports.detailTitle')}
            subtitle={t('staffReports.detailSubtitle')}
            actions={
                <Link to="/Owner/Reports" className="admin-btn admin-btn--secondary">
                    <MdArrowBack size={18} />
                    {t('staffCommon.back')}
                </Link>
            }
        >
            {isLoading && <LoadingState />}
            {!isLoading && error && <ErrorState error={error} onRetry={refetch} />}
            {!isLoading && !error && report && (
                <>
                    <AdminCard
                        title={t('staffReports.actionsTitle')}
                        actions={
                            allowedActions.length > 0 && (
                                <div className="moderation-actions-row">
                                    {allowedActions.includes('in_review') && (
                                        <button
                                            type="button"
                                            className="admin-btn admin-btn--secondary"
                                            onClick={() => setActiveTransition('in_review')}
                                        >
                                            {t('staffReports.actions.markInReview')}
                                        </button>
                                    )}
                                    {allowedActions.includes('resolved') && (
                                        <button
                                            type="button"
                                            className="admin-btn admin-btn--primary"
                                            onClick={() => setActiveTransition('resolved')}
                                        >
                                            {t('staffReports.actions.resolve')}
                                        </button>
                                    )}
                                    {allowedActions.includes('dismissed') && (
                                        <button
                                            type="button"
                                            className="admin-btn admin-btn--danger"
                                            onClick={() => setActiveTransition('dismissed')}
                                        >
                                            {t('staffReports.actions.dismiss')}
                                        </button>
                                    )}
                                </div>
                            )
                        }
                    >
                        <div className="moderation-notice moderation-notice--info">
                            <MdInfoOutline size={18} className="moderation-notice__icon" />
                            <span>
                                {allowedActions.length === 0
                                    ? `${t('staffReports.terminalHint')} ${t('staffReports.enforcementNote')}`
                                    : t('staffReports.enforcementNote')}
                            </span>
                        </div>
                    </AdminCard>

                    <AdminCard title={t('staffReports.overviewTitle')}>
                        <DetailList items={overviewItems} />
                        {report.decisionNote && (
                            <div className="moderation-section">
                                <span className="moderation-section__label">
                                    {t('staffReports.decisionNote')}
                                </span>
                                <p className="moderation-text-box">{report.decisionNote}</p>
                            </div>
                        )}
                    </AdminCard>

                    <AdminCard
                        title={t('staffReports.targetTitle')}
                        actions={
                            targetHref && (
                                <Link to={targetHref} className="admin-btn admin-btn--secondary admin-btn--sm">
                                    <MdOpenInNew size={16} />
                                    {report.targetType === 'channel'
                                        ? t('staffReports.openTargetChannel')
                                        : t('staffReports.openTargetFile')}
                                </Link>
                            )
                        }
                    >
                        <DetailList items={targetItems} />
                        {report.target?.state === 'saved_only' && (
                            <div className="moderation-section">
                                <div className="moderation-notice moderation-notice--warning">
                                    <MdInfoOutline size={18} className="moderation-notice__icon" />
                                    <span>{t('staffReports.savedOnlyHint')}</span>
                                </div>
                            </div>
                        )}
                        {report.target?.state === 'removed' && (
                            <div className="moderation-section">
                                <div className="moderation-notice moderation-notice--warning">
                                    <MdInfoOutline size={18} className="moderation-notice__icon" />
                                    <span>{t('staffReports.removedHint')}</span>
                                </div>
                            </div>
                        )}
                    </AdminCard>

                    <AdminCard title={t('staffReports.evidenceTitle')}>
                        <div>
                            <span className="moderation-section__label">
                                {t('staffReports.description')}
                            </span>
                            <p className="moderation-text-box">{report.description || '—'}</p>
                        </div>

                        <div className="moderation-section">
                            <span className="moderation-section__label">
                                {t('staffReports.attachments')}
                            </span>
                            {report.images?.length > 0 ? (
                                <div className="moderation-gallery">
                                    {report.images.map((img, idx) => (
                                        <a
                                            key={`${img.secure_url}-${idx}`}
                                            href={img.secure_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="moderation-gallery__item"
                                            aria-label={t('staffReports.openImage', { index: idx + 1 })}
                                        >
                                            <img
                                                src={img.secure_url}
                                                alt={t('staffReports.openImage', { index: idx + 1 })}
                                                loading="lazy"
                                            />
                                            <span className="moderation-gallery__badge" aria-hidden="true">
                                                <MdOpenInNew size={14} />
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="moderation-muted">{t('staffReports.noAttachments')}</p>
                            )}
                        </div>
                    </AdminCard>
                </>
            )}

            <ReasonModal
                open={Boolean(activeTransition)}
                title={modalConfig?.title}
                description={modalConfig?.description}
                confirmLabel={modalConfig?.confirmLabel}
                tone={modalConfig?.tone}
                maxLength={2000}
                reasonRequired={Boolean(modalConfig?.reasonRequired)}
                reasonLabel={t('staffReports.decisionNote')}
                onConfirm={handleConfirmTransition}
                onClose={() => setActiveTransition(null)}
            />
        </AdminPage>
    );
}
