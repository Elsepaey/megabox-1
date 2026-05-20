import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useCookies } from 'react-cookie';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { FaTimes, FaBuilding, FaUser, FaEnvelope, FaPhone, FaGlobe } from 'react-icons/fa';
import './PartnerFormModal.scss';

const modalVariants = {
    hidden: {
        opacity: 0,
        scale: 0.8,
        y: 60
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    },
    exit: {
        opacity: 0,
        scale: 0.8,
        y: 60,
        transition: {
            duration: 0.2
        }
    }
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

export default function PartnerFormModal({ isOpen, onClose }) {
    const { t } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const [formData, setFormData] = useState({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        partnershipType: '',
        message: ''
    });

    // Fetch user data if logged in and populate form
    const fetchUserData = async () => {
        try {
            const response = await api.get('/users/profile', {
                headers: {
                    Authorization: `Bearer ${cookies.MegaBox}`
                }
            });
            const user = response.data.data;
            setFormData(prev => ({
                ...prev,
                email: user.email || prev.email,
                contactName: user.name || user.username || prev.contactName,
                phone: user.phone || prev.phone
            }));
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    useEffect(() => {
        if (isOpen && cookies.MegaBox) {
            fetchUserData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, cookies.MegaBox]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission here
        console.log('Form submitted:', formData);
        // You can add API call here
        onClose();
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

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
                                {t('partnerFormModal.title')}
                            </h2>
                            <p className="partner-form-modal__subtitle">
                                {t('partnerFormModal.subtitle')}
                            </p>
                        </div>
                        <button
                            className="partner-form-modal__close"
                            onClick={onClose}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="partner-form-modal__form">
                        <div className="partner-form-modal__field">
                            <label className="partner-form-modal__label">
                                <FaBuilding className="partner-form-modal__icon" />
                                {t('partnerFormModal.companyName')}
                            </label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                className="partner-form-modal__input"
                                required
                            />
                        </div>

                        <div className="partner-form-modal__field">
                            <label className="partner-form-modal__label">
                                <FaUser className="partner-form-modal__icon" />
                                {t('partnerFormModal.contactName')}
                            </label>
                            <input
                                type="text"
                                name="contactName"
                                value={formData.contactName}
                                onChange={handleChange}
                                className="partner-form-modal__input"
                                required
                            />
                        </div>

                        <div className="partner-form-modal__field">
                            <label className="partner-form-modal__label">
                                <FaEnvelope className="partner-form-modal__icon" />
                                {t('partnerFormModal.email')}
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="partner-form-modal__input"
                                required
                            />
                        </div>

                        <div className="partner-form-modal__field">
                            <label className="partner-form-modal__label">
                                <FaPhone className="partner-form-modal__icon" />
                                {t('partnerFormModal.phone')}
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="partner-form-modal__input"
                                required
                            />
                        </div>

                        <div className="partner-form-modal__field">
                            <label className="partner-form-modal__label">
                                <FaGlobe className="partner-form-modal__icon" />
                                {t('partnerFormModal.website')}
                            </label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="partner-form-modal__input"
                            />
                        </div>

                        <div className="partner-form-modal__field">
                            <label className="partner-form-modal__label">
                                {t('partnerFormModal.partnershipType')}
                            </label>
                            <select
                                name="partnershipType"
                                value={formData.partnershipType}
                                onChange={handleChange}
                                className="partner-form-modal__input"
                                required
                            >
                                <option value="">{t('partnerFormModal.selectType')}</option>
                                <option value="api">{t('partnersPage.partnershipTypes.api.title')}</option>
                                <option value="whiteLabel">{t('partnersPage.partnershipTypes.whiteLabel.title')}</option>
                                <option value="contentHosting">{t('partnersPage.partnershipTypes.contentHosting.title')}</option>
                                <option value="reseller">{t('partnersPage.partnershipTypes.reseller.title')}</option>
                            </select>
                        </div>

                        <div className="partner-form-modal__field">
                            <label className="partner-form-modal__label">
                                {t('partnerFormModal.message')}
                            </label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                className="partner-form-modal__textarea"
                                rows="4"
                                placeholder={t('partnerFormModal.messagePlaceholder')}
                            />
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
                                type="submit"
                                className="partner-form-modal__button partner-form-modal__button--submit"
                            >
                                {t('partnerFormModal.submit')}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>
    );
}

