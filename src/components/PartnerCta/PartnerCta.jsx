import React, { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { useQueryClient } from 'react-query';
import { FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { api } from '../../services/apiConfig';
import { promoterService } from '../../services/api';
import { ToastOptions } from '../../helpers/ToastOptions';
import Loading from '../Loading/Loading';
import { useLanguage } from '../../context/LanguageContext';
import './PartnerCta.scss';

function getApiError(error, fallback) {
    const msg = error?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join('\n');
    return msg || error?.message || fallback;
}

export default function PartnerCTA({ isModal = false, onClose, onEnrolled }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [policy, setPolicy] = useState(null);
    const [policyLoading, setPolicyLoading] = useState(false);
    const [policyError, setPolicyError] = useState(null);
    const [agreedPolicy, setAgreedPolicy] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const [cookies] = useCookies(['MegaBox']);
    const queryClient = useQueryClient();
    const { t, language } = useLanguage();

    const cards = [
        {
            title: t('partners.plans.viewsPlan.title'),
            features: [
                t('partners.plans.viewsPlan.feature1'),
                t('partners.plans.viewsPlan.feature2'),
                t('partners.plans.viewsPlan.feature3'),
                t('partners.plans.viewsPlan.feature4'),
                t('partners.plans.viewsPlan.feature5'),
                t('partners.plans.viewsPlan.feature6'),
            ],
            smallDesc: t('partners.plans.viewsPlan.desc'),
            planKey: 'views',
        },
        {
            title: t('partners.plans.downloadsPlan.title'),
            features: [
                t('partners.plans.downloadsPlan.feature1'),
                t('partners.plans.downloadsPlan.feature2'),
                t('partners.plans.downloadsPlan.feature3'),
                t('partners.plans.downloadsPlan.feature4'),
                t('partners.plans.downloadsPlan.feature5'),
                t('partners.plans.downloadsPlan.feature6'),
            ],
            smallDesc: t('partners.plans.downloadsPlan.desc'),
            planKey: 'installs',
        },
    ];

    const fetchUserData = useCallback(async () => {
        try {
            const response = await api.get('/users/profile');
            setUserData(response.data?.data || null);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setUserData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = cookies.MegaBox;
        const isLoggedIn =
            typeof token === 'string' &&
            token.trim() !== '' &&
            token !== 'undefined' &&
            token !== 'null';

        if (isLoggedIn) {
            fetchUserData();
        } else {
            setUserData(null);
            setLoading(false);
        }
    }, [cookies.MegaBox, fetchUserData]);

    const loadPromoterPolicy = useCallback(async () => {
        setPolicyLoading(true);
        setPolicyError(null);
        try {
            const res = await promoterService.getPromoterPrivacyPolicy(language);
            setPolicy(res?.policy || null);
        } catch (error) {
            setPolicy(null);
            setPolicyError(
                getApiError(error, t('payouts.policyUnavailable') || 'No active promoter privacy policy found.'),
            );
        } finally {
            setPolicyLoading(false);
        }
    }, [language, t]);

    const handleChoosePlan = async (plan) => {
        const token = cookies?.MegaBox;
        const isLoggedIn =
            typeof token === 'string' &&
            token.trim().length > 0 &&
            token !== 'undefined' &&
            token !== 'null';

        if (!isLoggedIn) {
            if (isModal && onClose) {
                onClose();
            }
            navigate('/login');
            return;
        }

        setSelectedPlan(plan);
        setAgreedPolicy(false);
        setShowEnrollModal(true);
        await loadPromoterPolicy();
    };

    const handleEnrollSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlan || !policy?.version || !agreedPolicy) return;

        setIsSubmitting(true);
        try {
            const res = await promoterService.enrollPromoter({
                plan: selectedPlan.planKey,
                promoterPrivacyPolicyVersion: Number(policy.version),
            });

            toast.success(
                res?.message || t('payouts.enrollSuccess') || 'Enrolled as promoter successfully',
                ToastOptions('success'),
            );

            await fetchUserData();
            queryClient.invalidateQueries(['userAccount']);
            queryClient.invalidateQueries(['promoterStats']);
            queryClient.invalidateQueries(['promoterShares']);
            if (onEnrolled) {
                await onEnrolled();
            }

            setShowEnrollModal(false);
            setSelectedPlan(null);
            setAgreedPolicy(false);
            if (isModal && onClose) {
                onClose();
            }
        } catch (error) {
            toast.error(
                getApiError(error, t('partners.submitting') || 'Enrollment failed'),
                ToastOptions('error'),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && !isModal) {
        return <Loading />;
    }

    const isEnrolled = userData?.isPromoter === true;
    const activePlan = userData?.promoterPlan;

    return (
        <>
            <section className={`partner-cta ${isModal ? 'partner-cta--modal' : ''}`}>
                <div className="partner-cta__container">
                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="partner-cta__title"
                    >
                        {!isEnrolled ? t('partners.selectPlan') : t('partners.alreadySubscribed')}
                    </motion.h2>

                    {!isEnrolled ? (
                        <div className="partner-cta__cards">
                            {cards.map((card, idx) => (
                                <motion.div
                                    key={card.planKey}
                                    initial={{ y: 20, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.2 }}
                                    className={`partner-cta__card partner-cta__card--${idx % 2 === 0 ? 'purple' : 'orange'}`}
                                >
                                    <div className="partner-cta__card-header">
                                        <h3 className="partner-cta__card-title">{card.title}</h3>
                                        <p className="partner-cta__card-desc">{card.smallDesc}</p>
                                    </div>

                                    <div className="partner-cta__card-content">
                                        <ul className="partner-cta__features">
                                            {card.features.map((feature, i) => (
                                                <li key={i} className="partner-cta__feature">
                                                    <FaCheckCircle className="partner-cta__feature-icon" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={() => handleChoosePlan(card)}
                                            className={`partner-cta__button partner-cta__button--${idx % 2 === 0 ? 'purple' : 'orange'}`}
                                        >
                                            {t('partners.choosePlan')}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="partner-cta__subscribed"
                        >
                            <div className="partner-cta__subscribed-message">
                                <p className="partner-cta__subscribed-desc">
                                    {activePlan === 'views'
                                        ? t('partners.subscribedViewsPlan') || t('payouts.planViews')
                                        : activePlan === 'installs'
                                          ? t('partners.subscribedDownloadsPlan') || t('payouts.planInstalls')
                                          : t('partners.alreadySubscribed')}
                                </p>
                                {userData?.promoterCode && (
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.85 }}>
                                        {t('payouts.promoterCode')}: <strong>{userData.promoterCode}</strong>
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onClose) onClose();
                                    navigate('/Promoter/Earnings');
                                }}
                                className="partner-cta__dashboard-button"
                            >
                                {t('partners.seeDashboard')}
                            </button>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* Promoter Enrollment & Privacy Policy Modal */}
            <AnimatePresence>
                {showEnrollModal && selectedPlan && (
                    <motion.div
                        className="partner-cta__subscription-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowEnrollModal(false)}
                    >
                        <motion.div
                            className="partner-cta__subscription-modal-content"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="partner-cta__subscription-modal-close"
                                onClick={() => setShowEnrollModal(false)}
                            >
                                ×
                            </button>
                            <h3 className="partner-cta__subscription-modal-title">
                                {t('payouts.enrollTitle') || 'Join the Promoter Program'}
                            </h3>
                            <p className="partner-cta__subscription-modal-subtitle">
                                {t('partners.selectedPlan') || 'Selected Plan'}: {selectedPlan.title}
                            </p>

                            <form onSubmit={handleEnrollSubmit} className="partner-cta__subscription-form">
                                {policyLoading ? (
                                    <p style={{ textAlign: 'center', color: '#6b7280', margin: '1rem 0' }}>
                                        {t('payouts.policyLoading') || 'Loading promoter privacy policy...'}
                                    </p>
                                ) : policyError || !policy ? (
                                    <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                                        {policyError || t('payouts.policyUnavailable')}
                                    </p>
                                ) : (
                                    <>
                                        {Array.isArray(policy.sections) && policy.sections.length > 0 && (
                                            <div
                                                style={{
                                                    maxHeight: '220px',
                                                    overflowY: 'auto',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '0.5rem',
                                                    padding: '0.75rem 1rem',
                                                    background: '#f9fafb',
                                                    fontSize: '0.875rem',
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {policy.sections.map((section, sIdx) => (
                                                    <div key={sIdx} style={{ marginBottom: '0.75rem' }}>
                                                        <h4 style={{ margin: '0 0 0.35rem', fontWeight: 700 }}>
                                                            {section.title}
                                                        </h4>
                                                        {(section.items || []).map((item, iIdx) => (
                                                            <div key={iIdx} style={{ marginBottom: '0.35rem' }}>
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

                                <button
                                    type="submit"
                                    className="partner-cta__subscription-submit"
                                    disabled={isSubmitting || policyLoading || !policy?.version || !agreedPolicy}
                                >
                                    {isSubmitting
                                        ? t('payouts.enrolling') || 'Enrolling...'
                                        : t('payouts.enrollButton') || 'Enroll as Promoter'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
