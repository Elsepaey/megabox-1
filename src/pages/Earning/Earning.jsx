import React, { useState, useMemo } from 'react';
import './Earning.scss';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCookies } from 'react-cookie';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FaDollarSign, FaTimes } from 'react-icons/fa';
import { HiArrowRight, HiArrowLeft, HiChevronDown } from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { promoterService, paymentService, withdrawalService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { ToastOptions } from '../../helpers/ToastOptions';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 80,
            damping: 20,
            mass: 1,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
};

function getApiError(error, fallback) {
    const msg = error?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join('\n');
    return msg || error?.message || fallback;
}

function getMethodDisplayName(method, language) {
    if (!method) return '';
    return (language === 'ar' ? method.name_ar : method.name_en) || method.name || method.name_en || '';
}

function getFieldLabel(field, language) {
    return (language === 'ar' ? field.label_ar : field.label_en) || field.label || field.key;
}

function formatWithdrawalMethod(withdrawal, language) {
    const info = withdrawal?.paymentMethodInfo;
    if (info && typeof info === 'object') {
        return (language === 'ar' ? info.name_ar : info.name_en) || info.name_en || withdrawal?.paymentMethod || '-';
    }
    return withdrawal?.paymentMethod || '-';
}

function formatWithdrawalDetails(withdrawal, language) {
    const map = withdrawal?.paymentDetailsMap;
    if (map && typeof map === 'object' && !Array.isArray(map)) {
        const labels = new Map(
            (withdrawal?.paymentMethodInfo?.fields || []).map((f) => [
                f.key,
                (language === 'ar' ? f.label_ar : f.label_en) || f.key,
            ]),
        );
        const parts = Object.entries(map)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${labels.get(k) || k}: ${v}`);
        if (parts.length > 0) return parts.join(' · ');
    }
    return withdrawal?.paymentDetails || '-';
}

export default function Earning() {
    const [cookies] = useCookies(['MegaBox']);
    const token = cookies.MegaBox;
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [fieldValues, setFieldValues] = useState({});
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
    const [viewMode, setViewMode] = useState('all');
    const [historyPage, setHistoryPage] = useState(1);

    // GET /api/earnings
    const { data: earningsResponse, isLoading: earningsLoading } = useQuery(
        ['userEarnings'],
        () => promoterService.getEarnings(),
        { enabled: !!token, retry: 1 },
    );

    const earnings = earningsResponse?.earnings || {};
    const currency = 'USD';
    const confirmedRewards = Number(earnings.confirmedRewards ?? 0);
    const pendingRewards = Number(earnings.pendingRewards ?? 0);
    const totalEarnings = Number(earnings.totalEarnings ?? 0);
    const availableBalance = Number(earnings.availableBalance ?? 0);

    // GET /api/payment-methods
    const { data: paymentMethods = [] } = useQuery(
        ['paymentMethods', language],
        () => paymentService.getPaymentMethods(language),
        { enabled: !!token, retry: 1 },
    );

    const selectedMethod = useMemo(
        () => paymentMethods.find((m) => m._id === selectedMethodId) || null,
        [paymentMethods, selectedMethodId],
    );

    // GET /api/earnings/withdrawals
    const statusFilter = viewMode === 'all' ? undefined : viewMode;
    const { data: withdrawalHistoryData, isLoading: isLoadingWithdrawals } = useQuery(
        ['userWithdrawals', historyPage, viewMode],
        () =>
            withdrawalService.getWithdrawalHistory({
                page: historyPage,
                limit: 20,
                status: statusFilter,
            }),
        { enabled: !!token && showRecordModal, retry: false, keepPreviousData: true },
    );

    const historyMeta = withdrawalHistoryData?.meta || null;
    const displayWithdrawals = Array.isArray(withdrawalHistoryData?.data)
        ? withdrawalHistoryData.data
        : [];
    // POST /api/earnings/withdrawals
    const requestWithdrawalMutation = useMutation(
        (payload) => withdrawalService.requestWithdrawal(payload),
        {
            onSuccess: (res) => {
                queryClient.invalidateQueries(['userWithdrawals']);
                queryClient.invalidateQueries(['userEarnings']);
                queryClient.invalidateQueries(['promoterStats']);
                setWithdrawalAmount('');
                setSelectedMethodId('');
                setFieldValues({});
                setErrors({});
                setTouched({});
                toast.success(
                    res?.message || t('withdrawSection.withdrawalRequested') || 'Withdrawal request submitted successfully!',
                    ToastOptions('success'),
                );
            },
            onError: (error) => {
                toast.error(
                    getApiError(error, t('withdrawSection.withdrawalError') || 'Failed to request withdrawal'),
                    ToastOptions('error'),
                );
            },
        },
    );

    const validateAmount = (value) => {
        if (!value || !String(value).trim()) {
            return t('withdrawSection.amountRequired') || 'Withdrawal amount is required';
        }
        const num = Number(value);
        if (Number.isNaN(num) || num <= 0) {
            return t('withdrawSection.amountInvalid') || 'Please enter a valid amount';
        }
        if (num < 1) {
            return t('payouts.amountMinimumOne') || 'Minimum withdrawal amount is 1 USD';
        }
        if (num > availableBalance) {
            return t('payouts.amountExceeds') || 'Amount exceeds available balance';
        }
        return '';
    };

    const validateDynamicField = (field, rawVal) => {
        const label = getFieldLabel(field, language);
        const value = (rawVal || '').trim();
        if (!value) {
            if (field.required) {
                return t('payouts.fieldRequired', { field: label }) || `${label} is required`;
            }
            return '';
        }
        if (field.type === 'email' && !EMAIL_REGEX.test(value)) {
            return t('payouts.fieldInvalidEmail', { field: label }) || `${label} must be a valid email address`;
        }
        if (field.type === 'phone') {
            const digits = value.replace(/\D/g, '').length;
            if (!PHONE_ALLOWED_REGEX.test(value) || digits < 6) {
                return t('payouts.fieldInvalidPhone', { field: label }) || `${label} must be a valid phone number`;
            }
        }
        if (field.pattern) {
            try {
                if (!new RegExp(field.pattern).test(value)) {
                    return t('payouts.fieldInvalidFormat', { field: label }) || `${label} is invalid`;
                }
            } catch {
                // Backend will validate pattern if malformed
            }
        }
        return '';
    };

    const handleSelectMethod = (method) => {
        setSelectedMethodId(method._id);
        setFieldValues({});
        setShowPaymentDropdown(false);
        setErrors((prev) => ({ withdrawalAmount: prev.withdrawalAmount || '', paymentMethod: '' }));
        setTouched((prev) => ({ withdrawalAmount: prev.withdrawalAmount || false, paymentMethod: true }));
    };

    const handleFieldChange = (field, value) => {
        setFieldValues((prev) => ({ ...prev, [field.key]: value }));
        const fieldErrKey = `field:${field.key}`;
        if (touched[fieldErrKey]) {
            setErrors((prev) => ({ ...prev, [fieldErrKey]: validateDynamicField(field, value) }));
        }
    };

    const handleFieldBlur = (field) => {
        const fieldErrKey = `field:${field.key}`;
        setTouched((prev) => ({ ...prev, [fieldErrKey]: true }));
        setErrors((prev) => ({ ...prev, [fieldErrKey]: validateDynamicField(field, fieldValues[field.key]) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const nextErrors = {};
        const nextTouched = { withdrawalAmount: true, paymentMethod: true };

        nextErrors.withdrawalAmount = validateAmount(withdrawalAmount);
        if (!selectedMethod) {
            nextErrors.paymentMethod = t('withdrawSection.paymentMethodRequired') || 'Payment method is required';
        }

        const paymentDetails = {};
        if (selectedMethod) {
            (selectedMethod.fields || []).forEach((field) => {
                const fieldErrKey = `field:${field.key}`;
                nextTouched[fieldErrKey] = true;
                const val = fieldValues[field.key] || '';
                const err = validateDynamicField(field, val);
                if (err) {
                    nextErrors[fieldErrKey] = err;
                } else if (val.trim()) {
                    paymentDetails[field.key] = val.trim();
                }
            });
        }

        setTouched(nextTouched);
        setErrors(nextErrors);

        const hasError = Object.values(nextErrors).some(Boolean);
        if (hasError || !selectedMethod) return;

        requestWithdrawalMutation.mutate({
            amount: Number(withdrawalAmount),
            paymentMethodId: selectedMethod._id,
            paymentDetails,
        });
    };

    return (
        <motion.div
            className="earning-container min-h-screen bg-indigo-50"
            style={{ fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <div className="earning-container__wrapper">
                {/* Summary Cards */}
                <motion.div
                    className="withdraw-summary-cards"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <motion.div
                        className="withdraw-summary-card withdraw-summary-card--amount"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="withdraw-summary-card__icon withdraw-summary-card__icon--amount">
                            <FaDollarSign />
                        </div>
                        <div className="withdraw-summary-card__content">
                            <div className="withdraw-summary-card__label">
                                {t('withdrawSection.confirmedRewards') || 'Confirmed Rewards'}
                            </div>
                            <div className="withdraw-summary-card__value">
                                {earningsLoading ? '-' : `${confirmedRewards.toFixed(6)} ${currency}`}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="withdraw-summary-card withdraw-summary-card--review"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="withdraw-summary-card__icon withdraw-summary-card__icon--review">
                            <FaDollarSign />
                        </div>
                        <div className="withdraw-summary-card__content">
                            <div className="withdraw-summary-card__label">
                                {t('withdrawSection.pendingRewards') || 'Pending Rewards'}
                            </div>
                            <div className="withdraw-summary-card__value">
                                {earningsLoading ? '-' : `${pendingRewards.toFixed(6)} ${currency}`}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="withdraw-summary-card withdraw-summary-card--withdrawn"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="withdraw-summary-card__icon withdraw-summary-card__icon--withdrawn">
                            <FaDollarSign />
                        </div>
                        <div className="withdraw-summary-card__content">
                            <div className="withdraw-summary-card__label">
                                {t('withdrawSection.totalEarnings') || 'Total Earnings'}
                            </div>
                            <div className="withdraw-summary-card__value">
                                {earningsLoading ? '-' : `${totalEarnings.toFixed(6)} ${currency}`}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="withdraw-summary-card withdraw-summary-card--withdrawable"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="withdraw-summary-card__icon withdraw-summary-card__icon--withdrawable">
                            <FaDollarSign />
                        </div>
                        <div className="withdraw-summary-card__content">
                            <div className="withdraw-summary-card__label">
                                {t('withdrawSection.withdrawable') || 'Available Balance'}
                            </div>
                            <div className="withdraw-summary-card__value">
                                {earningsLoading ? '-' : `${availableBalance.toFixed(6)} ${currency}`}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Withdrawal Request Form */}
                <motion.div
                    className="withdraw-apply-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="withdraw-apply-section__header">
                        <h2 className="withdraw-apply-section__title">
                            {t('withdrawSection.apply') || 'Request Withdrawal'}
                        </h2>
                        <button
                            type="button"
                            onClick={() => {
                                setHistoryPage(1);
                                setShowRecordModal(true);
                            }}
                            className="withdraw-apply-section__link"
                        >
                            {t('withdrawSection.record') || 'Record'}{' '}
                            {language === 'ar' ? <HiArrowLeft /> : <HiArrowRight />}
                        </button>
                    </div>

                    <form className="withdraw-apply-form" onSubmit={handleSubmit} noValidate>
                        <div className="withdraw-form-group">
                            <label className="withdraw-form-label">
                                * {t('withdrawSection.withdrawalAmount') || 'Withdrawal amount'} ({currency})
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="1"
                                className={`withdraw-form-input ${touched.withdrawalAmount && errors.withdrawalAmount ? 'withdraw-form-input--error' : ''}`}
                                placeholder={t('withdrawSection.withdrawalAmountPlaceholder') || 'Enter withdrawal amount'}
                                value={withdrawalAmount}
                                onChange={(e) => {
                                    setWithdrawalAmount(e.target.value);
                                    if (touched.withdrawalAmount) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            withdrawalAmount: validateAmount(e.target.value),
                                        }));
                                    }
                                }}
                                onBlur={() => {
                                    setTouched((prev) => ({ ...prev, withdrawalAmount: true }));
                                    setErrors((prev) => ({
                                        ...prev,
                                        withdrawalAmount: validateAmount(withdrawalAmount),
                                    }));
                                }}
                            />
                            {touched.withdrawalAmount && errors.withdrawalAmount && (
                                <span className="withdraw-form-error">{errors.withdrawalAmount}</span>
                            )}
                        </div>

                        <div className="withdraw-form-group">
                            <label className="withdraw-form-label">
                                * {t('withdrawSection.paymentMethod') || 'Payment method'}
                            </label>
                            <div className="withdraw-form-input-wrapper withdraw-payment-dropdown-wrapper">
                                <div
                                    className={`withdraw-form-input withdraw-payment-dropdown ${touched.paymentMethod && errors.paymentMethod ? 'withdraw-form-input--error' : ''} ${showPaymentDropdown ? 'withdraw-payment-dropdown--open' : ''}`}
                                    onClick={() => setShowPaymentDropdown((v) => !v)}
                                    onBlur={() => {
                                        setTimeout(() => setShowPaymentDropdown(false), 200);
                                    }}
                                    tabIndex={0}
                                >
                                    <span className="withdraw-payment-dropdown__selected">
                                        {selectedMethod
                                            ? `${getMethodDisplayName(selectedMethod, language)} (${t(`payouts.methodTypes.${selectedMethod.type}`) || selectedMethod.type})`
                                            : t('withdrawSection.paymentMethodPlaceholder') || 'Please select a payment method'}
                                    </span>
                                    <HiChevronDown
                                        className={`withdraw-form-select-arrow ${showPaymentDropdown ? 'withdraw-form-select-arrow--open' : ''}`}
                                    />
                                </div>
                                {showPaymentDropdown && (
                                    <div className="withdraw-payment-dropdown__menu">
                                        {paymentMethods.length > 0 ? (
                                            paymentMethods.map((method) => {
                                                const isSelected = selectedMethodId === method._id;
                                                return (
                                                    <div
                                                        key={method._id}
                                                        className={`withdraw-payment-dropdown__option ${isSelected ? 'withdraw-payment-dropdown__option--selected' : ''}`}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleSelectMethod(method);
                                                        }}
                                                    >
                                                        <div className="withdraw-payment-dropdown__option-header">
                                                            <span className="withdraw-payment-dropdown__option-name">
                                                                {getMethodDisplayName(method, language)}
                                                            </span>
                                                        </div>
                                                        <div className="withdraw-payment-dropdown__option-details">
                                                            <span className="withdraw-payment-dropdown__option-detail">
                                                                {t('withdrawSection.type') || 'Type'}:{' '}
                                                                <strong>
                                                                    {t(`payouts.methodTypes.${method.type}`) || method.type}
                                                                </strong>
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="withdraw-payment-dropdown__empty">
                                                <p style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                                                    {t('payouts.noPaymentMethods') || 'No payment methods are currently available.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {touched.paymentMethod && errors.paymentMethod && (
                                <span className="withdraw-form-error">{errors.paymentMethod}</span>
                            )}
                        </div>

                        {/* Dynamic Payment Method Fields */}
                        {selectedMethod ? (
                            (selectedMethod.fields || []).map((field) => {
                                const fieldErrKey = `field:${field.key}`;
                                const label = getFieldLabel(field, language);
                                const inputType =
                                    field.type === 'email'
                                        ? 'email'
                                        : field.type === 'phone'
                                          ? 'tel'
                                          : 'text';
                                return (
                                    <div key={field.key} className="withdraw-form-group">
                                        <label className="withdraw-form-label">
                                            {field.required ? '* ' : ''}
                                            {label}
                                        </label>
                                        <input
                                            type={inputType}
                                            className={`withdraw-form-input ${touched[fieldErrKey] && errors[fieldErrKey] ? 'withdraw-form-input--error' : ''}`}
                                            placeholder={label}
                                            value={fieldValues[field.key] || ''}
                                            maxLength={300}
                                            onChange={(e) => handleFieldChange(field, e.target.value)}
                                            onBlur={() => handleFieldBlur(field)}
                                            required={field.required}
                                        />
                                        {touched[fieldErrKey] && errors[fieldErrKey] && (
                                            <span className="withdraw-form-error">{errors[fieldErrKey]}</span>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                                {t('payouts.selectMethodFirst') || 'Select a payment method to enter payout details.'}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="withdraw-submit-button"
                            disabled={requestWithdrawalMutation.isLoading || paymentMethods.length === 0}
                        >
                            {requestWithdrawalMutation.isLoading
                                ? t('withdrawSection.submitting') || 'Submitting...'
                                : t('withdrawSection.withdraw') || 'Withdraw'}
                        </button>
                    </form>

                    <div className="withdraw-notice">
                        <div className="withdraw-notice__title">{t('withdrawSection.notice') || 'Notice:'}</div>
                        <div className="withdraw-notice__text">
                            {t('payouts.amountMinimumOne') || 'Minimum withdrawal amount is 1 USD'}
                        </div>
                    </div>
                </motion.div>

                {/* Withdrawal Record Modal */}
                <AnimatePresence>
                    {showRecordModal && (
                        <motion.div
                            className="withdraw-record-modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRecordModal(false)}
                        >
                            <motion.div
                                className="withdraw-record-modal"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="withdraw-record-modal__header">
                                    <h3 className="withdraw-record-modal__title">
                                        {t('withdrawSection.record') || 'Withdrawal Record'}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowRecordModal(false)}
                                        className="withdraw-record-modal__close"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className="withdraw-record-modal__content">
                                    <div className="withdraw-filters">
                                        {[
                                            { key: 'all', title: t('withdrawSection.allWithdrawals') || 'All', desc: t('withdrawSection.allWithdrawalsDesc') || 'All requests' },
                                            { key: 'pending', title: t('withdrawSection.pending') || 'Pending', desc: t('withdrawSection.pendingDesc') || 'Pending requests' },
                                            { key: 'approved', title: t('withdrawSection.approvedOnly') || 'Approved', desc: t('withdrawSection.approvedOnlyDesc') || 'Approved requests' },
                                            { key: 'completed', title: t('payouts.completed') || 'Completed', desc: t('payouts.completedDesc') || 'Completed payouts' },
                                            { key: 'rejected', title: t('withdrawSection.rejected') || 'Rejected', desc: t('withdrawSection.rejectedDesc') || 'Rejected requests' },
                                        ].map((tab) => (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => {
                                                    setViewMode(tab.key);
                                                    setHistoryPage(1);
                                                }}
                                                className={`withdraw-filter-btn ${viewMode === tab.key ? 'active' : ''}`}
                                            >
                                                <span className="filter-title">{tab.title}</span>
                                                <span className="filter-desc">{tab.desc}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {isLoadingWithdrawals ? (
                                        <div className="withdraw-record-modal__loading">
                                            <div className="withdraw-record-modal__spinner" />
                                            <p>{t('withdrawSection.loadingHistory') || 'Loading withdrawal history...'}</p>
                                        </div>
                                    ) : displayWithdrawals.length > 0 ? (
                                        <div className="withdraw-table-container">
                                            <table className="withdraw-table">
                                                <thead>
                                                    <tr>
                                                        <th>{t('withdrawSection.tableDate') || 'Date'}</th>
                                                        <th>{t('withdrawSection.tableAmount') || 'Amount'}</th>
                                                        <th>{t('withdrawSection.tableMethod') || 'Payment Method'}</th>
                                                        <th>{t('payouts.details') || 'Details'}</th>
                                                        <th>{t('withdrawSection.tableStatus') || 'Status'}</th>
                                                        <th>{t('withdrawSection.tableReason') || 'Reason'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {displayWithdrawals.map((withdrawal, index) => (
                                                        <tr key={withdrawal?._id || index}>
                                                            <td className="withdraw-date">
                                                                {withdrawal?.createdAt
                                                                    ? new Date(withdrawal.createdAt).toLocaleDateString()
                                                                    : '-'}
                                                            </td>
                                                            <td className="withdraw-amount">
                                                                {withdrawal?.amount ?? '-'} {currency}
                                                            </td>
                                                            <td className="withdraw-payment-method">
                                                                {formatWithdrawalMethod(withdrawal, language)}
                                                            </td>
                                                            <td>{formatWithdrawalDetails(withdrawal, language)}</td>
                                                            <td>
                                                                <span
                                                                    className={`withdraw-status withdraw-status--${(withdrawal?.status || 'pending').toLowerCase()}`}
                                                                >
                                                                    {withdrawal?.status || 'pending'}
                                                                </span>
                                                            </td>
                                                            <td className="withdraw-reason">
                                                                {withdrawal?.status === 'rejected' && withdrawal?.rejectionReason ? (
                                                                    <span className="withdraw-reason__text" title={withdrawal.rejectionReason}>
                                                                        {withdrawal.rejectionReason}
                                                                    </span>
                                                                ) : (
                                                                    <span className="withdraw-reason__empty">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="withdraw-table-empty">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p>{t('withdrawSection.noWithdrawalHistory') || 'No withdrawal history found'}</p>
                                        </div>
                                    )}

                                    {!isLoadingWithdrawals &&
                                        historyMeta &&
                                        (historyMeta.totalPages > 1 || historyPage > 1) && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginTop: '1rem',
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className="withdraw-filter-btn"
                                                    disabled={historyPage <= 1}
                                                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                                                >
                                                    {t('payouts.prev') || 'Previous'}
                                                </button>
                                                <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                                                    {t('payouts.pageOf', {
                                                        page: historyMeta.page,
                                                        totalPages: Math.max(1, historyMeta.totalPages),
                                                    })}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="withdraw-filter-btn"
                                                    disabled={historyPage >= historyMeta.totalPages}
                                                    onClick={() =>
                                                        setHistoryPage((p) => Math.min(historyMeta.totalPages, p + 1))
                                                    }
                                                >
                                                    {t('payouts.next') || 'Next'}
                                                </button>
                                            </div>
                                        )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
