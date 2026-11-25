import React, { useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../../components/Footer/Footer";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { userService } from "../../services/userService";
import { useCookies } from "react-cookie";
import { toast } from "react-toastify";
import { ToastOptions } from "../../helpers/ToastOptions";
import './AccountDeletion.scss';

const AccountDeletion = () => {
    const { t, language } = useLanguage();
    const { logout } = useAuth();
    const [cookies] = useCookies(['MegaBox']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requestSubmitted, setRequestSubmitted] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const isAuthenticated = Boolean(cookies.MegaBox);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAuthenticated) {
            toast.error(t('filesV2.accountCloseLoginRequired') || 'Please log in to close your account.', ToastOptions("error"));
            return;
        }

        if (!confirmed) {
            toast.error(t('filesV2.accountCloseConfirmRequired') || 'Please confirm that you want to close your account.', ToastOptions("error"));
            return;
        }

        setIsSubmitting(true);
        try {
            await userService.requestAccountDeletion({}, cookies.MegaBox);
            toast.success(t('accountDeletion.successMessage'), ToastOptions("success"));
            await logout();
            setRequestSubmitted(true);
        } catch (error) {
            toast.error(error?.message || t('accountDeletion.errorMessage'), ToastOptions("error"));
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
                                    <p className="form-description">
                                        {t('filesV2.accountCloseWarning') || 'Submitting this form immediately closes your currently signed-in MegaBox account and signs you out.'}
                                    </p>

                                    {!isAuthenticated ? (
                                        <div className="login-required-box">
                                            <p>
                                                {t('filesV2.accountCloseLoginRequired') || 'You must be signed in to close your account.'}
                                            </p>
                                            <Link to="/login" className="submit-btn" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none', marginTop: '12px' }}>
                                                {t('common.login') || 'Log in'}
                                            </Link>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="deletion-form">
                                            <div className="form-group">
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={confirmed}
                                                        onChange={(e) => setConfirmed(e.target.checked)}
                                                        required
                                                    />
                                                    <span>
                                                        {t('filesV2.accountCloseConfirmLabel') || 'I understand this will close my signed-in account immediately.'}
                                                    </span>
                                                </label>
                                            </div>

                                            <button
                                                type="submit"
                                                className="submit-btn"
                                                disabled={isSubmitting || !confirmed}
                                            >
                                                {isSubmitting ? t('accountDeletion.submitting') : t('accountDeletion.submitButton')}
                                            </button>
                                        </form>
                                    )}
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
