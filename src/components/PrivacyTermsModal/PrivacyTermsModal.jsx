import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaShieldAlt } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import './PrivacyTermsModal.scss';

export default function PrivacyTermsModal({ isOpen, onClose }) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('privacy');

  // No need to fetch version here - parent component handles it on mount

  const renderPrivacyContent = () => {
    return (
      <div className="privacy-terms-modal__text-content">
        <div className="privacy-terms-modal__section">
          <h3 className="privacy-terms-modal__section-title">{t('privacy.title')}</h3>
          <p className="privacy-terms-modal__paragraph">{t('privacy.welcome')}</p>
          <p className="privacy-terms-modal__paragraph">{t('privacy.intro')}</p>
        </div>

        <div className="privacy-terms-modal__section">
          <h3 className="privacy-terms-modal__section-title">{t('privacy.principlesIntro')}</h3>
          <ul className="privacy-terms-modal__list">
            <li className="privacy-terms-modal__list-item">{t('privacy.principle1')}</li>
            <li className="privacy-terms-modal__list-item">{t('privacy.principle2')}</li>
            <li className="privacy-terms-modal__list-item">{t('privacy.principle3')}</li>
            <li className="privacy-terms-modal__list-item">{t('privacy.principle4')}</li>
            <li className="privacy-terms-modal__list-item">{t('privacy.principle5')}</li>
          </ul>
        </div>

        <div className="privacy-terms-modal__section">
          <h3 className="privacy-terms-modal__section-title">{t('privacy.infoCollectionTitle')}</h3>
          <p className="privacy-terms-modal__paragraph">{t('privacy.infoCollectionDesc')}</p>

          <div className="privacy-terms-modal__info-grid">
            <div className="privacy-terms-modal__info-item">
              <strong>{t('privacy.accountInfo')}</strong>
              <p>{t('privacy.accountInfoDesc')}</p>
            </div>
            <div className="privacy-terms-modal__info-item">
              <strong>{t('privacy.userContent')}</strong>
              <p>{t('privacy.userContentDesc')}</p>
            </div>
            <div className="privacy-terms-modal__info-item">
              <strong>{t('privacy.usageData')}</strong>
              <p>{t('privacy.usageDataDesc')}</p>
            </div>
            <div className="privacy-terms-modal__info-item">
              <strong>{t('privacy.deviceInfo')}</strong>
              <p>{t('privacy.deviceInfoDesc')}</p>
            </div>
          </div>
        </div>

        <div className="privacy-terms-modal__view-full">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="privacy-terms-modal__view-full-link"
          >
            {language === 'ar' ? 'عرض سياسة الخصوصية الكاملة' : 'View Full Privacy Policy'}
            <span className="privacy-terms-modal__external-icon">↗</span>
          </a>
        </div>
      </div>
    );
  };

  const renderTermsContent = () => {
    return (
      <div className="privacy-terms-modal__text-content">
        <div className="privacy-terms-modal__section">
          <p className="privacy-terms-modal__paragraph">{t('termsModal.welcomeText')}</p>
        </div>

        <div
          className="privacy-terms-modal__html-content"
          dangerouslySetInnerHTML={{ __html: t('termsModal.termsContent') }}
        />

        <div className="privacy-terms-modal__view-full">
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="privacy-terms-modal__view-full-link"
          >
            {language === 'ar' ? 'عرض شروط الخدمة الكاملة' : 'View Full Terms of Service'}
            <span className="privacy-terms-modal__external-icon">↗</span>
          </a>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="privacy-terms-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="privacy-terms-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="privacy-terms-modal__header">
            <div className="privacy-terms-modal__header-content">
              <div className="privacy-terms-modal__title-wrapper">
                <FaShieldAlt className="privacy-terms-modal__icon" />
                <h2 className="privacy-terms-modal__title">{t('auth.privacyAndTerms')}</h2>
              </div>
              <button
                className="privacy-terms-modal__close"
                onClick={onClose}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="privacy-terms-modal__tabs">
              <button
                className={`privacy-terms-modal__tab ${activeTab === 'privacy' ? 'privacy-terms-modal__tab--active' : ''}`}
                onClick={() => setActiveTab('privacy')}
              >
                {t('auth.privacyPolicy')}
              </button>
              <button
                className={`privacy-terms-modal__tab ${activeTab === 'terms' ? 'privacy-terms-modal__tab--active' : ''}`}
                onClick={() => setActiveTab('terms')}
              >
                {t('auth.termsOfService')}
              </button>
            </div>
          </div>

          <div className="privacy-terms-modal__content">
            {activeTab === 'privacy' ? renderPrivacyContent() : renderTermsContent()}
          </div>

          <div className="privacy-terms-modal__footer">
            <button
              className="privacy-terms-modal__button"
              onClick={onClose}
            >
              {t('auth.close') || 'Close'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
