import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useCookies } from 'react-cookie';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaCopy,
    FaCheck,
    FaUsers,
    FaCalendarDay,
    FaUserCheck,
    FaBullhorn,
    FaExclamationTriangle,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { userService } from '../../services/userService';
import { useLanguage } from '../../context/LanguageContext';
import { ToastOptions } from '../../helpers/ToastOptions';
import Loading from '../../components/Loading/Loading';
import Pagination from '../../components/Pagination/Pagination';
import './Referral.scss';

const REFERRALS_LIMIT = 20;

export default function Referral() {
    const { t, language } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const token = cookies.MegaBox;
    const [page, setPage] = useState(1);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const {
        data: referralData,
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useQuery(
        ['userReferrals', page],
        () => userService.getReferralStats({ page, limit: REFERRALS_LIMIT }, token),
        {
            enabled: !!token,
            keepPreviousData: true,
            retry: false,
        },
    );

    const referralLink = referralData?.referralLink || '';
    const stats = referralData?.stats || {
        totalReferrals: 0,
        todayReferrals: 0,
        confirmedReferrals: 0,
        promoterReferrals: 0,
    };
    const referrals = Array.isArray(referralData?.data) ? referralData.data : [];
    const meta = referralData?.meta || {
        total: 0,
        page,
        limit: REFERRALS_LIMIT,
        totalPages: 0,
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return '-';
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleCopyLink = async () => {
        if (!referralLink) {
            toast.error(t('payouts.referralLinkMissing') || 'Referral link is not available', ToastOptions('error'));
            return;
        }
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            toast.success(t('referral.linkCopied') || 'Referral link copied', ToastOptions('success'));
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('referral.copyFailed') || 'Failed to copy link', ToastOptions('error'));
        }
    };

    if (isLoading && !referralData) {
        return <Loading />;
    }

    const statCards = [
        {
            key: 'total',
            label: t('referral.totalRefers') || 'Total Referrals',
            value: stats.totalReferrals ?? 0,
            icon: FaUsers,
        },
        {
            key: 'today',
            label: t('referral.todayRefers') || 'Today Referrals',
            value: stats.todayReferrals ?? 0,
            icon: FaCalendarDay,
        },
        {
            key: 'confirmed',
            label: t('referral.confirmedRefers') || 'Confirmed Referrals',
            value: stats.confirmedReferrals ?? 0,
            icon: FaUserCheck,
        },
        {
            key: 'promoter',
            label: t('referral.promoterRefers') || 'Promoter Referrals',
            value: stats.promoterReferrals ?? 0,
            icon: FaBullhorn,
        },
    ];

    const startIndex = (page - 1) * REFERRALS_LIMIT;
    const endIndex = Math.min(page * REFERRALS_LIMIT, meta.total || 0);

    return (
        <div className="referral-page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="referral-page__wrapper">
                {/* Referral Link Banner */}
                <motion.div
                    className="referral-banner"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="referral-banner__content">
                        <div className="referral-banner__text">
                            <h2 className="referral-banner__title">
                                <span className="referral-banner__title-text">
                                    {t('payouts.referralLinkLabel') || 'Your Referral Link'}
                                </span>
                            </h2>
                            {referralLink ? (
                                <p
                                    style={{
                                        margin: '0.5rem 0 1rem',
                                        wordBreak: 'break-all',
                                        fontSize: '0.9rem',
                                        opacity: 0.95,
                                    }}
                                >
                                    {referralLink}
                                </p>
                            ) : (
                                <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.9rem', opacity: 0.85 }}>
                                    {t('payouts.referralLinkMissing') || 'Referral link is not available for this account.'}
                                </p>
                            )}
                            <div className="referral-banner__actions">
                                <button
                                    type="button"
                                    className="referral-banner__button"
                                    onClick={handleCopyLink}
                                    disabled={!referralLink}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {copied ? <FaCheck /> : <FaCopy />}
                                    {copied
                                        ? t('referral.copied') || 'Copied'
                                        : t('referral.copyLink') || t('referral.getReferralLink') || 'Copy Referral Link'}
                                </button>
                                <button
                                    type="button"
                                    className="referral-banner__rules"
                                    onClick={() => setShowRulesModal(true)}
                                >
                                    {t('referral.referralRules') || 'Referral rules'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4 Stat Cards */}
                <div className="referral-stats">
                    {statCards.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <motion.div
                                key={card.key}
                                className="referral-stats__card"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * idx }}
                            >
                                <div className="referral-stats__card-header">
                                    <span className="referral-stats__label">{card.label}</span>
                                    <span className="referral-stats__icon">
                                        <Icon />
                                    </span>
                                </div>
                                <div className="referral-stats__value">{card.value}</div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Referred Users Table */}
                <motion.div
                    className="refer-users-section"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <h3 className="refer-users-section__title">
                        {t('referral.referUsers') || 'Referred Users'}
                    </h3>

                    {isError ? (
                        <div className="refer-users-state">
                            <FaExclamationTriangle className="refer-users-state__icon" />
                            <h4 className="refer-users-state__title">
                                {t('referral.errorTitle') || 'Error loading referral data'}
                            </h4>
                            <p className="refer-users-state__desc">
                                {t('referral.errorMessage') || 'Unable to load referral data. Please try again later.'}
                            </p>
                            <button
                                type="button"
                                className="refer-users-state__retry"
                                onClick={() => refetch()}
                            >
                                {t('referral.retry') || 'Retry'}
                            </button>
                        </div>
                    ) : isFetching && referrals.length === 0 ? (
                        <div className="refer-users-section__skeleton">
                            {[0, 1, 2, 3].map((row) => (
                                <div key={row} className="skeleton-row">
                                    <div className="skeleton-cell" />
                                    <div className="skeleton-cell" />
                                    <div className="skeleton-cell" />
                                    <div className="skeleton-cell" />
                                </div>
                            ))}
                        </div>
                    ) : referrals.length === 0 ? (
                        <div className="refer-users-state">
                            <FaUsers className="refer-users-state__icon" />
                            <h4 className="refer-users-state__title">
                                {t('referral.noReferUsers') || 'No referred users'}
                            </h4>
                            <p className="refer-users-state__desc">
                                {t('referral.noReferUsersMessage') || 'No users have been referred yet'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="refer-users-table-wrap">
                                <table className="refer-users-table__table">
                                    <thead>
                                        <tr>
                                            <th>{t('referral.user') || 'User'}</th>
                                            <th>{t('referral.status') || 'Status'}</th>
                                            <th>{t('referral.role') || 'Account Type'}</th>
                                            <th>{t('referral.joinedDate') || 'Joined Date'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {referrals.map((item) => (
                                            <tr key={item._id}>
                                                <td>{item.username || '-'}</td>
                                                <td>
                                                    <span
                                                        className={`referral-badge ${
                                                            item.isConfirmed
                                                                ? 'referral-badge--confirmed'
                                                                : 'referral-badge--unconfirmed'
                                                        }`}
                                                    >
                                                        {item.isConfirmed
                                                            ? t('referral.confirmed') || 'Confirmed'
                                                            : t('referral.unconfirmed') || 'Unconfirmed'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`referral-badge ${
                                                            item.isPromoter
                                                                ? 'referral-badge--promoter'
                                                                : 'referral-badge--standard'
                                                        }`}
                                                    >
                                                        {item.isPromoter
                                                            ? t('referral.promoter') || 'Promoter'
                                                            : t('referral.standard') || 'Standard'}
                                                    </span>
                                                </td>
                                                <td>{formatDate(item.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                currentPage={meta.page || page}
                                totalPages={meta.totalPages || 0}
                                onPageChange={setPage}
                                showCount
                                startIndex={startIndex}
                                endIndex={endIndex}
                                totalItems={meta.total || 0}
                                itemsLabel={t('referral.referUsers') || 'Referred Users'}
                            />
                        </>
                    )}
                </motion.div>

                {/* Referral Rules Modal */}
                <AnimatePresence>
                    {showRulesModal && (
                        <motion.div
                            className="referral-modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRulesModal(false)}
                        >
                            <motion.div
                                className="referral-modal"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="referral-modal__title">{t('referral.recommendedRules')}</h3>
                                <div className="referral-modal__content">
                                    <ol className="referral-modal__rules">
                                        <li>{t('referral.rule1')}</li>
                                        <li>{t('referral.rule2')}</li>
                                        <li>{t('referral.rule3')}</li>
                                        <li>{t('referral.rule4')}</li>
                                        <li>{t('referral.rule5')}</li>
                                    </ol>
                                </div>
                                <button
                                    type="button"
                                    className="referral-modal__close"
                                    onClick={() => setShowRulesModal(false)}
                                >
                                    {t('referral.ok')}
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
