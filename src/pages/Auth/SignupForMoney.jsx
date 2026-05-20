import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
import { RiEyeFill, RiEyeCloseLine } from "react-icons/ri";
import "./Auth.scss";
import { useNavigate } from "react-router-dom";
import Loading from "../../components/Loading/Loading";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from '../../context/LanguageContext';
import PrivacyTermsModal from '../../components/PrivacyTermsModal/PrivacyTermsModal';
import { privacyTermsService } from '../../services';

const SignupForMoney = ({ onLogin, onConfirmMail, loading, error, refCode }) => {
    const { t, language } = useLanguage();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [privacyPolicyVersion, setPrivacyPolicyVersion] = useState(null);

    const { getUserRole } = useAuth();

    // Fetch privacy policy version on component mount (like Flutter's onInit)
    useEffect(() => {
        const fetchPrivacyVersion = async () => {
            try {
                const data = await privacyTermsService.getPrivacyPolicy(language);
                if (data?.policy?.version) {
                    console.log('Privacy version fetched:', data.policy.version);
                    setPrivacyPolicyVersion(data.policy.version);
                }
            } catch (error) {
                console.warn('Failed to fetch privacy version:', error.message);
                // Version remains null if API fails, like Flutter
            }
        };

        fetchPrivacyVersion();
    }, [language]);

    const navigate = useNavigate()

    const initialValues = {
        username: "",
        email: "",
        password: "",
        confirmationPassword: "",
        acceptedPrivacy: false
    };

    const validationSchema = Yup.object({
        username: Yup.string()
            .required(t('auth.usernameRequired'))
            .min(3, t('auth.usernameMin')),
        email: Yup.string()
            .email(t('auth.invalidEmail'))
            .required(t('auth.required')),
        password: Yup.string()
            .required(t('auth.required'))
            .min(8, t('auth.passwordMin')),
        confirmationPassword: Yup.string()
            .required(t('auth.confirmPasswordRequired'))
            .oneOf([Yup.ref('password')], t('auth.passwordsMatch')),
        acceptedPrivacy: Yup.boolean()
            .oneOf([true], t('auth.privacyPolicyRequired'))
    });

    const handleSubmit = async (values, { setSubmitting, setErrors }) => {
        try {
            await onConfirmMail({ ...values, privacyPolicyVersion });
        } catch (err) {
            setErrors({ submit: err.message });
        } finally {
            setSubmitting(false);
        }
    };


    const [RoleLoading, setRoleLoading] = useState(true)

    useEffect(() => {
        const validateRef = async () => {
            setRoleLoading(true);

            if (refCode) {
                try {
                    const roleData = await getUserRole(refCode);

                    if (roleData) {
                        setRoleLoading(false);
                    } else {
                        navigate("/signup");
                    }
                } catch {
                    navigate("/signup");
                }
            } else {
                navigate("/signup");
            }
        };

        validateRef();
    }, [getUserRole, navigate, refCode]);


    if (RoleLoading) return <Loading />


    return (
        <div className="auth-container">
            <div className="auth-shape auth-shape--1" />
            <div className="auth-shape auth-shape--2" />
            <div className="auth-shape auth-shape--3" />
            <div className="auth-shape auth-shape--4" />
            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <motion.h2
                    className="auth-title"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    {t('auth.signUp')}
                </motion.h2>
                {error && (
                    <motion.div
                        className="auth-error"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {error}
                    </motion.div>
                )}
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ isSubmitting, errors }) => (
                        <Form className="auth-form">
                            <motion.div
                                className="auth-field"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            >
                                <label htmlFor="username">{t('auth.username')}</label>
                                <Field
                                    name="username"
                                    type="text"
                                    placeholder={t('auth.usernamePlaceholder')}
                                />
                                <ErrorMessage name="username" component="div" className="auth-error" />
                            </motion.div>
                            <motion.div
                                className="auth-field"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                            >
                                <label htmlFor="email">{t('auth.email')}</label>
                                <Field
                                    name="email"
                                    type="email"
                                    placeholder={t('auth.emailPlaceholder')}
                                />
                                <ErrorMessage name="email" component="div" className="auth-error" />
                            </motion.div>
                            <motion.div
                                className="auth-field"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                            >
                                <label htmlFor="password">{t('auth.password')}</label>
                                <Field
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t('auth.passwordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <RiEyeFill /> : <RiEyeCloseLine />}
                                </button>
                                <ErrorMessage name="password" component="div" className="auth-error" />
                            </motion.div>
                            <motion.div
                                className="auth-field"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                            >

                                <label htmlFor="confirmationPassword">{t('auth.confirmPassword')}</label>
                                <Field
                                    name="confirmationPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder={t('auth.confirmPasswordPlaceholder')}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <RiEyeFill /> : <RiEyeCloseLine />}
                                </button>
                                <ErrorMessage name="confirmationPassword" component="div" className="auth-error" />
                            </motion.div>
                            <motion.div
                                className="auth-field auth-privacy-checkbox"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.7 }}
                            >
                                <div className="privacy-checkbox-wrapper">
                                    <Field name="acceptedPrivacy">
                                        {({ field }) => (
                                            <>
                                                <div className="custom-checkbox-container">
                                                    <input
                                                        type="checkbox"
                                                        id="acceptedPrivacy"
                                                        {...field}
                                                        checked={field.value}
                                                        className="custom-checkbox-input"
                                                    />
                                                    <label htmlFor="acceptedPrivacy" className="custom-checkbox-label">
                                                        <span className="checkbox-box">
                                                            {field.value && (
                                                                <svg viewBox="0 0 16 16" className="checkbox-check">
                                                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                                                                </svg>
                                                            )}
                                                        </span>
                                                        <span className="checkbox-text">
                                                            {t('auth.iAgreeTo')}{' '}
                                                            <button
                                                                type="button"
                                                                className="privacy-link"
                                                                onClick={() => setShowPrivacyModal(true)}
                                                            >
                                                                {t('auth.privacyPolicy')}
                                                            </button>
                                                            {' & '}
                                                            <button
                                                                type="button"
                                                                className="privacy-link"
                                                                onClick={() => setShowPrivacyModal(true)}
                                                            >
                                                                {t('auth.termsOfService')}
                                                            </button>
                                                        </span>
                                                    </label>
                                                </div>
                                                <ErrorMessage name="acceptedPrivacy" component="div" className="auth-error" />
                                            </>
                                        )}
                                    </Field>
                                </div>
                            </motion.div>
                            {errors.submit && (
                                <motion.div
                                    className="auth-error"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {errors.submit}
                                </motion.div>
                            )}


                            <motion.button
                                className="auth-btn auth-btn-primary"
                                type="submit"
                                disabled={isSubmitting || loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {loading ? t('auth.loading') : t('auth.signUp')}
                            </motion.button>

                        </Form>
                    )}
                </Formik>



                <motion.div
                    className="auth-links"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                >
                    <span onClick={onLogin}>{t('auth.alreadyHaveAccount')} {t('auth.login')}</span>
                </motion.div>
            </motion.div>

            <PrivacyTermsModal
                isOpen={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
            />
        </div>
    );
};



export default SignupForMoney; 