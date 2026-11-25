import { Link, useNavigate } from 'react-router-dom'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import './Hero.scss'
import { useCookies } from 'react-cookie';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import { useState } from 'react';

const Hero = () => {

  const [MegaBox] = useCookies(['MegaBox']);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoadingAppLink, setIsLoadingAppLink] = useState(false);

  const HandleMainNavigate = () => {

    if (MegaBox.MegaBox) {
      navigate("/dashboard/profile")
    } else {
      navigate("/signup")
    }

  }

  // Helper function to detect user's platform
  const detectPlatform = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Check for Android
    if (/android/i.test(userAgent)) {
      return 'android';
    }
    
    // Check for iOS
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'ios';
    }
    
    // Default to android if platform cannot be detected
    return 'android';
  };

  const handleDownloadClick = async () => {
    setIsLoadingAppLink(true);
    try {
      const response = await authService.getAppLink();
      const appLinks = response?.appLinks || {};
      const userPlatform = detectPlatform();

      let appLink = null;
      if (userPlatform === 'ios') {
        appLink = appLinks.appStore || appLinks.playStore || appLinks.web || null;
      } else {
        appLink = appLinks.playStore || appLinks.appStore || appLinks.web || null;
      }

      if (appLink) {
        const successMessage = response?.message || t('hero.downloadSuccess') || 'App link retrieved successfully';
        toast.success(successMessage, ToastOptions("success"));
        window.open(appLink, '_blank', 'noopener,noreferrer');
      } else {
        toast.error(t('hero.downloadError') || 'App download link not found', ToastOptions("error"));
      }
    } catch {
      scrollToSection('pricing');
    } finally {
      setIsLoadingAppLink(false);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  return (
    <section className="hero">
      <div className="hero__background" />
      <div className="hero__floating-elements">
        <div className="hero__floating-icon hero__floating-icon--1">☁️</div>
        <div className="hero__floating-icon hero__floating-icon--2">📁</div>
        <div className="hero__floating-icon hero__floating-icon--3">💾</div>
        <div className="hero__floating-icon hero__floating-icon--4">🔒</div>
        <div className="hero__floating-icon hero__floating-icon--5">📊</div>
        <div className="hero__floating-icon hero__floating-icon--6">⚡</div>
      </div>
      <div className="hero__container">
        <div className="hero__content">
          <motion.div
            className="hero__text-content"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1
              className="hero__title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {t('hero.title')}
            </motion.h1>
            <motion.p
              className="hero__description"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t('hero.description')}
            </motion.p>
            <motion.div
              className="hero__buttons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <button onClick={HandleMainNavigate} className="hero__button hero__button--primary">
                {t('hero.getStarted')}
              </button>
              <button
                onClick={handleDownloadClick}
                className="hero__button hero__button--secondary"
                disabled={isLoadingAppLink}
              >
                {isLoadingAppLink 
                  ? (t('hero.downloading') || 'Loading...') 
                  : t('hero.download')
                }
              </button>
            </motion.div>
            <motion.p
              className="hero__footer-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              {t('hero.footer')}
            </motion.p>
          </motion.div>

          <motion.div
            className="hero__illustration"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="hero__3d-character">
              {/* Place your 3D cloud robot character image here */}
              <div className="hero__character-placeholder">
                <div className="hero__cloud-head">☁️</div>
                <div className="hero__cloud-body"></div>
              </div>
            </div>
            <div className="hero__floating-badges">
              <div className="hero__badge hero__badge--1">
                <span className="hero__badge-icon">🔒</span>
                <span className="hero__badge-text">Secure</span>
              </div>
              <div className="hero__badge hero__badge--2">
                <span className="hero__badge-icon">📁</span>
                <span className="hero__badge-text">1024G</span>
              </div>
              <div className="hero__badge hero__badge--3">
                <span className="hero__badge-icon">⚡</span>
                <span className="hero__badge-text">Fast</span>
              </div>
              <div className="hero__badge hero__badge--4">
                <span className="hero__badge-icon">💾</span>
                <span className="hero__badge-text">Cloud</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <div className="hero__shape hero__shape--1" />
      <div className="hero__shape hero__shape--2" />
      <div className="hero__shape hero__shape--3" />
      <div className="hero__shape hero__shape--4" />
      <div className="hero__shape hero__shape--5" />
      <div className="hero__shape hero__shape--6" />
      <div className="hero__shape hero__shape--7" />
      <div className="hero__shape hero__shape--8" />
      <div className="hero__shape hero__shape--9" />
      <div className="hero__shape hero__shape--10" />
      <div className="hero__shape hero__shape--11" />
      <div className="hero__shape hero__shape--12" />
    </section>
  )
}

export const HeroForSubscription = () => {
  const { t } = useLanguage();

  return (
    <section className="HeroForSubscription">
      <div className="hero__background" />
      <div className="hero__floating-elements">
        <div className="hero__floating-icon hero__floating-icon--1">☁️</div>
        <div className="hero__floating-icon hero__floating-icon--2">📁</div>
        <div className="hero__floating-icon hero__floating-icon--3">💾</div>
        <div className="hero__floating-icon hero__floating-icon--4">🔒</div>
        <div className="hero__floating-icon hero__floating-icon--5">📊</div>
        <div className="hero__floating-icon hero__floating-icon--6">⚡</div>
      </div>
      <div className="hero__container">
        <motion.h1
          className="hero__title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {t('hero.title')}
        </motion.h1>
        <motion.p
          className="hero__description p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {t('hero.description')}
        </motion.p>
      </div>

      {/* Shapes */}
      {[...Array(12)].map((_, index) => (
        <div
          key={index}
          className={`hero__shape hero__shape--${index + 1}`}
        />
      ))}
    </section>
  );
};




export const HeroForAboutUs = () => {
  return (
    <section className="relative bg-indigo-800 HeroForAboutUs py-12 md:py-20 overflow-hidden">
      {[...Array(12)].map((_, index) => (
        <div
          key={index}
          className={`hero__shape hero__shape--${index + 1}`}
        />
      ))}

      <div className="container mx-auto flex justify-center items-center gap-10 px-6 md:px-8">
        <motion.div
          className="w-full md:w-1/2 space-y-4 text-center"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            About{" "}
            <span className="text-indigo-300">Mega Box</span>
          </h1>
          <p className="text-gray-200 text-lg">
            Mega Box is your secure and reliable solution to upload, organize,
            and store your data effortlessly. Whether you’re an individual or a team,
            our platform empowers you to keep your files safe and accessible
            anytime, anywhere.
          </p>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero