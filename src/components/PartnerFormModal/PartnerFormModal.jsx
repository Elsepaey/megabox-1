import React, { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { useQueryClient } from 'react-query';
import { FaTimes, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/apiConfig';
import { promoterService } from '../../services/api';
import { ToastOptions } from '../../helpers/ToastOptions';
import './PartnerFormModal.scss';

const modalVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 40 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
    exit: { opacity: 0, scale: 0.85, y: 40, transition: { duration: 0.2 } },
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

function getApiError(error, fallback) {
    const msg = error?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join('\n');
    return msg || error?.message || fallback;
}

export default function PartnerFormModal({ isOpen, onClose }) {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [cookies] = useCookies(['MegaBox']);
    const queryClient = useQueryClient();

    const [userData, setUserData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [policy, setPolicy] = useState(null);
    const [policyLoading, setPolicyLoading] = useState(false);
    const [policyError, setPolicyError] = useState(null);
    const [plan, setPlan] = useState('views');
    const [agreedPolicy, setAgreedPolicy] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const token = cookies.MegaBox;
    const isLoggedIn =
        typeof token === 'string' &&
        token.trim().length > 0 &&
        token !== 'undefined' &&
        token !== 'null';

    const loadData = useCallback(async () => {
        if (!isLoggedIn) {
            setUserData(null);
            return;
        }
        setLoadingProfile(true);
        setPolicyLoading(true);
        setPolicyError(null);
        try {
            const profileRes = await api.get('/users/profile');
            const profile = profileRes.data?.data || null;
            setUserData(profile);

            if (!profile?.isPromoter) {
                try {
                    const policyRes = await promoterService.getPromoterPrivacyPolicy(language);
                    setPolicy(policyRes?.policy || null);
                } catch (err) {
                    setPolicy(null);
                    setPolicyError(
                        getApiError(err, t('payouts.policyUnavailable') || 'No active promoter privacy policy found.'),
                    );
                }
            }
        } catch (error) {
            console.error('Error loading promoter enrollment data:', error);
            setUserData(null);
        } finally {
            setLoadingProfile(false);
            setPolicyLoading(false);
        }
    }, [isLoggedIn, language, t]);

    useEffect(() => {
        if (isOpen) {
            setAgreedPolicy(false);
            loadData();
        }
    }, [isOpen, loadData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!policy?.version || !agreedPolicy) return;

        setSubmitting(true);
        try {
            const res = await promoterService.enrollPromoter({
                plan,
                promoterPrivacyPolicyVersion: Number(policy.version),
            });
            toast.success(
                res?.message || t('payouts.enrollSuccess') || 'Enrolled as promoter successfully',
                ToastOptions('success'),
            );
            queryClient.invalidateQueries(['userAccount']);
            queryClient.invalidateQueries(['promoterStats']);
            queryClient.invalidateQueries(['promoterShares']);
            onClose();
            navigate('/Promoter/Earnings');
        } catch (error) {
            toast.error(getApiError(error, 'Enrollment failed'), ToastOptions('error'));
        } finally {
            setSubmitting(false);
        }
    };

    const isEnrolled = userData?.isPromoter === true;

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    className="partner-form-modal__overlay"
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={onClose}
                >
                    <motion.div
                        className="partner-form-modal__content"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="partner-form-modal__header">
                            <div>
                                <h2 className="partner-form-modal__title">
                                    {t('payouts.enrollTitle') || t('partnerFormModal.title')}
                                </h2>
                                <p className="partner-form-modal__subtitle">
                                    {t('payouts.enrollSubtitle') || t('partnerFormModal.subtitle')}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="partner-form-modal__close"
                                onClick={onClose}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {!isLoggedIn ? (
                            <div className="partner-form-modal__form" style={{ gap: '1rem' }}>
                                <p style={{ margin: 0, color: '#4b5563' }}>
                                    {t('payouts.loginToEnroll') || 'Sign in to your account to enroll in the Promoter Program.'}
                                </p>
                                <div className="partner-form-modal__actions">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="partner-form-modal__button partner-form-modal__button--cancel"
                                    >
                                        {t('partnerFormModal.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            navigate('/login');
                                        }}
                                        className="partner-form-modal__button partner-form-modal__button--submit"
                                    >
                                        {t('payouts.goToLogin') || 'Sign In'}
                                    </button>
                                </div>
                            </div>
                        ) : loadingProfile ? (
                            <div className="partner-form-modal__form">
                                <p style={{ textAlign: 'center', color: '#6b7280', margin: '1rem 0' }}>
                                    {t('revenueData.loading') || 'Loading...'}
                                </p>
                            </div>
                        ) : isEnrolled ? (
                            <div className="partner-form-modal__form" style={{ gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#16a34a' }}>
                                    <FaCheckCircle style={{ fontSize: '1.5rem', flexShrink: 0 }} />
                                    <div>
                                        <strong>{t('partners.alreadySubscribed')}</strong>
                                        <p style={{ margin: '0.25rem 0 0', color: '#4b5563', fontSize: '0.9rem' }}>
                                            {userData.promoterPlan === 'views'
                                                ? t('payouts.planViews')
                                                : userData.promoterPlan === 'installs'
                                                  ? t('payouts.planInstalls')
                                                  : ''}
                                            {userData.promoterCode
                                                ? ` · ${t('payouts.promoterCode')}: ${userData.promoterCode}`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="partner-form-modal__actions">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="partner-form-modal__button partner-form-modal__button--cancel"
                                    >
                                        {t('partnerFormModal.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            navigate('/Promoter/Earnings');
                                        }}
                                        className="partner-form-modal__button partner-form-modal__button--submit"
                                    >
                                        {t('partners.seeDashboard')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="partner-form-modal__form">
                                <div className="partner-form-modal__field">
                                    <label className="partner-form-modal__label">
                                        {t('payouts.promoterPlan') || 'Plan'}
                                    </label>
                                    <select
                                        name="plan"
                                        value={plan}
                                        onChange={(e) => setPlan(e.target.value)}
                                        className="partner-form-modal__input"
                                        required
                                    >
                                        <option value="views">{t('payouts.planViews') || 'Views Plan'}</option>
                                        <option value="installs">{t('payouts.planInstalls') || 'Installs Plan'}</option>
                                    </select>
                                </div>

                                {policyLoading ? (
                                    <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                        {t('payouts.policyLoading') || 'Loading promoter privacy policy...'}
                                    </p>
                                ) : policyError || !policy ? (
                                    <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>
                                        {policyError || t('payouts.policyUnavailable')}
                                    </p>
                                ) : (
                                    <>
                                        {Array.isArray(policy.sections) && policy.sections.length > 0 && (
                                            <div
                                                style={{
                                                    maxHeight: '200px',
                                                    overflowY: 'auto',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '0.5rem',
                                                    padding: '0.75rem 1rem',
                                                    background: '#f9fafb',
                                                    fontSize: '0.85rem',
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {policy.sections.map((section, sIdx) => (
                                                    <div key={sIdx} style={{ marginBottom: '0.65rem' }}>
                                                        <h4 style={{ margin: '0 0 0.3rem', fontWeight: 700 }}>
                                                            {section.title}
                                                        </h4>
                                                        {(section.items || []).map((item, iIdx) => (
                                                            <div key={iIdx} style={{ marginBottom: '0.3rem' }}>
                                                                {item.heading && (
                                                                    <strong style={{ display: 'block' }}>{item.heading}</strong>
                                                                )}
                                                                {item.type === 'list' && Array.isArray(item.points) ? (
                                                                    <ul style={{ margin: '0.2rem 0 0.2rem 1.2rem', padding: 0 }}>
                                                                        {item.points.map((pt, pIdx) => (
                                                                            <li key={pIdx}>{pt}</li>
                                                                        ))}
                                                                    </ul>
                                                                ) : (
                                                                    item.body && <p style={{ margin: 0 }}>{item.body}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <label
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                fontSize: '0.9rem',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={agreedPolicy}
                                                onChange={(e) => setAgreedPolicy(e.target.checked)}
                                                required
                                            />
                                            <span>
                                                {t('payouts.enrollPolicyAgree', { version: policy.version })}
                                            </span>
                                        </label>
                                    </>
                                )}

                                <div className="partner-form-modal__actions">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="partner-form-modal__button partner-form-modal__button--cancel"
                                    >
                                        {t('partnerFormModal.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || policyLoading || !policy?.version || !agreedPolicy}
                                        className="partner-form-modal__button partner-form-modal__button--submit"
                                    >
                                        {submitting
                                            ? t('payouts.enrolling') || 'Enrolling...'
                                            : t('payouts.enrollButton') || 'Enroll as Promoter'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
