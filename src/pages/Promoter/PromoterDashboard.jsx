import React, { useState, useMemo } from 'react';
import './PromoterDashboard.scss';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCookies } from 'react-cookie';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaTimes,
    FaMoneyBillWave,
    FaWallet,
    FaChartLine,
    FaDollarSign,
    FaClock,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { api } from '../../services/apiConfig';
import { withdrawalService, promoterService, paymentService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { ToastOptions } from '../../helpers/ToastOptions';
import EmptyState from '../../components/EmptyState/EmptyState';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

const modalVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 40 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 220, damping: 28 },
    },
    exit: { opacity: 0, scale: 0.85, y: 40, transition: { duration: 0.2 } },
};

function getApiError(error, fallback) {
    const msg = error?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join('\n');
    return msg || error?.message || fallback;
}

export default function PromoterDashboard() {
    const [cookies] = useCookies(['MegaBox']);
    const token = cookies.MegaBox;
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [fieldValues, setFieldValues] = useState({});
    const [sharesPage, setSharesPage] = useState(1);

    // Enrollment form state (shown if user is not yet enrolled as promoter)
    const [enrollPlan, setEnrollPlan] = useState('views');
    const [agreedPolicy, setAgreedPolicy] = useState(false);

    // GET /api/users/profile
    const { data: userData } = useQuery(
        ['userAccount'],
        async () => {
            const res = await api.get('/users/profile');
            return res.data?.data;
        },
        { enabled: !!token, retry: false },
    );

    const isPromoter = userData?.isPromoter === true;
    const promoterPlan = userData?.promoterPlan;

    // GET /api/earnings
    const { data: earningsResponse, isLoading: earningsLoading } = useQuery(
        ['userEarnings'],
        () => promoterService.getEarnings(),
        { enabled: !!token, retry: 1 },
    );

    // GET /api/promoter/stats
    const {
        data: statsData,
        isLoading: statsLoading,
        error: statsError,
    } = useQuery(['promoterStats'], () => promoterService.getPromoterStats(), {
        enabled: !!token && isPromoter,
        retry: 1,
    });

    // GET /api/promoter/shares
    const { data: sharesData, isLoading: sharesLoading } = useQuery(
        ['promoterShares', sharesPage],
        () => promoterService.getPromoterShares({ page: sharesPage, limit: 20 }),
        { enabled: !!token && isPromoter, retry: 1, keepPreviousData: true },
    );

    // GET /api/payment-methods
    const { data: paymentMethods = [] } = useQuery(
        ['paymentMethods', language],
        () => paymentService.getPaymentMethods(language),
        { enabled: !!token, retry: 1 },
    );

    // GET /api/promoter/privacy-policy (only needed when not yet enrolled)
    const { data: policyData } = useQuery(
        ['promoterPrivacyPolicy', language],
        () => promoterService.getPromoterPrivacyPolicy(language),
        { enabled: !!token && userData !== undefined && !isPromoter, retry: false },
    );

    const selectedMethod = useMemo(
        () => paymentMethods.find((m) => m._id === selectedMethodId) || null,
        [paymentMethods, selectedMethodId],
    );

    const currency = 'USD';
    const earnings = earningsResponse?.earnings || {};
    const stats = statsData?.statistics || {};
    const availableBalance = Number(earnings.availableBalance ?? 0);
    const totalRevenue = Number(stats.totalRevenue ?? earnings.totalEarnings ?? 0);
    const suspendedBalance = Number(stats.suspendedBalance ?? earnings.pendingRewards ?? 0);
    const todayRevenue = Number(stats.todayRevenue ?? 0);
    const dailyGraph = Array.isArray(statsData?.graph) ? [...statsData.graph].reverse() : [];
    const promoterShares = Array.isArray(sharesData?.data) ? sharesData.data : [];
    const sharesTotal = Number(sharesData?.total ?? 0);
    const sharesTotalPages = Math.max(1, Math.ceil(sharesTotal / 20));

    // POST /api/earnings/withdrawals
    const requestWithdrawalMutation = useMutation(
        (payload) => withdrawalService.requestWithdrawal(payload),
        {
            onSuccess: (res) => {
                queryClient.invalidateQueries(['userWithdrawals']);
                queryClient.invalidateQueries(['userEarnings']);
                queryClient.invalidateQueries(['promoterStats']);
                setShowWithdrawalModal(false);
                setWithdrawalAmount('');
                setSelectedMethodId('');
                setFieldValues({});
                toast.success(
                    res?.message || t('promoterDashboard.withdrawalRequested'),
                    ToastOptions('success'),
                );
            },
            onError: (error) => {
                toast.error(
                    getApiError(error, t('promoterDashboard.withdrawalError') || 'Failed to request withdrawal'),
                    ToastOptions('error'),
                );
            },
        },
    );

    // POST /api/promoter/enroll
    const enrollMutation = useMutation(
        (payload) => promoterService.enrollPromoter(payload),
        {
            onSuccess: (res) => {
                queryClient.invalidateQueries(['userAccount']);
                queryClient.invalidateQueries(['promoterStats']);
                queryClient.invalidateQueries(['promoterShares']);
                toast.success(res?.message || t('payouts.enrollSuccess'), ToastOptions('success'));
            },
            onError: (error) => {
                toast.error(getApiError(error, 'Enrollment failed'), ToastOptions('error'));
            },
        },
    );

    const handleWithdrawalSubmit = (e) => {
        e.preventDefault();
        const num = Number(withdrawalAmount);
        if (Number.isNaN(num) || num < 1) {
            toast.error(t('payouts.amountMinimumOne') || 'Minimum withdrawal amount is 1 USD', ToastOptions('error'));
            return;
        }
        if (num > availableBalance) {
            toast.error(t('payouts.amountExceeds') || 'Amount exceeds available balance', ToastOptions('error'));
            return;
        }
        if (!selectedMethod) {
            toast.error(t('withdrawSection.paymentMethodRequired') || 'Payment method is required', ToastOptions('error'));
            return;
        }

        const paymentDetails = {};
        for (const field of selectedMethod.fields || []) {
            const label = (language === 'ar' ? field.label_ar : field.label_en) || field.label || field.key;
            const value = (fieldValues[field.key] || '').trim();
            if (!value) {
                if (field.required) {
                    toast.error(t('payouts.fieldRequired', { field: label }), ToastOptions('error'));
                    return;
                }
                continue;
            }
            if (field.type === 'email' && !EMAIL_REGEX.test(value)) {
                toast.error(t('payouts.fieldInvalidEmail', { field: label }), ToastOptions('error'));
                return;
            }
            if (field.type === 'phone') {
                const digits = value.replace(/\D/g, '').length;
                if (!PHONE_ALLOWED_REGEX.test(value) || digits < 6) {
                    toast.error(t('payouts.fieldInvalidPhone', { field: label }), ToastOptions('error'));
                    return;
                }
            }
            if (field.pattern) {
                try {
                    if (!new RegExp(field.pattern).test(value)) {
                        toast.error(t('payouts.fieldInvalidFormat', { field: label }), ToastOptions('error'));
                        return;
                    }
                } catch {
                    // server validates pattern
                }
            }
            paymentDetails[field.key] = value;
        }

        requestWithdrawalMutation.mutate({
            amount: num,
            paymentMethodId: selectedMethod._id,
            paymentDetails,
        });
    };

    const handleEnrollSubmit = (e) => {
        e.preventDefault();
        const version = policyData?.policy?.version ?? policyData?.version;
        if (!version || !agreedPolicy) return;
        enrollMutation.mutate({
            plan: enrollPlan,
            promoterPrivacyPolicyVersion: Number(version),
        });
    };

    return (
        <motion.div
            className="promoter-dashboard revenue-dashboard"
            style={{ fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <div className="revenue-dashboard__wrapper">
                {/* Header */}
                <motion.div
                    className="revenue-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="revenue-header__content">
                        <FaChartLine className="revenue-header__icon" />
                        <div>
                            <h1 className="revenue-header__title">
                                {t('promoterDashboard.title') || 'Revenue'}
                            </h1>
                            <p className="revenue-header__subtitle">
                                {t('promoterDashboard.subtitle') || 'Track your earnings and revenue'}
                                {userData?.promoterCode && (
                                    <>
                                        {' · '}
                                        <strong>
                                            {t('payouts.promoterCode') || 'Promoter Code'}: {userData.promoterCode}
                                        </strong>
                                    </>
                                )}
                                {promoterPlan && (
                                    <>
                                        {' · '}
                                        {promoterPlan === 'views'
                                            ? t('payouts.planViews') || 'Views Plan'
                                            : t('payouts.planInstalls') || 'Installs Plan'}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Enrollment Panel (if not yet enrolled) */}
                {userData && !isPromoter && (
                    <div className="revenue-table" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ marginTop: 0 }}>{t('payouts.enrollTitle') || 'Join the Promoter Program'}</h2>
                        <p style={{ color: '#4b5563' }}>{t('payouts.enrollSubtitle')}</p>
                        <form onSubmit={handleEnrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '420px' }}>
                            <select
                                value={enrollPlan}
                                onChange={(e) => setEnrollPlan(e.target.value)}
                                className="withdrawal-modal__input"
                            >
                                <option value="views">{t('payouts.planViews') || 'Views Plan'}</option>
                                <option value="installs">{t('payouts.planInstalls') || 'Installs Plan'}</option>
                            </select>
                            {(policyData?.policy?.version ?? policyData?.version) && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={agreedPolicy}
                                        onChange={(e) => setAgreedPolicy(e.target.checked)}
                                    />
                                    <span>
                                        {t('payouts.enrollPolicyAgree', {
                                            version: policyData?.policy?.version ?? policyData?.version,
                                        })}
                                    </span>
                                </label>
                            )}
                            <button
                                type="submit"
                                className="promoter-request-withdraw-btn"
                                disabled={!agreedPolicy || enrollMutation.isLoading}
                            >
                                {enrollMutation.isLoading ? t('payouts.enrolling') : t('payouts.enrollButton')}
                            </button>
                        </form>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="revenue-summary">
                    <motion.div
                        className="revenue-summary__card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <FaDollarSign className="revenue-summary__icon" />
                        <div className="revenue-summary__content">
                            <div className="revenue-summary__label">
                                {t('withdrawSection.totalEarnings') || 'Total Revenue'} / {currency}
                            </div>
                            <div className="revenue-summary__value">
                                {earningsLoading && statsLoading ? '-' : `${totalRevenue.toFixed(4)} ${currency}`}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="revenue-summary__card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <FaClock className="revenue-summary__icon" />
                        <div className="revenue-summary__content">
                            <div className="revenue-summary__label">
                                {t('payouts.todayRevenue') || "Today's Revenue"} / {currency}
                            </div>
                            <div className="revenue-summary__value">
                                {statsLoading ? '-' : `${todayRevenue.toFixed(4)} ${currency}`}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="revenue-summary__card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <FaDollarSign className="revenue-summary__icon" />
                        <div className="revenue-summary__content">
                            <div className="revenue-summary__label">
                                {t('payouts.suspendedBalance') || 'Pending Settlement'} / {currency}
                            </div>
                            <div className="revenue-summary__value">
                                {statsLoading ? '-' : `${suspendedBalance.toFixed(4)} ${currency}`}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="revenue-summary__card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <FaWallet className="revenue-summary__icon" />
                        <div className="revenue-summary__content">
                            <div className="revenue-summary__label">
                                {t('revenueData.withdrawable') || 'Available Balance'} / {currency}
                            </div>
                            <div className="revenue-summary__value">
                                {earningsLoading ? '-' : `${availableBalance.toFixed(4)} ${currency}`}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Withdrawal Action */}
                {!earningsLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="promoter-withdrawal-actions"
                    >
                        <motion.button
                            type="button"
                            onClick={() => setShowWithdrawalModal(true)}
                            className="promoter-request-withdraw-btn"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FaMoneyBillWave />
                            {t('promoterDashboard.requestWithdrawal') || 'Request Withdrawal'}
                        </motion.button>
                    </motion.div>
                )}

                {/* Daily Revenue Graph Table (GET /api/promoter/stats) */}
                {statsLoading ? (
                    <div className="revenue-table">
                        <div className="revenue-table__skeleton">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="skeleton-row">
                                    <div className="skeleton-cell" />
                                    <div className="skeleton-cell" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : statsError ? (
                    <EmptyState
                        icon={FaChartLine}
                        title={t('revenueData.errorTitle') || 'Error loading revenue data'}
                        message={getApiError(statsError, t('revenueData.errorMessage') || 'Failed to load revenue data')}
                    />
                ) : (
                    <motion.div
                        className="revenue-table"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="revenue-table__container">
                            <h3 style={{ padding: '1rem 1.25rem 0', margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                                {t('payouts.dailyRevenueTitle') || 'Daily Promoter Revenue'}
                            </h3>
                            <table className="revenue-table__table">
                                <thead>
                                    <tr>
                                        <th>{t('revenueData.date') || 'Date (UTC)'}</th>
                                        <th>
                                            {t('payouts.revenue') || 'Revenue'} / {currency}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyGraph.length > 0 ? (
                                        dailyGraph.map((item) => (
                                            <tr key={item.date} className="revenue-table__row">
                                                <td>{item.date}</td>
                                                <td>
                                                    {Number(item.revenue ?? 0).toFixed(4)} {currency}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                                {t('payouts.noDailyData') || 'No revenue recorded in this date range'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* Promoter Shares Table (GET /api/promoter/shares) */}
                {isPromoter && (
                    <motion.div
                        className="revenue-table"
                        style={{ marginTop: '1.5rem' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <div className="revenue-table__container">
                            <h3 style={{ padding: '1rem 1.25rem 0', margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                                {t('payouts.promoterSharesTitle') || 'Promoter Share Performance'}
                            </h3>
                            <table className="revenue-table__table">
                                <thead>
                                    <tr>
                                        <th>{t('payouts.shareLink') || 'Share Link'}</th>
                                        <th>
                                            {promoterPlan === 'views'
                                                ? t('payouts.views') || 'Views'
                                                : t('payouts.installs') || 'Installs'}
                                        </th>
                                        <th>
                                            {t('payouts.revenue') || 'Revenue'} / {currency}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sharesLoading ? (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                                {t('revenueData.loading') || 'Loading...'}
                                            </td>
                                        </tr>
                                    ) : promoterShares.length > 0 ? (
                                        promoterShares.map((item, idx) => (
                                            <tr key={`${item.shareLink || 'share'}-${idx}`} className="revenue-table__row">
                                                <td>
                                                    {item.shareLink ? (
                                                        <a
                                                            href={item.shareLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#4f46e5', textDecoration: 'underline' }}
                                                        >
                                                            {item.shareLink}
                                                        </a>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {promoterPlan === 'views'
                                                        ? Number(item.views ?? 0).toLocaleString()
                                                        : Number(item.installs ?? 0).toLocaleString()}
                                                </td>
                                                <td>
                                                    {Number(item.revenue ?? 0).toFixed(4)} {currency}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                                {t('payouts.noShares') || 'No active shares yet'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {(sharesTotalPages > 1 || sharesPage > 1) && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem 1.25rem',
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="withdrawal-modal__cancel"
                                        disabled={sharesPage <= 1}
                                        onClick={() => setSharesPage((p) => Math.max(1, p - 1))}
                                    >
                                        {t('payouts.prev') || 'Previous'}
                                    </button>
                                    <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                                        {t('payouts.pageOf', { page: sharesPage, totalPages: sharesTotalPages })}
                                    </span>
                                    <button
                                        type="button"
                                        className="withdrawal-modal__cancel"
                                        disabled={sharesPage >= sharesTotalPages}
                                        onClick={() => setSharesPage((p) => Math.min(sharesTotalPages, p + 1))}
                                    >
                                        {t('payouts.next') || 'Next'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Withdrawal Modal (POST /api/earnings/withdrawals + GET /api/payment-methods) */}
            <AnimatePresence>
                {showWithdrawalModal && (
                    <motion.div
                        className="withdrawal-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowWithdrawalModal(false)}
                    >
                        <motion.div
                            className="withdrawal-modal"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="withdrawal-modal__header">
                                <div className="withdrawal-modal__title-wrapper">
                                    <FaWallet className="withdrawal-modal__icon" />
                                    <h3 className="withdrawal-modal__title">
                                        {t('promoterDashboard.requestWithdrawal')}
                                    </h3>
                                </div>
                                <motion.button
                                    type="button"
                                    onClick={() => setShowWithdrawalModal(false)}
                                    className="withdrawal-modal__close"
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes />
                                </motion.button>
                            </div>
                            <form onSubmit={handleWithdrawalSubmit} className="withdrawal-modal__form">
                                <div className="withdrawal-modal__field">
                                    <label className="withdrawal-modal__label">
                                        {t('promoterDashboard.amount')} ({currency})
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        max={availableBalance}
                                        value={withdrawalAmount}
                                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                                        className="withdrawal-modal__input"
                                        placeholder={t('promoterDashboard.enterAmount')}
                                        required
                                    />
                                    <p className="withdrawal-modal__hint">
                                        {t('promoterDashboard.available')}:{' '}
                                        <span className="withdrawal-modal__available">
                                            {availableBalance.toFixed(4)} {currency}
                                        </span>
                                    </p>
                                </div>

                                <div className="withdrawal-modal__field">
                                    <label className="withdrawal-modal__label">
                                        {t('promoterDashboard.paymentMethod')}
                                    </label>
                                    <select
                                        value={selectedMethodId}
                                        onChange={(e) => {
                                            setSelectedMethodId(e.target.value);
                                            setFieldValues({});
                                        }}
                                        className="withdrawal-modal__input"
                                        required
                                    >
                                        <option value="">
                                            {t('withdrawSection.paymentMethodPlaceholder') || 'Select payment method'}
                                        </option>
                                        {paymentMethods.map((method) => (
                                            <option key={method._id} value={method._id}>
                                                {(language === 'ar' ? method.name_ar : method.name_en) || method.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedMethod &&
                                    (selectedMethod.fields || []).map((field) => {
                                        const label =
                                            (language === 'ar' ? field.label_ar : field.label_en) ||
                                            field.label ||
                                            field.key;
                                        const inputType =
                                            field.type === 'email'
                                                ? 'email'
                                                : field.type === 'phone'
                                                  ? 'tel'
                                                  : 'text';
                                        return (
                                            <div key={field.key} className="withdrawal-modal__field">
                                                <label className="withdrawal-modal__label">
                                                    {field.required ? '* ' : ''}
                                                    {label}
                                                </label>
                                                <input
                                                    type={inputType}
                                                    value={fieldValues[field.key] || ''}
                                                    onChange={(e) =>
                                                        setFieldValues((prev) => ({
                                                            ...prev,
                                                            [field.key]: e.target.value,
                                                        }))
                                                    }
                                                    className="withdrawal-modal__input"
                                                    placeholder={label}
                                                    maxLength={300}
                                                    required={field.required}
                                                />
                                            </div>
                                        );
                                    })}

                                <div className="withdrawal-modal__actions">
                                    <motion.button
                                        type="button"
                                        onClick={() => setShowWithdrawalModal(false)}
                                        className="withdrawal-modal__cancel"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {t('promoterDashboard.cancel')}
                                    </motion.button>
                                    <motion.button
                                        type="submit"
                                        disabled={requestWithdrawalMutation.isLoading || paymentMethods.length === 0}
                                        className="withdrawal-modal__submit"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {requestWithdrawalMutation.isLoading
                                            ? t('promoterDashboard.submitting')
                                            : t('promoterDashboard.submitRequest')}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
