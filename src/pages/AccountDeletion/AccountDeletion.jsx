import React, { useState } from "react";
import Footer from "../../components/Footer/Footer";
import { useLanguage } from "../../context/LanguageContext";
import { userService } from "../../services/userService";
import { useCookies } from "react-cookie";
import { toast } from "react-toastify";
import { ToastOptions } from "../../helpers/ToastOptions";
import './AccountDeletion.scss';

const AccountDeletion = () => {
    const { t, language } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestSubmitted, setRequestSubmitted] = useState(false);
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            toast.error(t('accountDeletion.errorEmailRequired'), ToastOptions("error"));
            return;
        }

        setIsSubmitting(true);
        try {
            // Token is optional - only send if user is logged in
            const token = cookies.MegaBox || null;
            await userService.requestAccountDeletion({ email, reason }, token);
            toast.success(t('accountDeletion.successMessage'), ToastOptions("success"));
            setRequestSubmitted(true);
        } catch (error) {
            toast.error(error.message || t('accountDeletion.errorMessage'), ToastOptions("error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <main className="AccountDeletion" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="deletion-container">
                    <div className="deletion-header">
                        <h1>{t('accountDeletion.title')}</h1>
                        <p className="app-name">{t('accountDeletion.appName')}</p>
                    </div>

                    <div className="deletion-content">
                        {!requestSubmitted ? (
                            <>
                                <div className="info-section">
                                    <h2>{t('accountDeletion.overview')}</h2>
                                    <p>{t('accountDeletion.overviewDesc')}</p>
                                </div>

                                <div className="steps-section">
                                    <h2>{t('accountDeletion.stepsTitle')}</h2>
                                    <ol className="steps-list">
                                        <li>{t('accountDeletion.step1')}</li>
                                        <li>{t('accountDeletion.step2')}</li>
                                        <li>{t('accountDeletion.step3')}</li>
                                        <li>{t('accountDeletion.step4')}</li>
                                    </ol>
                                </div>

                                <div className="data-section">
                                    <h2>{t('accountDeletion.dataTitle')}</h2>

                                    <div className="data-block">
                                        <h3>{t('accountDeletion.dataDeletedTitle')}</h3>
                                        <ul>
                                            <li>{t('accountDeletion.dataDeleted1')}</li>
                                            <li>{t('accountDeletion.dataDeleted2')}</li>
                                            <li>{t('accountDeletion.dataDeleted3')}</li>
                                            <li>{t('accountDeletion.dataDeleted4')}</li>
                                            <li>{t('accountDeletion.dataDeleted5')}</li>
                                        </ul>
                                    </div>

                                    <div className="data-block">
                                        <h3>{t('accountDeletion.dataRetainedTitle')}</h3>
                                        <ul>
                                            <li>{t('accountDeletion.dataRetained1')}</li>
                                            <li>{t('accountDeletion.dataRetained2')}</li>
                                        </ul>
                                    </div>

                                    <div className="retention-notice">
                                        <strong>{t('accountDeletion.retentionPeriod')}</strong>
                                        <p>{t('accountDeletion.retentionDesc')}</p>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h2>{t('accountDeletion.formTitle')}</h2>
                                    <p className="form-description">{t('accountDeletion.formDesc')}</p>

                                    <form onSubmit={handleSubmit} className="deletion-form">
                                        <div className="form-group">
                                            <label htmlFor="email">{t('accountDeletion.emailLabel')}</label>
                                            <input
                                                type="email"
                                                id="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder={t('accountDeletion.emailPlaceholder')}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="reason">{t('accountDeletion.reasonLabel')}</label>
                                            <textarea
                                                id="reason"
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder={t('accountDeletion.reasonPlaceholder')}
                                                rows="5"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className="submit-btn"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? t('accountDeletion.submitting') : t('accountDeletion.submitButton')}
                                        </button>
                                    </form>
                                </div>

                                <div className="contact-section">
                                    <h2>{t('accountDeletion.contactTitle')}</h2>
                                    <p>
                                        {t('accountDeletion.contactDesc')}{" "}
                                        <a href="mailto:support@megaboxapp.com">
                                            support@megaboxapp.com
                                        </a>
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="success-section">
                                <div className="success-icon">✓</div>
                                <h2>{t('accountDeletion.requestReceivedTitle')}</h2>
                                <p>{t('accountDeletion.requestReceivedDesc')}</p>
                                <p className="support-email">
                                    {t('accountDeletion.contactSupport')}{" "}
                                    <a href="mailto:support@megaboxapp.com">
                                        support@megaboxapp.com
                                    </a>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
};

export default AccountDeletion;
