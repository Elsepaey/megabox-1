import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaPlay, FaCloud, FaBan, FaBolt, FaLink, FaSave,
    FaDownload, FaFilePdf, FaVideo, FaEye, FaCrown,
    FaCheck, FaTimes, FaHeadset
} from 'react-icons/fa';
import { HiCurrencyDollar } from 'react-icons/hi2';
import { adminService, userService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Loading from '../../components/Loading/Loading';
import Footer from '../../components/Footer/Footer';
import './Premium.scss';

export default function Premium() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [cookies] = useCookies(['MegaBox']);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const { data: plansData, isLoading: plansLoading } = useQuery(
        ['premium-plans'],
        async () => {
            try {
                const response = await adminService.getPlans();
                if (response.plans) return response;
                if (Array.isArray(response)) return { plans: response };
                if (response.data) return { plans: response.data };
                return { plans: [] };
            } catch {
                return { plans: [] };
            }
        }
    );

    const { data: userData } = useQuery(
        ['userAccount'],
        () => userService.getUserInfo(cookies.MegaBox),
        {
            enabled: !!cookies.MegaBox,
            retry: false
        }
    );

    const plans = plansData?.plans || [];
    const isPremium = userData?.isBrimume === true || userData?.isBrimume === "true";
    const premiumExpiration = userData?.premiumExpiration || userData?.premiumExpirationDate;
    const isPremiumActive = isPremium && premiumExpiration && new Date(premiumExpiration) > new Date();

    const features = [
        { icon: FaPlay, key: 'fasterBuffering' },
        { icon: FaCloud, key: 'storage' },
        { icon: FaBan, key: 'removeAds' },
        { icon: FaBolt, key: 'fasterDownload' },
        { icon: FaLink, key: 'unlimitedLinks' },
        { icon: FaSave, key: 'simultaneousSaving' },
        { icon: FaDownload, key: 'multitaskingDownloads' },
        { icon: FaFilePdf, key: 'onlinePdfReader' },
        { icon: FaVideo, key: 'advancedPlayback' },
        { icon: FaEye, key: 'unlimitedWatching' },
    ];

    const formatStorage = (mb) => {
        if (!mb) return '1TB';
        const storageMb = mb || 0;
        const gb = storageMb / 1024;
        if (gb >= 1024) {
            return `${(gb / 1024).toFixed(0)}TB`;
        }
        if (gb >= 1) {
            return `${gb.toFixed(0)}GB`;
        }
        return `${storageMb}MB`;
    };

    const handleSelectPlan = (plan, index) => {
        setSelectedPlan({ ...plan, _index: index });
    };

    const handleUpgradeClick = () => {
        if (!cookies.MegaBox) {
            navigate('/login');
            return;
        }
        if (!selectedPlan && plans.length > 0) {
            setSelectedPlan({ ...plans[0], _index: 0 });
        }
        setShowConfirmModal(true);
    };

    const handleConfirm = () => {
        setShowConfirmModal(false);
        setShowSuccessModal(true);
    };

    const handleGoHome = () => {
        setShowSuccessModal(false);
        navigate('/');
    };

    const activePlan = selectedPlan || (plans.length > 0 ? plans[0] : null);

    return (
        <>
            <div className="premium-page">
                <div className="premium-page__container">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="premium-page__header"
                    >
                        <FaCrown className="premium-page__header-icon" />
                        <h1 className="premium-page__title">
                            {t('premium.title') || 'Premium'}
                        </h1>
                        <p className="premium-page__subtitle">
                            {t('premium.subtitle') || 'Unlock all premium features'}
                        </p>
                    </motion.div>

                    {isPremiumActive && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="premium-page__active-badge"
                        >
                            <FaCrown />
                            <span>{t('premium.alreadyPremium') || 'You are a Premium member!'}</span>
                            <span className="premium-page__expiry">
                                {t('premium.expiresOn') || 'Expires on'}: {new Date(premiumExpiration).toLocaleDateString()}
                            </span>
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="premium-page__features"
                    >
                        <h2 className="premium-page__section-title">
                            {t('premium.featuresTitle') || 'Premium Features'}
                        </h2>
                        <div className="premium-page__features-grid">
                            {features.map((feature, idx) => (
                                <div key={idx} className="premium-page__feature-item">
                                    <div className="premium-page__feature-icon">
                                        <feature.icon />
                                    </div>
                                    <span className="premium-page__feature-label">
                                        {t(`premium.features.${feature.key}`) || feature.key}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="premium-page__plans-section"
                    >
                        <h2 className="premium-page__section-title">
                            {t('premium.choosePlan') || 'Choose Your Plan'}
                        </h2>

                        {plansLoading ? (
                            <div className="premium-page__loading">
                                <Loading />
                            </div>
                        ) : plans.length > 0 ? (
                            <div className="premium-page__plans">
                                {plans.map((plan, idx) => {
                                    const isSelected = selectedPlan?._index === idx;
                                    const hasOffer = plan.offer;
                                    const isYearly = plan.type === 'yearly' || plan.days >= 365;
                                    const storageMb = plan.storage_limit_mb || plan.storageLimitMb;
                                    const oldPrice = plan.old_price || plan.oldPrice;
                                    const planFeatures = plan.features || [];

                                    return (
                                        <motion.div
                                            key={plan._id || plan.id || idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                                            className={`premium-page__plan-card ${isSelected ? 'premium-page__plan-card--selected' : ''}`}
                                            onClick={() => handleSelectPlan(plan, idx)}
                                        >
                                            {hasOffer && (
                                                <div className="premium-page__plan-badge">
                                                    {plan.offer}
                                                </div>
                                            )}

                                            <h3 className="premium-page__plan-name">
                                                {plan.name || t('premium.plan') || 'Plan'}
                                            </h3>

                                            <div className="premium-page__plan-storage">
                                                <FaCloud />
                                                {formatStorage(storageMb)}
                                            </div>

                                            <div className="premium-page__plan-price">
                                                <HiCurrencyDollar className="premium-page__plan-price-icon" />
                                                <span className="premium-page__plan-amount">
                                                    {plan.price || '0'}
                                                </span>
                                                <span className="premium-page__plan-period">
                                                    {isYearly ? '/yr' : '/mo'}
                                                </span>
                                            </div>

                                            {oldPrice && (
                                                <div className="premium-page__plan-old-price">
                                                    ${oldPrice}
                                                </div>
                                            )}

                                            {isYearly && plan.price && (
                                                <div className="premium-page__plan-monthly">
                                                    ${(plan.price / 12).toFixed(2)}/mo
                                                </div>
                                            )}

                                            <div className="premium-page__plan-duration">
                                                {plan.days || 30} {t('premium.days') || 'days'}
                                            </div>

                                            {planFeatures.length > 0 && (
                                                <ul className="premium-page__plan-features-list">
                                                    {planFeatures.slice(0, 3).map((feat, i) => (
                                                        <li key={i}>
                                                            <FaCheck />
                                                            <span>{feat}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="premium-page__empty">
                                <p>{t('premium.noPlans') || 'No plans available at the moment.'}</p>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="premium-page__terms"
                    >
                        <p>{t('premium.terms1') || 'Subscription will be charged to your payment method. Subscription automatically renews unless cancelled.'}</p>
                        <p>{t('premium.terms2') || 'You can manage and cancel your subscription at any time from your account settings.'}</p>
                    </motion.div>
                </div>

                <div className="premium-page__footer-cta">
                    <button
                        className="premium-page__subscribe-btn"
                        onClick={handleUpgradeClick}
                        disabled={plans.length === 0 || isPremiumActive}
                    >
                        <span>{t('premium.upgradeNow') || 'Upgrade Now'}</span>
                        {activePlan?.offer && (
                            <span className="premium-page__subscribe-badge">
                                {activePlan.offer}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        className="premium-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowConfirmModal(false)}
                    >
                        <motion.div
                            className="premium-modal"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="premium-modal__close"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                <FaTimes />
                            </button>

                            <div className="premium-modal__icon premium-modal__icon--confirm">
                                <FaCrown />
                            </div>

                            <h2 className="premium-modal__title">
                                {t('premium.confirmTitle') || 'Confirm Upgrade'}
                            </h2>

                            <p className="premium-modal__text">
                                {t('premium.confirmText') || 'You are about to upgrade to:'}
                            </p>

                            <div className="premium-modal__plan-summary">
                                <span className="premium-modal__plan-name">{activePlan?.name}</span>
                                <span className="premium-modal__plan-price">${activePlan?.price}</span>
                            </div>

                            <div className="premium-modal__actions">
                                <button
                                    className="premium-modal__btn premium-modal__btn--secondary"
                                    onClick={() => setShowConfirmModal(false)}
                                >
                                    {t('common.cancel') || 'Cancel'}
                                </button>
                                <button
                                    className="premium-modal__btn premium-modal__btn--primary"
                                    onClick={handleConfirm}
                                >
                                    {t('premium.confirm') || 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        className="premium-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="premium-modal"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                        >
                            <div className="premium-modal__icon premium-modal__icon--success">
                                <FaHeadset />
                            </div>

                            <h2 className="premium-modal__title">
                                {t('premium.successTitle') || 'Request Submitted!'}
                            </h2>

                            <p className="premium-modal__text premium-modal__text--center">
                                {t('premium.successText') || 'Our support team will contact you shortly to complete your subscription. Thank you for choosing Premium!'}
                            </p>

                            <div className="premium-modal__actions premium-modal__actions--center">
                                <button
                                    className="premium-modal__btn premium-modal__btn--primary premium-modal__btn--large"
                                    onClick={handleGoHome}
                                >
                                    {t('premium.goHome') || 'Go to Home'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </>
    );
}