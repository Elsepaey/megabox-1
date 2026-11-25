import { useState, useEffect, useRef } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiMenu, FiX, FiGlobe } from 'react-icons/fi'
import './Navbar.scss'
import { useCookies } from 'react-cookie'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { toast } from 'react-toastify'
import { ToastOptions } from '../../helpers/ToastOptions'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import { isStaffRole } from '../../utils/roles'

const Navbar = () => {

  const { pathname } = useLocation();
  const { language, changeLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        // Check if click is not on the hamburger button
        const hamburgerButton = event.target.closest('.navbar__mobile-button');
        if (!hamburgerButton) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const [MegaBox] = useCookies(["MegaBox"])

  // Only show Partners tab when user is logged in
  const menuItems = MegaBox.MegaBox ? [
    { label: t('navbar.partners'), to: '/Partners' },
    // { label: 'Feedback', to: '/Feedback' },
  ] : []

  const toggleLanguage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newLang = language === 'en' ? 'ar' : 'en';
    changeLanguage(newLang);
  }

  const { UserRole, logout } = useAuth();
  const navigate = useNavigate();

  const DashboardTravel = () => {
    if (isStaffRole(UserRole)) {
      navigate("/Owner")
    } else {
      navigate("/dashboard")
    }
  }

  const handleLogout = async () => {
    await logout();
    toast.success(t('common.logoutSuccess') || 'Logged out successfully', ToastOptions('success'));
    navigate('/');
  }


  if (pathname === "/copyright-feedback")
    return null

  return (
    <nav className={`navbar${isOpen ? ' navbar--menu-open' : ''}`}>
      <div className="navbar__container">

        <Link to="/" className="navbar__logo">
          <svg 
            className="navbar__logo-icon" 
            viewBox="0 0 48 48" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="logoGradient" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stopColor="var(--color-indigo-400)"/>
                <stop offset="50%" stopColor="var(--color-indigo-500)"/>
                <stop offset="100%" stopColor="var(--color-indigo-600)"/>
              </linearGradient>
              <linearGradient id="logoGradient2" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)"/>
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.85)"/>
              </linearGradient>
            </defs>
            {/* Background with rounded corners */}
            <rect width="48" height="48" rx="12" fill="url(#logoGradient)"/>
            {/* Cloud shape - even larger */}
            <path d="M24 12C18.5 12 14 16.5 14 22C14 22.5 14 23 14.1 23.5C12.3 24.2 11 25.8 11 27.5C11 29.7 12.8 31.5 15 31.5H33C35.2 31.5 37 29.7 37 27.5C37 25.8 35.7 24.2 33.9 23.5C34 23 34 22.5 34 22C34 16.5 29.5 12 24 12Z" fill="url(#logoGradient2)"/>
            {/* Box/Storage icon - even larger */}
            <rect x="16" y="16" width="16" height="16" rx="2.5" fill="var(--color-indigo-600)" opacity="0.95"/>
            <rect x="20" y="20" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/>
            {/* Decorative lines - thicker */}
            <line x1="16" y1="16" x2="16" y2="32" stroke="white" strokeWidth="2.5" opacity="0.8"/>
            <line x1="32" y1="16" x2="32" y2="32" stroke="white" strokeWidth="2.5" opacity="0.8"/>
            <line x1="16" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2.5" opacity="0.8"/>
            {/* Additional detail lines */}
            <line x1="16" y1="24" x2="32" y2="24" stroke="white" strokeWidth="2" opacity="0.6"/>
            <line x1="24" y1="16" x2="24" y2="32" stroke="white" strokeWidth="2" opacity="0.6"/>
          </svg>
          <span className="navbar__logo-text">MegaBox</span>
        </Link>

        <div className="navbar__spacer" />

        <ul className="navbar__menu">
          {menuItems.map((item) => (
            <li key={item.label}>
              <Link to={item.to} className={`navbar__item ${item.to === pathname && "ActiveLink"}`}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="navbar__right-section">
          <div className="navbar__theme-wrapper">
            <ThemeToggle />
          </div>
          <div className="navbar__language-wrapper">
            <button 
              className="navbar__language-button" 
              aria-label={t('navbar.language')}
              onClick={toggleLanguage}
              title={language === 'en' ? t('navbar.switchToArabic') : t('navbar.switchToEnglish')}
              type="button"
            >
              <FiGlobe size={24} />
              <span className="navbar__language-code">{language.toUpperCase()}</span>
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              className="navbar__mobile-button"
              onClick={() => setIsOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu size={28} />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  ref={mobileMenuRef}
                  className="navbar__mobile-menu"
                  initial={{ opacity: 0, x: language === 'ar' ? '-100%' : '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: language === 'ar' ? '-100%' : '100%' }}
                  transition={{ duration: 0.3 }}
                >
                  <ul className="navbar__menu">
              {menuItems.map((item, idx) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, delay: idx * 0.08 }}
                >
                  <Link
                    to={item.to}
                    className="navbar__item"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
              {!MegaBox.MegaBox ? (
                <motion.li
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, delay: menuItems.length * 0.08 }}
                >
                  <Link
                    to="/login"
                    className="navbar__item"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('navbar.login')}
                  </Link>
                </motion.li>
              ) : (
                <>
                  <motion.li
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, delay: menuItems.length * 0.08 }}
                  >
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        DashboardTravel();
                      }}
                      className="navbar__item"
                    >
                      {t('navbar.dashboard')}
                    </button>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, delay: (menuItems.length + 1) * 0.08 }}
                  >
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="navbar__item"
                    >
                      {t('navbar.logout')}
                    </button>
                  </motion.li>
                </>
              )}
            </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!MegaBox.MegaBox ? (
            <Link to="/login" className="navbar__login-button">
              {t('navbar.login')}
            </Link>
          ) : (
            <>
              <button onClick={DashboardTravel} className="navbar__login-button">
                {t('navbar.dashboard')}
              </button>
              <button onClick={handleLogout} className="navbar__login-button navbar__logout-button">
                {t('navbar.logout')}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar 