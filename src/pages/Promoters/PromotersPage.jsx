import React, { useState, useEffect, useMemo, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { useLanguage } from '../../context/LanguageContext';
import { usePageSEO } from '../../hooks/usePageSEO';
import PartnerCTA from '../../components/PartnerCta/PartnerCta';
import api from '../../services/api';
import { FaShareAlt, FaUsers, FaDollarSign, FaChartLine, FaDownload, FaEye, FaUserPlus, FaCheckCircle, FaCloud, FaServer, FaCode, FaShieldAlt, FaLink, FaBullhorn, FaWallet } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import './PromotersPage.scss';

export default function PromotersPage() {
    const { t, language } = useLanguage();
    const swiperRef = useRef(null);
    const navigate = useNavigate();
    const [cookies] = useCookies(['MegaBox']);
    const [showPlansModal, setShowPlansModal] = useState(false);
    const [userData, setUserData] = useState(null);

    // Services data - memoized to prevent unnecessary re-renders
    const servicesData = useMemo(() => [
        {
            icon: <FaCloud />,
            title: t('partners.services.videoUploads.title'),
            desc: t('partners.services.videoUploads.desc'),
            color: 'indigo'
        },
        {
            icon: <FaServer />,
            title: t('partners.services.videoPlayer.title'),
            desc: t('partners.services.videoPlayer.desc'),
            color: 'purple'
        },
        {
            icon: <FaUsers />,
            title: t('partners.services.referrals.title'),
            desc: t('partners.services.referrals.desc'),
            color: 'blue'
        },
        {
            icon: <FaChartLine />,
            title: t('partners.services.viewEarnings.title'),
            desc: t('partners.services.viewEarnings.desc'),
            color: 'green'
        },
        {
            icon: <FaCode />,
            title: t('partners.services.analytics.title'),
            desc: t('partners.services.analytics.desc'),
            color: 'orange'
        },
        {
            icon: <FaShieldAlt />,
            title: t('partners.services.protection.title'),
            desc: t('partners.services.protection.desc'),
            color: 'red'
        }
    ], [t]);

    // SEO with custom hook
    const title = language === 'ar' 
        ? 'برنامج المروجين – اربح من مشاركة المنصة' 
        : 'Promoters Program – Earn by Sharing';
    const description = language === 'ar'
        ? 'انضم إلى برنامج المروجين واكسب من كل تسجيل ومشاهدة وتحميل. سجّل مجاناً وابدأ الربح اليوم.'
        : 'Join our promoters program and earn from every signup, view, and download. Register for free and start earning today.';
    const ogImage = language === 'ar' 
        ? '/images/og/promoters-ar.jpg' 
        : '/images/og/promoters-en.jpg';

    usePageSEO({ title, description, image: ogImage });

    // Fetch user data if logged in
    const fetchUserData = async () => {
        try {
            const response = await api.get('/users/profile', {
                headers: {
                    Authorization: `Bearer ${cookies.MegaBox}`
                }
            });
            setUserData(response.data.data);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    useEffect(() => {
        if (cookies.MegaBox) {
            fetchUserData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cookies.MegaBox]);

    // Reinitialize Swiper when language changes
    useEffect(() => {
        if (swiperRef.current) {
            swiperRef.current.update();
            swiperRef.current.updateSlides();
            swiperRef.current.updateSlidesClasses();
        }
    }, [language]);


    // Check if user is subscribed to any plan
    const isSubscribed = userData && (userData?.watchingplan || userData?.Downloadsplan);
    
    // Check if user is a promoter
    const isPromoter = userData && userData?.isPromoter === 'true';

    // Structured Data for SEO
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "description": description
    };

    // How It Works Steps
    const howItWorks = [
        {
            step: 1,
            title: t('promotersPage.howItWorks.step1.title'),
            desc: t('promotersPage.howItWorks.step1.desc'),
            icon: <FaLink />
        },
        {
            step: 2,
            title: t('promotersPage.howItWorks.step2.title'),
            desc: t('promotersPage.howItWorks.step2.desc'),
            icon: <FaBullhorn />
        },
        {
            step: 3,
            title: t('promotersPage.howItWorks.step3.title'),
            desc: t('promotersPage.howItWorks.step3.desc'),
            icon: <FaChartLine />
        },
        {
            step: 4,
            title: t('promotersPage.howItWorks.step4.title') || 'اسحب أرباحك',
            desc: t('promotersPage.howItWorks.step4.desc') || 'حلّق بالأرباح وسحبها بسهولة عبر لوحة التحكم الخاصة بيك.',
            icon: <FaWallet />
        }
    ];

    // Features
    const features = [
        {
            icon: <FaUserPlus />,
            title: t('promotersPage.features.freeSignup.title'),
            desc: t('promotersPage.features.freeSignup.desc')
        },
        {
            icon: <FaChartLine />,
            title: t('promotersPage.features.dashboard.title'),
            desc: t('promotersPage.features.dashboard.desc')
        },
        {
            icon: <FaEye />,
            title: t('promotersPage.features.trackViews.title'),
            desc: t('promotersPage.features.trackViews.desc')
        },
        {
            icon: <FaDownload />,
            title: t('promotersPage.features.trackDownloads.title'),
            desc: t('promotersPage.features.trackDownloads.desc')
        }
    ];

    // Rewards System
    const rewards = [
        {
            icon: FaEye,
            title: t('promotersPage.rewards.views.title'),
            desc: t('promotersPage.rewards.views.desc'),
            points: 25,
            gradient: 'from-indigo-500 to-indigo-600'
        },
        {
            icon: FaDownload,
            title: t('promotersPage.rewards.downloads.title'),
            desc: t('promotersPage.rewards.downloads.desc'),
            points: 50,
            gradient: 'from-indigo-600 to-indigo-700'
        },
        {
            icon: FaUserPlus,
            title: t('promotersPage.rewards.signups.title'),
            desc: t('promotersPage.rewards.signups.desc'),
            points: 75,
            gradient: 'from-indigo-700 to-indigo-800'
        }
    ];


    return (
        <>
            {/* Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />

            <div className="promoters-page">
                {/* Hero Section - Show welcome message if promoter, otherwise show regular hero */}
                {isPromoter ? (
                    <section className="promoters-hero promoters-hero--welcome">
                        <div className="promoters-hero__overlay"></div>
                        <div className="promoters-hero__container">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                className="promoters-hero__welcome-content"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                                    className="promoters-hero__welcome-icon"
                                >
                                    <FaCheckCircle />
                                </motion.div>
                                <motion.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                                    className="promoters-hero__welcome-title"
                                >
                                    {t('promotersPage.hero.welcome.title')}
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                                    className="promoters-hero__welcome-description"
                                >
                                    {t('promotersPage.hero.welcome.description')}
                                </motion.p>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                                    className="promoters-hero__welcome-actions"
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/Promoter/Earnings')}
                                        className="promoters-hero__button promoters-hero__button--primary"
                                    >
                                        {t('promotersPage.hero.welcome.viewDashboard')}
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/dashboard')}
                                        className="promoters-hero__button promoters-hero__button--secondary"
                                    >
                                        {t('promotersPage.hero.welcome.goToDashboard')}
                                    </motion.button>
                                </motion.div>
                            </motion.div>
                        </div>
                    </section>
                ) : (
                    <section className="promoters-hero">
                        <div className="promoters-hero__overlay"></div>
                        <div className="promoters-hero__container">
                            <motion.h1
                                initial={{ opacity: 0, y: -30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="promoters-hero__title"
                            >
                                {t('promotersPage.hero.title')}
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                                className="promoters-hero__description"
                            >
                                {t('promotersPage.hero.description')}
                            </motion.p>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                                className="promoters-hero__cta"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowPlansModal(true)}
                                    className="promoters-hero__button"
                                >
                                    {t('promotersPage.hero.cta')}
                                </motion.button>
                            </motion.div>
                        </div>
                    </section>
                )}

                {/* Services Section */}
                <section className="promoters-services">
                    <div className="promoters-services__container">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="promoters-services__title"
                        >
                            {t('partners.services.title') || t('promotersPage.services.title')}
                        </motion.h2>
                        <div className="promoters-services__swiper-wrapper">
                            <Swiper
                                ref={swiperRef}
                                modules={[Autoplay, FreeMode]}
                                spaceBetween={24}
                                slidesPerView="auto"
                                freeMode={true}
                                autoplay={{
                                    delay: 0,
                                    disableOnInteraction: false,
                                    pauseOnMouseEnter: true,
                                }}
                                speed={5000}
                                loop={true}
                                className="promoters-services__swiper"
                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                                onSwiper={(swiper) => {
                                    swiperRef.current = swiper;
                                }}
                            >
                                {servicesData.map((service, idx) => (
                                    <SwiperSlide key={idx} className="promoters-services__slide">
                                        <div className={`promoters-services__card promoters-services__card--${service.color}`}>
                                            <div className="promoters-services__icon">{service.icon}</div>
                                            <h3 className="promoters-services__card-title">{service.title}</h3>
                                            <p className="promoters-services__card-desc">{service.desc}</p>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="promoters-how">
                    <div className="promoters-how__container">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="promoters-how__header"
                        >
                            <h2 className="promoters-how__title">
                                {t('promotersPage.howItWorks.title')}
                            </h2>
                            <p className="promoters-how__subtitle">
                                {t('promotersPage.howItWorks.subtitle') || 'خطوات بسيطة وواضحة تخليك تجيب مستخدمين وتكسب من كل مشاهدة أو تحميل.'}
                            </p>
                        </motion.div>

                        {/* Desktop Timeline */}
                        <div className="promoters-how__desktop">
                            {/* Horizontal Timeline Line */}
                            <div className="promoters-how__timeline-line"></div>
                            
                            <div className="promoters-how__timeline-grid">
                                {howItWorks.map((item, idx) => (
                                    <motion.article
                                        key={item.step}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: idx * 0.12 }}
                                        className="promoters-how__timeline-item"
                                    >
                                        <div className="promoters-how__step-wrapper">
                                            <div className="promoters-how__step-circle">
                                                <div className="promoters-how__step-number">{item.step}</div>
                                            </div>
                                            <div className="promoters-how__icon-badge">
                                                {item.icon}
                                            </div>
                                        </div>
                                        <div className="promoters-how__card">
                                            <h3 className="promoters-how__card-title">{item.title}</h3>
                                            <p className="promoters-how__card-desc">{item.desc}</p>
                                        </div>
                                    </motion.article>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Stacked */}
                        <div className="promoters-how__mobile">
                            {howItWorks.map((item, idx) => (
                                <motion.div
                                    key={item.step}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.45, delay: idx * 0.08 }}
                                    className="promoters-how__mobile-item"
                                >
                                    <div className="promoters-how__mobile-step">
                                        <div className="promoters-how__mobile-number">{item.step}</div>
                                        {idx !== howItWorks.length - 1 && <div className="promoters-how__mobile-line"></div>}
                                    </div>
                                    <div className="promoters-how__mobile-content">
                                        <div className="promoters-how__mobile-icon">{item.icon}</div>
                                        <h4 className="promoters-how__mobile-title">{item.title}</h4>
                                        <p className="promoters-how__mobile-desc">{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="promoters-features">
                    <div className="promoters-features__divider"></div>
                    <div className="promoters-features__container">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="promoters-features__title"
                        >
                            {t('promotersPage.features.title')}
                        </motion.h2>
                        <div className={`promoters-features__grid promoters-features__grid--${language}`}>
                            {features.map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: language === 'ar' ? 40 : -40 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    whileHover={{ 
                                        scale: 1.08,
                                        transition: { duration: 0.15 }
                                    }}
                                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                                    className="promoters-features__card"
                                >
                                    <div className="promoters-features__header">
                                        <FaCheckCircle className="promoters-features__check-icon" />
                                        <h3 className="promoters-features__card-title">{feature.title}</h3>
                                    </div>
                                    <p className="promoters-features__card-desc">{feature.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Rewards System Section */}
                <section className="promoters-rewards">
                    <div className="promoters-rewards__divider"></div>
                    <div className="promoters-rewards__container">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="promoters-rewards__title"
                        >
                            {t('promotersPage.rewards.title')}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                            className="promoters-rewards__subtitle"
                        >
                            {t('promotersPage.rewards.subtitle')}
                        </motion.p>
                        <div className={`promoters-rewards__grid promoters-rewards__grid--${language}`}>
                            {rewards.map((reward, idx) => {
                                const IconComponent = reward.icon;
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        whileHover={{ scale: 1.06 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 12, delay: idx * 0.1 }}
                                        className={`promoters-rewards__card promoters-rewards__card--${idx + 1}`}
                                    >
                                    <div className="promoters-rewards__header">
                                        <div className="promoters-rewards__icon-wrapper">
                                            <IconComponent className="promoters-rewards__icon" />
                                        </div>
                                        <h3 className="promoters-rewards__card-title">{reward.title}</h3>
                                    </div>
                                    <p className="promoters-rewards__card-desc">{reward.desc}</p>
                                    <div className="promoters-rewards__points">
                                        <div className="promoters-rewards__progress-bar">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${reward.points}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1, delay: idx * 0.1 + 0.3 }}
                                                className="promoters-rewards__progress-fill"
                                            ></motion.div>
                                        </div>
                                    </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="promoters-cta">
                    <div className="promoters-cta__divider"></div>
                    <div className="promoters-cta__container">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="promoters-cta__content"
                        >
                            <h2 className="promoters-cta__title">
                                {t('promotersPage.cta.title')}
                            </h2>
                            <p className="promoters-cta__description">
                                {isSubscribed 
                                    ? (userData?.watchingplan && userData?.Downloadsplan 
                                        ? t('partners.subscribedBothPlans') || 'أنت مشترك في كلا الخطتين'
                                        : userData?.watchingplan 
                                            ? t('partners.subscribedViewsPlan') || 'أنت مشترك في خطة المشاهدات'
                                            : t('partners.subscribedDownloadsPlan') || 'أنت مشترك في خطة التحميلات'
                                    )
                                    : t('promotersPage.cta.description')
                                }
                            </p>
                            {!isSubscribed ? (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowPlansModal(true)}
                                    className="promoters-cta__button"
                                >
                                    {t('promotersPage.cta.button')}
                                </motion.button>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/Promoter/Earnings')}
                                    className="promoters-cta__button"
                                >
                                    {t('partners.seeDashboard')}
                                </motion.button>
                            )}
                        </motion.div>
                    </div>
                </section>

                {/* Promoter Plans Modal */}
                {showPlansModal && (
                    <div className="promoter-plans-modal__overlay" onClick={() => setShowPlansModal(false)}>
                        <div className="promoter-plans-modal__content" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="promoter-plans-modal__close"
                                onClick={() => setShowPlansModal(false)}
                            >
                                ×
                            </button>
                            <PartnerCTA isModal={true} onClose={() => setShowPlansModal(false)} />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

