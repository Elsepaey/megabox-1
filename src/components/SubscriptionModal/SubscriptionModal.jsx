import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useCookies } from 'react-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheck, FaPhone, FaUser, FaFileUpload, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { adminService, promoterService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import './SubscriptionModal.scss';

export default function SubscriptionModal({ isOpen, onClose, selectedPlan }) {
    const { t, language } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const queryClient = useQueryClient();
    const isRTL = language === 'ar';

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        paymentMethod: '',
        phone: '',
        subscriberName: '',
        invoiceFile: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: paymentServicesData, isLoading: servicesLoading } = useQuery(
        ['payment-services'],
        () => adminService.getPaymentServices(cookies.MegaBox),
        {
            enabled: isOpen && !!cookies.MegaBox,
            retry: false
        }
    );

    const paymentServices = paymentServicesData?.paymentServices || paymentServicesData?.services || [];
    const activeServices = paymentServices.filter(s => s.isActive !== false);

    useEffect(() => {
        if (isOpen) {
            setCurrentStep(1);
            setFormData({
                paymentMethod: '',
                phone: '',
                subscriberName: '',
                invoiceFile: null
            });
        }
    }, [isOpen]);

    const handleNext = () => {
        if (currentStep === 1 && !formData.paymentMethod) {
            toast.error(t('premium.modal.selectPaymentMethod') || 'Please select a payment method', ToastOptions('error'));
            return;
        }
        if (currentStep === 2) {
            if (!formData.phone) {
                toast.error(t('premium.modal.phoneRequired') || 'Phone number is required', ToastOptions('error'));
                return;
            }
            if (!formData.subscriberName) {
                toast.error(t('premium.modal.nameRequired') || 'Name is required', ToastOptions('error'));
                return;
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, invoiceFile: file }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.invoiceFile) {
            toast.error(t('premium.modal.uploadRequired') || 'Please upload payment receipt', ToastOptions('error'));
            return;
        }

        setIsSubmitting(true);
        try {
            await promoterService.createSubscription(
                formData.invoiceFile,
                formData.phone,
                formData.subscriberName,
                selectedPlan?.days || 30,
                selectedPlan?.name || 'Premium',
                cookies.MegaBox
            );

            queryClient.invalidateQueries(['userAccount']);
            queryClient.invalidateQueries(['premium-plans']);

            toast.success(
                t('premium.modal.success') || 'Subscription request submitted! Waiting for approval.',
                ToastOptions('success')
            );
            onClose();
        } catch (error) {
            console.error('Subscription error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPaymentServiceDetails = (service) => {
        const details = [];
        if (service.credentials?.phoneNumber) details.push(service.credentials.phoneNumber);
        if (service.credentials?.walletAddress) details.push(service.credentials.walletAddress);
        if (service.credentials?.email) details.push(service.credentials.email);
        if (service.credentials?.accountId) details.push(service.credentials.accountId);
        return details.join(' - ') || service.accountName || '';
    };

    const steps = [
        { number: 1, label: t('premium.modal.step1') || 'Payment' },
        { number: 2, label: t('premium.modal.step2') || 'Details' },
        { number: 3, label: t('premium.modal.step3') || 'Receipt' }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="subscription-modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSubmitting && onClose()}
            >
                <motion.div
                    className="subscription-modal"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="subscription-modal__close"
                        onClick={() => !isSubmitting && onClose()}
                        disabled={isSubmitting}
                    >
                        <FaTimes />
                    </button>

                    <h2 className="subscription-modal__title">
                        {t('premium.modal.title') || 'Subscribe to Premium'}
                    </h2>

                    {selectedPlan && (
                        <div className="subscription-modal__plan-info">
                            <span>{selectedPlan.name}</span>
                            <span className="subscription-modal__plan-price">
                                ${selectedPlan.price}
                            </span>
                        </div>
                    )}

                    <div className="subscription-modal__steps">
                        {steps.map((step, idx) => (
                            <div
                                key={step.number}
                                className={`subscription-modal__step ${currentStep >= step.number ? 'subscription-modal__step--active' : ''} ${currentStep > step.number ? 'subscription-modal__step--completed' : ''}`}
                            >
                                <div className="subscription-modal__step-number">
                                    {currentStep > step.number ? <FaCheck /> : step.number}
                                </div>
                                <span className="subscription-modal__step-label">{step.label}</span>
                                {idx < steps.length - 1 && <div className="subscription-modal__step-line" />}
                            </div>
                        ))}
                    </div>

                    <div className="subscription-modal__content">
                        {currentStep === 1 && (
                            <div className="subscription-modal__step-content">
                                <h3>{t('premium.modal.selectPaymentTitle') || 'Select Payment Method'}</h3>
                                {servicesLoading ? (
                                    <div className="subscription-modal__loading">
                                        {t('common.loading') || 'Loading...'}
                                    </div>
                                ) : activeServices.length > 0 ? (
                                    <div className="subscription-modal__payment-list">
                                        {activeServices.map((service) => (
                                            <label
                                                key={service._id || service.id}
                                                className={`subscription-modal__payment-item ${formData.paymentMethod === (service._id || service.id) ? 'subscription-modal__payment-item--selected' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value={service._id || service.id}
                                                    checked={formData.paymentMethod === (service._id || service.id)}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                                />
                                                <div className="subscription-modal__payment-info">
                                                    <span className="subscription-modal__payment-type">
                                                        {service.paymentType || service.type || 'Payment'}
                                                    </span>
                                                    <span className="subscription-modal__payment-details">
                                                        {getPaymentServiceDetails(service)}
                                                    </span>
                                                </div>
                                                <div className="subscription-modal__payment-check">
                                                    <FaCheck />
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="subscription-modal__empty">
                                        {t('premium.modal.noPaymentMethods') || 'No payment methods available'}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="subscription-modal__step-content">
                                <h3>{t('premium.modal.enterDetails') || 'Enter Your Details'}</h3>
                                <div className="subscription-modal__form-group">
                                    <label>
                                        <FaUser />
                                        {t('premium.modal.name') || 'Full Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.subscriberName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, subscriberName: e.target.value }))}
                                        placeholder={t('premium.modal.namePlaceholder') || 'Enter your name'}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="subscription-modal__form-group">
                                    <label>
                                        <FaPhone />
                                        {t('premium.modal.phone') || 'Phone Number'}
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder={t('premium.modal.phonePlaceholder') || 'Enter your phone number'}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="subscription-modal__step-content">
                                <h3>{t('premium.modal.uploadReceipt') || 'Upload Payment Receipt'}</h3>
                                <p className="subscription-modal__upload-desc">
                                    {t('premium.modal.uploadDesc') || 'Please upload a screenshot or photo of your payment confirmation'}
                                </p>
                                <div className="subscription-modal__upload-area">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={handleFileChange}
                                        id="receipt-upload"
                                        disabled={isSubmitting}
                                    />
                                    <label htmlFor="receipt-upload" className="subscription-modal__upload-label">
                                        <FaFileUpload />
                                        <span>
                                            {formData.invoiceFile
                                                ? formData.invoiceFile.name
                                                : (t('premium.modal.clickToUpload') || 'Click to upload receipt')}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="subscription-modal__actions">
                        {currentStep > 1 && (
                            <button
                                className="subscription-modal__btn subscription-modal__btn--secondary"
                                onClick={handleBack}
                                disabled={isSubmitting}
                            >
                                {isRTL ? <FaArrowRight /> : <FaArrowLeft />}
                                {t('common.back') || 'Back'}
                            </button>
                        )}
                        {currentStep < 3 ? (
                            <button
                                className="subscription-modal__btn subscription-modal__btn--primary"
                                onClick={handleNext}
                            >
                                {t('common.next') || 'Next'}
                                {isRTL ? <FaArrowLeft /> : <FaArrowRight />}
                            </button>
                        ) : (
                            <button
                                className="subscription-modal__btn subscription-modal__btn--primary"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? (t('common.submitting') || 'Submitting...')
                                    : (t('premium.modal.submit') || 'Submit')}
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
