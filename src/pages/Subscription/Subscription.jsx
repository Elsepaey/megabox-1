import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaTimes, FaFileInvoice, FaReceipt, FaStickyNote } from 'react-icons/fa';
import { HiCurrencyDollar, HiClock } from 'react-icons/hi2';
import { userService } from '../../services/api';
import { planService } from '../../services/planService';
import { premiumService } from '../../services/premiumService';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import { useLanguage } from '../../context/LanguageContext';
import Loading from '../../components/Loading/Loading';
import TermsModal from '../../components/TermsModal/TermsModal';
import Footer from '../../components/Footer/Footer';
import './Subscription.scss';

const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
]);
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;

export default function Subscription() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [cookies] = useCookies(['MegaBox']);
    const queryClient = useQueryClient();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [subscriptionForm, setSubscriptionForm] = useState({
        paymentReference: '',
        note: '',
        invoiceFile: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch active plans from GET /api/plans
    const { data: plansData, isLoading: plansLoading } = useQuery(
        ['subscription-plans'],
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
        { enabled: true },
    );

    const plans = (plansData?.plans || []).filter((p) => p.type !== 'free');

    // Fetch user account
    const { data: userData } = useQuery(
        ['userAccount'],
        () => userService.getUserInfo(cookies.MegaBox),
        {
            enabled: !!cookies.MegaBox,
            retry: false,
        },
    );

    const [requestsPage, setRequestsPage] = useState(1);

    // Fetch user's own premium requests (paginated)
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

    const statusLabel = (status) => {
        if (status === 'approved') return t('accountPremium.statusApproved') || 'Approved';
        if (status === 'rejected') return t('accountPremium.statusRejected') || 'Rejected';
        return t('accountPremium.statusPending') || 'Pending';
    };

    const handleRequestPlan = (plan) => {
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

        const termsAccepted = localStorage.getItem('termsAccepted');
        if (!termsAccepted) {
            setSelectedPlan(plan);
            setShowTermsModal(true);
            return;
        }

        setSelectedPlan(plan);
        setShowSubscriptionModal(true);
    };

    const handleTermsAccept = () => {
        if (selectedPlan) {
            setShowTermsModal(false);
            setShowSubscriptionModal(true);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (!file) {
            setSubscriptionForm((prev) => ({ ...prev, invoiceFile: null }));
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
        setSubscriptionForm((prev) => ({ ...prev, invoiceFile: file }));
    };

    const handleSubscriptionSubmit = async (e) => {
        e.preventDefault();
        const paymentReference = subscriptionForm.paymentReference.trim();
        const note = subscriptionForm.note.trim();

        if (!selectedPlan?._id || paymentReference.length < 1 || paymentReference.length > 200) {
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
                planId: selectedPlan._id,
                paymentReference,
                note: note || undefined,
                invoiceFile: subscriptionForm.invoiceFile,
            });

            setShowSubscriptionModal(false);
            setSubscriptionForm({
                paymentReference: '',
                note: '',
                invoiceFile: null,
            });
            setSelectedPlan(null);
            setRequestsPage(1);
            queryClient.invalidateQueries(['my-subscription-requests']);
            queryClient.invalidateQueries(['userAccount']);
            toast.success(
                t('accountPremium.requestSubmitted') ||
                    'Premium request submitted and is pending review',
                ToastOptions('success'),
            );
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

    return (
        <>
            <div className="subscription-page">
                <div className="subscription-page__container">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                        className="subscription-page__header"
                    >
                        <h1 className="subscription-page__title">
                            {t('subscriptionPage.title') || 'Subscription Plans'}
                        </h1>
                        <p className="subscription-page__subtitle">
                            {t('subscriptionPage.subtitleUser') || 'Browse available subscription plans'}
                        </p>
                    </motion.div>

                    {isPremiumActive && (
                        <div className="subscription-page__empty" style={{ marginBottom: '1.5rem' }}>
                            <p>
                                <strong>{t('premium.alreadyPremium') || 'You are a Premium member!'}</strong>
                                {premiumExpiration
                                    ? ` · ${t('accountPremium.expiresOn') || 'Expires on'}: ${new Date(
                                          premiumExpiration,
                                      ).toLocaleDateString()}`
                                    : ''}
                            </p>
                        </div>
                    )}

                    {hasPendingRequest && (
                        <div className="subscription-page__empty" style={{ marginBottom: '1.5rem' }}>
                            <p>
                                {t('accountPremium.pendingBanner') ||
                                    'You already have a pending premium request under review.'}
                            </p>
                        </div>
                    )}

                    {/* Plans Section */}
                    <div className="subscription-page__section">
                        <h2 className="subscription-page__section-title">
                            {t('subscriptionPage.availablePlans') || 'Available Plans'}
                        </h2>
                        {plansLoading ? (
                            <div className="subscription-page__loading">
                                <Loading />
                            </div>
                        ) : plans.length > 0 ? (
                            <div className="subscription-page__plans">
                                {plans.map((plan, idx) => (
                                    <motion.div
                                        key={plan._id || plan.id || idx}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                        className="subscription-page__plan-card"
                                    >
                                        <div className="subscription-page__plan-header">
                                            <h3 className="subscription-page__plan-title">
                                                {plan.name ||
                                                    t('subscriptionPage.plan.defaultName') ||
                                                    'Subscription Plan'}
                                            </h3>
                                            <div className="subscription-page__plan-price">
                                                <HiCurrencyDollar className="subscription-page__plan-price-icon" />
                                                <span className="subscription-page__plan-amount">
                                                    {plan.price ?? 0}
                                                </span>
                                                <span className="subscription-page__plan-currency">
                                                    {plan.currency || 'USD'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="subscription-page__plan-content">
                                            <ul className="subscription-page__plan-features">
                                                <li className="subscription-page__plan-feature">
                                                    <HiClock className="subscription-page__plan-feature-icon" />
                                                    <span>
                                                        {plan.days || 30} {t('subscriptionPage.plan.days') || 'days'}
                                                    </span>
                                                </li>
                                                {(plan.features || []).map((feat, i) => (
                                                    <li key={i} className="subscription-page__plan-feature">
                                                        <FaCheckCircle className="subscription-page__plan-feature-icon" />
                                                        <span>{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <button
                                                onClick={() => handleRequestPlan(plan)}
                                                className="subscription-page__plan-button"
                                                disabled={isSubmitting || hasPendingRequest}
                                            >
                                                {t('subscriptionPage.subscribe') || 'Subscribe'}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="subscription-page__empty">
                                <p>
                                    {t('subscriptionPage.noPlans') ||
                                        'No subscription plans available at the moment.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* User's Premium Requests Section */}
                    {cookies.MegaBox && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="subscription-page__section subscription-page__subscribed-plans"
                        >
                            <h2 className="subscription-page__section-title">
                                {t('accountPremium.myRequestsTitle') || 'My Premium Requests'}
                            </h2>
                            {requestsLoading ? (
                                <div className="subscription-page__loading">
                                    <Loading />
                                </div>
                            ) : myRequests.length === 0 ? (
                                <div className="subscription-page__empty">
                                    <p>
                                        {t('accountPremium.noRequests') ||
                                            'You have not submitted any premium requests yet.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="subscription-page__plans">
                                    {myRequests.map((req) => (
                                        <div key={req._id} className="subscription-page__plan-card">
                                            <div className="subscription-page__plan-header">
                                                <h3 className="subscription-page__plan-title">
                                                    {req.plan?.name || req.planId}
                                                </h3>
                                                <span style={{ fontWeight: 600 }}>
                                                    {statusLabel(req.status)}
                                                </span>
                                            </div>
                                            <div className="subscription-page__plan-content">
                                                <p>
                                                    <strong>{t('accountPremium.paymentReference')}:</strong>{' '}
                                                    {req.paymentReference}
                                                </p>
                                                {req.note && (
                                                    <p>
                                                        <strong>{t('accountPremium.note')}:</strong> {req.note}
                                                    </p>
                                                )}
                                                <p>
                                                    <strong>{t('accountPremium.submittedOn')}:</strong>{' '}
                                                    {new Date(req.createdAt).toLocaleString()}
                                                </p>
                                                {req.reviewReason && (
                                                    <p>
                                                        <strong>{t('accountPremium.reviewReason')}:</strong>{' '}
                                                        {req.reviewReason}
                                                    </p>
                                                )}
                                                {req.invoiceUrl && (
                                                    <a
                                                        href={req.invoiceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {t('accountPremium.viewInvoice') || 'View Receipt'}
                                                    </a>
                                                )}
                                            </div>
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
                                        className="subscription-page__plan-button"
                                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
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
                                        className="subscription-page__plan-button"
                                        style={{ width: 'auto', padding: '0.5rem 1rem' }}
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
                </div>
            </div>

            {/* Terms Modal */}
            <TermsModal
                isOpen={showTermsModal}
                onClose={() => {
                    setShowTermsModal(false);
                    setSelectedPlan(null);
                }}
                onAccept={handleTermsAccept}
            />

            {/* Subscription Request Modal */}
            <AnimatePresence>
                {showSubscriptionModal && selectedPlan && (
                    <motion.div
                        className="subscription-page__modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isSubmitting && setShowSubscriptionModal(false)}
                    >
                        <motion.div
                            className="subscription-page__modal-content"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="subscription-page__modal-close"
                                onClick={() => !isSubmitting && setShowSubscriptionModal(false)}
                                disabled={isSubmitting}
                            >
                                <FaTimes />
                            </button>
                            <h3 className="subscription-page__modal-title">
                                {t('subscribe.modal.title') || 'Subscribe to Plan'}
                            </h3>
                            <p className="subscription-page__modal-subtitle">
                                {t('subscriptionPage.modal.selectedPlan') || 'Selected Plan'}:{' '}
                                <strong>{selectedPlan.name}</strong> (${selectedPlan.price})
                            </p>
                            <form onSubmit={handleSubscriptionSubmit} className="subscription-page__modal-form">
                                <div className="subscription-page__form-group">
                                    <label>
                                        <FaReceipt className="subscription-page__form-icon" />
                                        {t('accountPremium.paymentReference') || 'Payment Reference'} *
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={200}
                                        value={subscriptionForm.paymentReference}
                                        onChange={(e) =>
                                            setSubscriptionForm((prev) => ({
                                                ...prev,
                                                paymentReference: e.target.value,
                                            }))
                                        }
                                        required
                                        disabled={isSubmitting}
                                        placeholder={
                                            t('accountPremium.paymentReferencePlaceholder') ||
                                            'Transaction ID, transfer code, or receipt number'
                                        }
                                    />
                                </div>
                                <div className="subscription-page__form-group">
                                    <label>
                                        <FaStickyNote className="subscription-page__form-icon" />
                                        {t('accountPremium.note') || 'Note (optional)'}
                                    </label>
                                    <textarea
                                        rows={3}
                                        maxLength={500}
                                        value={subscriptionForm.note}
                                        onChange={(e) =>
                                            setSubscriptionForm((prev) => ({
                                                ...prev,
                                                note: e.target.value,
                                            }))
                                        }
                                        disabled={isSubmitting}
                                        placeholder={
                                            t('accountPremium.notePlaceholder') ||
                                            'Additional payment details or transfer method (optional)'
                                        }
                                    />
                                </div>
                                <div className="subscription-page__form-group">
                                    <label>
                                        <FaFileInvoice className="subscription-page__form-icon" />
                                        {t('accountPremium.invoiceImage') || 'Payment Receipt Image (optional)'}
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleFileChange}
                                        disabled={isSubmitting}
                                    />
                                    <small>{t('accountPremium.invoiceHint')}</small>
                                    {subscriptionForm.invoiceFile && (
                                        <span className="subscription-page__file-name">
                                            {subscriptionForm.invoiceFile.name}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="subscription-page__modal-submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? t('accountPremium.submitting') || 'Submitting...'
                                        : t('accountPremium.submitRequest') || 'Submit Premium Request'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </>
    );
}
