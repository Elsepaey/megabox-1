import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaPlay, FaCloud, FaBan, FaBolt, FaLink, FaSave,
    FaDownload, FaFilePdf, FaVideo, FaEye, FaCrown,
    FaCheck, FaTimes, FaHeadset,
} from 'react-icons/fa';
import { HiCurrencyDollar } from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import { userService } from '../../services/api';
import { planService } from '../../services/planService';
import { premiumService } from '../../services/premiumService';
import { useLanguage } from '../../context/LanguageContext';
import Loading from '../../components/Loading/Loading';
import Footer from '../../components/Footer/Footer';
import './Premium.scss';

const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
]);
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;

export default function Premium() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [cookies] = useCookies(['MegaBox']);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paymentReference, setPaymentReference] = useState('');
    const [note, setNote] = useState('');
    const [invoiceFile, setInvoiceFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: plansData, isLoading: plansLoading } = useQuery(
        ['premium-plans'],
        async () => {
            try {
                const response = await planService.getPlans();
                if (response.plans) return response;
                if (Array.isArray(response)) return { plans: response };
                if (response.data) return { plans: response.data };
                return { plans: [] };
            } catch {
                return { plans: [] };
            }
        },
    );

    const { data: userData } = useQuery(
        ['userAccount'],
        () => userService.getUserInfo(cookies.MegaBox),
        {
            enabled: !!cookies.MegaBox,
            retry: false,
        },
    );

    const [requestsPage, setRequestsPage] = useState(1);

    const {
        data: myRequestsData,
        isLoading: requestsLoading,
        isFetching: requestsFetching,
    } = useQuery(
        ['my-subscription-requests', requestsPage],
        () => premiumService.getMyRequests({ page: requestsPage, limit: 10 }),
        {
            enabled: !!cookies.MegaBox,
            keepPreviousData: true,
            retry: false,
        },
    );

    const { data: latestRequestData } = useQuery(
        ['my-subscription-requests', 'latest'],
        () => premiumService.getMyRequests({ page: 1, limit: 1 }),
        {
            enabled: !!cookies.MegaBox && requestsPage > 1,
            retry: false,
        },
    );

    const plans = (plansData?.plans || []).filter((p) => p.type !== 'free');
    const myRequests = myRequestsData?.data || [];
    const requestsMeta = myRequestsData?.meta || null;
    const requestsTotalPages = requestsMeta?.totalPages || 1;
    const canPrevRequests = requestsMeta
        ? Boolean(requestsMeta.hasPrev ?? requestsMeta.hasPrevPage ?? requestsPage > 1)
        : requestsPage > 1;
    const canNextRequests = requestsMeta
        ? Boolean(requestsMeta.hasNext ?? requestsMeta.hasNextPage ?? requestsPage < requestsTotalPages)
        : requestsPage < requestsTotalPages;
    const hasPendingRequest =
        myRequests.some((r) => r.status === 'pending') ||
        (latestRequestData?.data || []).some((r) => r.status === 'pending');
    const isPremium = userData?.isBrimume === true || userData?.isBrimume === 'true';
    const premiumExpiration = userData?.brimumeExpiresAt;
    const isPremiumActive =
        isPremium && (!premiumExpiration || new Date(premiumExpiration) > new Date());

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

    const statusLabel = (status) => {
        if (status === 'approved') return t('accountPremium.statusApproved') || 'Approved';
        if (status === 'rejected') return t('accountPremium.statusRejected') || 'Rejected';
        return t('accountPremium.statusPending') || 'Pending';
    };

    const handleSelectPlan = (plan, index) => {
        setSelectedPlan({ ...plan, _index: index });
    };

    const handleUpgradeClick = () => {
        if (!cookies.MegaBox) {
            navigate('/login');
            return;
        }
        if (hasPendingRequest) {
            toast.info(
                t('accountPremium.pendingBanner') ||
                    'You already have a pending premium request under review.',
                ToastOptions('info'),
            );
            return;
        }
        if (!selectedPlan && plans.length > 0) {
            setSelectedPlan({ ...plans[0], _index: 0 });
        }
        setShowRequestModal(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (!file) {
            setInvoiceFile(null);
            return;
        }
        if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()) || file.size > MAX_INVOICE_BYTES) {
            toast.error(
                t('accountPremium.invalidInvoice') ||
                    'Invoice must be an image (JPEG, PNG, WebP, or GIF) up to 10 MB',
                ToastOptions('error'),
            );
            e.target.value = '';
            return;
        }
        setInvoiceFile(file);
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        const plan = selectedPlan || plans[0];
        const trimmedRef = paymentReference.trim();
        const trimmedNote = note.trim();

        if (!plan?._id || trimmedRef.length < 1 || trimmedRef.length > 200) {
            toast.error(
                t('accountPremium.paymentReferenceRequired') ||
                    'Payment reference is required (1–200 characters)',
                ToastOptions('error'),
            );
            return;
        }

        setIsSubmitting(true);
        try {
            await premiumService.submitRequest({
                planId: plan._id,
                paymentReference: trimmedRef,
                note: trimmedNote || undefined,
                invoiceFile,
            });
            setShowRequestModal(false);
            setPaymentReference('');
            setNote('');
            setInvoiceFile(null);
            setRequestsPage(1);
            queryClient.invalidateQueries(['my-subscription-requests']);
            queryClient.invalidateQueries(['userAccount']);
            setShowSuccessModal(true);
        } catch (error) {
            toast.error(
                error?.message ||
                    t('accountPremium.requestFailed') ||
                    'Failed to submit premium request',
                ToastOptions('error'),
            );
            queryClient.invalidateQueries(['my-subscription-requests']);
        } finally {
            setIsSubmitting(false);
        }
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
                            {premiumExpiration && (
                                <span className="premium-page__expiry">
                                    {t('premium.expiresOn') || 'Expires on'}:{' '}
                                    {new Date(premiumExpiration).toLocaleDateString()}
                                </span>
                            )}
                        </motion.div>
                    )}

                    {hasPendingRequest && (
                        <div className="premium-page__active-badge" style={{ marginTop: '0.75rem' }}>
                            <span>
                                {t('accountPremium.pendingBanner') ||
                                    'You already have a pending premium request under review.'}
                            </span>
                        </div>
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
                                    const isSelected =
                                        (selectedPlan?._id && selectedPlan._id === plan._id) ||
                                        (!selectedPlan && idx === 0);
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
                                            className={`premium-page__plan-card ${
                                                isSelected ? 'premium-page__plan-card--selected' : ''
                                            }`}
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
                                                    {plan.price ?? 0}
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

                    {/* My Premium Requests Section */}
                    {cookies.MegaBox && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.25 }}
                            className="premium-page__plans-section"
                            style={{ marginTop: '2rem' }}
                        >
                            <h2 className="premium-page__section-title">
                                {t('accountPremium.myRequestsTitle') || 'My Premium Requests'}
                            </h2>
                            {requestsLoading ? (
                                <div className="premium-page__loading">
                                    <Loading />
                                </div>
                            ) : myRequests.length === 0 ? (
                                <div className="premium-page__empty">
                                    <p>
                                        {t('accountPremium.noRequests') ||
                                            'You have not submitted any premium requests yet.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="premium-page__plans">
                                    {myRequests.map((req) => (
                                        <div key={req._id} className="premium-page__plan-card">
                                            <h3 className="premium-page__plan-name">
                                                {req.plan?.name || req.planId}
                                            </h3>
                                            <div className="premium-page__plan-duration" style={{ fontWeight: 600 }}>
                                                {statusLabel(req.status)}
                                            </div>
                                            <p style={{ fontSize: '0.85rem', margin: '0.35rem 0' }}>
                                                <strong>{t('accountPremium.paymentReference')}:</strong>{' '}
                                                {req.paymentReference}
                                            </p>
                                            {req.note && (
                                                <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
                                                    <strong>{t('accountPremium.note')}:</strong> {req.note}
                                                </p>
                                            )}
                                            <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: '0.25rem 0' }}>
                                                {t('accountPremium.submittedOn')}:{' '}
                                                {new Date(req.createdAt).toLocaleString()}
                                            </p>
                                            {req.reviewReason && (
                                                <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
                                                    <strong>{t('accountPremium.reviewReason')}:</strong>{' '}
                                                    {req.reviewReason}
                                                </p>
                                            )}
                                            {req.invoiceUrl && (
                                                <a
                                                    href={req.invoiceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '0.85rem', textDecoration: 'underline' }}
                                                >
                                                    {t('accountPremium.viewInvoice') || 'View Receipt'}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {requestsMeta && requestsTotalPages > 1 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '1rem',
                                        marginTop: '1.5rem',
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="premium-modal__btn premium-modal__btn--secondary"
                                        disabled={!canPrevRequests || requestsFetching}
                                        onClick={() => setRequestsPage((p) => Math.max(1, p - 1))}
                                    >
                                        {t('accountPremium.previous') || 'Previous'}
                                    </button>
                                    <span>
                                        {t('accountPremium.pageOf', {
                                            page: requestsMeta.page || requestsPage,
                                            totalPages: requestsTotalPages,
                                        }) || `Page ${requestsMeta.page || requestsPage} of ${requestsTotalPages}`}
                                    </span>
                                    <button
                                        type="button"
                                        className="premium-modal__btn premium-modal__btn--secondary"
                                        disabled={!canNextRequests || requestsFetching}
                                        onClick={() =>
                                            setRequestsPage((p) => Math.min(requestsTotalPages, p + 1))
                                        }
                                    >
                                        {t('accountPremium.next') || 'Next'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="premium-page__terms"
                    >
                        <p>
                            {t('premium.terms1') ||
                                'Subscription will be charged to your payment method. Subscription automatically renews unless cancelled.'}
                        </p>
                        <p>
                            {t('premium.terms2') ||
                                'You can manage and cancel your subscription at any time from your account settings.'}
                        </p>
                    </motion.div>
                </div>

                <div className="premium-page__footer-cta">
                    <button
                        className="premium-page__subscribe-btn"
                        onClick={handleUpgradeClick}
                        disabled={plans.length === 0 || isPremiumActive || hasPendingRequest}
                    >
                        <span>{t('premium.upgradeNow') || 'Upgrade Now'}</span>
                        {activePlan?.offer && (
                            <span className="premium-page__subscribe-badge">{activePlan.offer}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Request Submission Modal */}
            <AnimatePresence>
                {showRequestModal && activePlan && (
                    <motion.div
                        className="premium-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isSubmitting && setShowRequestModal(false)}
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
                                onClick={() => !isSubmitting && setShowRequestModal(false)}
                                disabled={isSubmitting}
                            >
                                <FaTimes />
                            </button>

                            <div className="premium-modal__icon premium-modal__icon--confirm">
                                <FaCrown />
                            </div>

                            <h2 className="premium-modal__title">
                                {t('accountPremium.submitRequest') || 'Submit Premium Request'}
                            </h2>

                            <div className="premium-modal__plan-summary">
                                <span className="premium-modal__plan-name">{activePlan.name}</span>
                                <span className="premium-modal__plan-price">${activePlan.price}</span>
                            </div>

                            <form onSubmit={handleSubmitRequest} style={{ textAlign: 'start', width: '100%' }}>
                                <div style={{ marginBottom: '0.85rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                        {t('accountPremium.paymentReference') || 'Payment Reference'} *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={200}
                                        disabled={isSubmitting}
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder={
                                            t('accountPremium.paymentReferencePlaceholder') ||
                                            'Transaction ID, transfer code, or receipt number'
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem 0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #cbd5e1',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '0.85rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                        {t('accountPremium.note') || 'Note (optional)'}
                                    </label>
                                    <textarea
                                        rows={2}
                                        maxLength={500}
                                        disabled={isSubmitting}
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder={
                                            t('accountPremium.notePlaceholder') ||
                                            'Additional payment details or transfer method (optional)'
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem 0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #cbd5e1',
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                        {t('accountPremium.invoiceImage') || 'Payment Receipt Image (optional)'}
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        disabled={isSubmitting}
                                        onChange={handleFileChange}
                                    />
                                    <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '0.2rem' }}>
                                        {t('accountPremium.invoiceHint')}
                                    </div>
                                </div>

                                <div className="premium-modal__actions">
                                    <button
                                        type="button"
                                        className="premium-modal__btn premium-modal__btn--secondary"
                                        onClick={() => setShowRequestModal(false)}
                                        disabled={isSubmitting}
                                    >
                                        {t('common.cancel') || 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        className="premium-modal__btn premium-modal__btn--primary"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting
                                            ? t('accountPremium.submitting') || 'Submitting...'
                                            : t('accountPremium.submitRequest') || 'Submit Premium Request'}
                                    </button>
                                </div>
                            </form>
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
                                {t('accountPremium.requestSubmitted') ||
                                    'Premium request submitted and is pending review'}
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
