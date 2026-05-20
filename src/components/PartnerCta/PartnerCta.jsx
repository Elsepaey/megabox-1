import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { FaCheckCircle } from "react-icons/fa";
import api from "../../services/api";
import { promoterService } from "../../services/api";
import Loading from "../Loading/Loading";
import { useLanguage } from "../../context/LanguageContext";
import TermsModal from "../TermsModal/TermsModal";
import './PartnerCta.scss'


export default function PartnerCTA({ isModal = false, onClose }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [subscriptionForm, setSubscriptionForm] = useState({
        invoiceFile: null,
        phone: '',
        subscriberName: '',
        planName: '',
        durationDays: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const [cookies] = useCookies(["MegaBox"]);
    const { t } = useLanguage();

    // Always use fallback cards for promoter plans (watching and download)
    // This ensures we only show promoter plans, not subscription plans
    // The "Start as Promoter" button should show watching and download plans only
    const plansLoading = false; // No need to load plans, we use fallback cards
    
    // Promoter plans cards (watching and download only)
    const cards = [
        {
            title: t('partners.plans.viewsPlan.title'),
            features: [
                t('partners.plans.viewsPlan.feature1'),
                t('partners.plans.viewsPlan.feature2'),
                t('partners.plans.viewsPlan.feature3'),
                t('partners.plans.viewsPlan.feature4'),
                t('partners.plans.viewsPlan.feature5'),
                t('partners.plans.viewsPlan.feature6')
            ],
            smallDesc: t('partners.plans.viewsPlan.desc'),
            planKey: "watchingplan"
        },
        {
            title: t('partners.plans.downloadsPlan.title'),
            features: [
                t('partners.plans.downloadsPlan.feature1'),
                t('partners.plans.downloadsPlan.feature2'),
                t('partners.plans.downloadsPlan.feature3'),
                t('partners.plans.downloadsPlan.feature4'),
                t('partners.plans.downloadsPlan.feature5'),
                t('partners.plans.downloadsPlan.feature6')
            ],
            smallDesc: t('partners.plans.downloadsPlan.desc'),
            planKey: "Downloadsplan"
        }
    ];

    useEffect(() => {
        const isLoggedIn = cookies.MegaBox && cookies.MegaBox !== 'undefined' && cookies.MegaBox !== 'null' && cookies.MegaBox.trim() !== '';
        
        if (!isModal) {
            if (isLoggedIn) {
                fetchUserData();
            } else {
                setUserData(null);
                setLoading(false);
            }
        } else {
            // For modal, fetch user data if token exists
            if (isLoggedIn) {
                fetchUserData();
            } else {
                setUserData(null);
                setLoading(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isModal, cookies.MegaBox]);

    const fetchUserData = async () => {
        try {
            const response = await api.get('/users/profile', {
                headers: {
                    Authorization: `Bearer ${cookies.MegaBox}`
                }
            });
            setUserData(response.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan) => {
        // Check if user is logged in properly
        const token = cookies?.MegaBox;
        const isLoggedIn = token && 
                          token !== 'undefined' && 
                          token !== 'null' && 
                          typeof token === 'string' && 
                          token.trim().length > 0;
        
        // Debug: Log token status
        console.log('PartnerCTA - Token check:', { token, isLoggedIn, cookies });
        
        if (!isLoggedIn) {
            // If modal is open from landing page, close it and navigate to login
            if (isModal && onClose) {
                onClose();
            }
            navigate("/login");
            return;
        }
        
        // Check if user has already accepted terms
        const termsAccepted = localStorage.getItem('termsAccepted');
        
        if (!termsAccepted) {
            // Show terms modal first
            setSelectedPlan(plan);
            setShowTermsModal(true);
            return;
        }
        
        // If terms already accepted, show subscription form
        setSelectedPlan(plan);
        setShowSubscriptionModal(true);
    };

    const handleSubscriptionSubmit = async (e) => {
        e.preventDefault();
        
        if (!subscriptionForm.phone || !subscriptionForm.subscriberName || !selectedPlan) {
            return;
        }

        setIsSubmitting(true);
        try {
            const plan = selectedPlan;
            await promoterService.createSubscription(
                subscriptionForm.invoiceFile,
                subscriptionForm.phone,
                subscriptionForm.subscriberName,
                plan.planDays || plan.days || 30,
                plan.planKey || plan.name || plan.planName,
                cookies.MegaBox
            );
            
            await fetchUserData(); // Refresh user data after subscription
            setShowSubscriptionModal(false);
            setSubscriptionForm({
                invoiceFile: null,
                phone: '',
                subscriberName: '',
                planName: '',
                durationDays: ''
            });
            if (isModal && onClose) {
                onClose();
            }
        } catch (error) {
            console.error('Error creating subscription:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSubscriptionForm(prev => ({ ...prev, invoiceFile: file }));
        }
    };

    const handleTermsAccept = () => {
        if (selectedPlan) {
            setShowTermsModal(false);
            setShowSubscriptionModal(true);
        }
    };

    if (loading && !isModal) {
        return <Loading />;
    }

    const hasNoPlans = !userData || (!userData?.watchingplan && !userData?.Downloadsplan);

    return (
        <>
            <TermsModal
                isOpen={showTermsModal}
                onClose={() => {
                    setShowTermsModal(false);
                    setSelectedPlan(null);
                }}
                onAccept={handleTermsAccept}
            />
            <section className={`partner-cta ${isModal ? 'partner-cta--modal' : ''}`}>
                <div className="partner-cta__container">
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="partner-cta__title"
                >
                    {hasNoPlans ? t('partners.selectPlan') : t('partners.alreadySubscribed')}
                </motion.h2>

                {hasNoPlans ? (
                    plansLoading ? (
                        <div className="partner-cta__loading">
                            <Loading />
                        </div>
                    ) : (
                        <div className="partner-cta__cards">
                            {cards.map((card, idx) => (
                                <motion.div
                                    key={card.planId || card.planKey || idx}
                                    initial={{ y: 20, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.2 }}
                                    className={`partner-cta__card partner-cta__card--${idx % 2 === 0 ? 'purple' : 'orange'}`}
                                >
                                    {/* Card Header */}
                                    <div className="partner-cta__card-header">
                                        <h3 className="partner-cta__card-title">{card.title}</h3>
                                        <p className="partner-cta__card-desc">{card.smallDesc}</p>
                                    </div>

                                    {/* Card Content */}
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
                                            onClick={() => handleSubscribe(card)}
                                            className={`partner-cta__button partner-cta__button--${idx % 2 === 0 ? 'purple' : 'orange'}`}
                                        >
                                            {t('partners.choosePlan')}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )
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
                                {userData?.watchingplan && userData?.Downloadsplan 
                                    ? t('partners.subscribedBothPlans') || 'أنت مشترك في كلا الخطتين'
                                    : userData?.watchingplan 
                                        ? t('partners.subscribedViewsPlan') || 'أنت مشترك في خطة المشاهدات'
                                        : t('partners.subscribedDownloadsPlan') || 'أنت مشترك في خطة التحميلات'
                                }
                            </p>
                        </div>
                        <button
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

        {/* Subscription Modal */}
        <AnimatePresence>
            {showSubscriptionModal && selectedPlan && (
                <motion.div
                    className="partner-cta__subscription-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowSubscriptionModal(false)}
                >
                <motion.div
                    className="partner-cta__subscription-modal-content"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="partner-cta__subscription-modal-close"
                        onClick={() => setShowSubscriptionModal(false)}
                    >
                        ×
                    </button>
                    <h3 className="partner-cta__subscription-modal-title">
                        {t('partners.createSubscription') || 'Create Subscription'}
                    </h3>
                    <p className="partner-cta__subscription-modal-subtitle">
                        {t('partners.selectedPlan') || 'Selected Plan'}: {selectedPlan.title || selectedPlan.name}
                    </p>
                    <form onSubmit={handleSubscriptionSubmit} className="partner-cta__subscription-form">
                        <div className="partner-cta__form-group">
                            <label>{t('partners.subscriberName') || 'Subscriber Name'}</label>
                            <input
                                type="text"
                                value={subscriptionForm.subscriberName}
                                onChange={(e) => setSubscriptionForm(prev => ({ ...prev, subscriberName: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="partner-cta__form-group">
                            <label>{t('partners.phone') || 'Phone Number'}</label>
                            <input
                                type="tel"
                                value={subscriptionForm.phone}
                                onChange={(e) => setSubscriptionForm(prev => ({ ...prev, phone: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="partner-cta__form-group">
                            <label>{t('partners.invoice') || 'Invoice (Optional)'}</label>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                            />
                        </div>
                        <button
                            type="submit"
                            className="partner-cta__subscription-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (t('partners.submitting') || 'Submitting...') : (t('partners.submitSubscription') || 'Submit Subscription')}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>
        </>
    );
}
