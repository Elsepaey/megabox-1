import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCookies } from 'react-cookie';
import { useQuery } from 'react-query';
import { userService } from '../../services/api';
import { HiUserCircle, HiArrowRightOnRectangle, HiUserGroup, HiCurrencyDollar, HiBell, HiTv, HiSun, HiMoon, HiTicket } from 'react-icons/hi2';
import { FiGlobe } from 'react-icons/fi';
import { FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import './DashboardHeader.scss';

export default function DashboardHeader() {
    const { t, language, changeLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const [Token] = useCookies(['MegaBox']);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [profileImageError, setProfileImageError] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, left: 0 });
    const profileMenuRef = useRef(null);
    const profileButtonRef = useRef(null);
    const profileDropdownRef = useRef(null);
    const touchStartedRef = useRef(false);
    
    useEffect(() => {
        if (!profileMenuOpen) {
            touchStartedRef.current = false;
            return;
        }

        const handleClickOutside = (event) => {
            // If clicking dropdown or its children, do nothing
            if (
                profileDropdownRef.current && 
                profileDropdownRef.current.contains(event.target)
            ) {
                // Click is inside dropdown - don't close, let the link/button handle it
                return;
            }
            
            // Don't close if clicking the profile button
            if (
                profileButtonRef.current &&
                profileButtonRef.current.contains(event.target)
            ) {
                return;
            }
            
            // Close if clicking outside (on backdrop or anywhere else)
            setProfileMenuOpen(false);
            touchStartedRef.current = false;
        };

        const positionTimer = setTimeout(() => {
            if (profileButtonRef.current) {
                const rect = profileButtonRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                const dropdownHeight = 250;
                const dropdownWidth = 220;
                
                let top = rect.bottom + 8;
                let right = viewportWidth - rect.right;
                let left = rect.left;
                
                if (top + dropdownHeight > viewportHeight - 80) {
                    top = rect.top - dropdownHeight - 8;
                }
                
                if (language === 'ar') {
                    if (left + dropdownWidth > viewportWidth - 16) {
                        left = viewportWidth - dropdownWidth - 16;
                    }
                    if (left < 16) left = 16;
                } else {
                    if (right < 16) right = 16;
                    if (right + dropdownWidth > viewportWidth) {
                        right = viewportWidth - dropdownWidth - 16;
                    }
                }
                
                setDropdownPosition({
                    top: Math.max(8, top),
                    right: Math.max(8, right),
                    left: Math.max(8, left)
                });
            }
        }, 10);

        // Use bubble phase instead
        document.addEventListener('mousedown', handleClickOutside, false);
        document.addEventListener('touchstart', handleClickOutside, false);
        
        return () => {
            clearTimeout(positionTimer);
            document.removeEventListener('mousedown', handleClickOutside, false);
            document.removeEventListener('touchstart', handleClickOutside, false);
        };
    }, [profileMenuOpen, language]);

    const { data: userData } = useQuery(
        ['userAccount'],
        () => userService.getUserInfo(Token.MegaBox),
        {
            enabled: !!Token.MegaBox,
            retry: false
        }
    );
    
    const isPromoter = userData?.isPromoter === "true" || userData?.isPromoter === true;
    const isOwner = location.pathname.startsWith('/Owner');
    // Check actual role from userData (role can be "User", "Promoter", or "Owner")
    const userRole = userData?.role || null;
    // Promoter plan from the profile (`promoterPlan`: 'views' | 'installs').
    const hasAnyPlan = Boolean(userData?.promoterPlan);
    // Users with role "User" who have plans should see promoter-like menu items
    const isRegularUser = userRole === "User" && !isPromoter && !isOwner;
    const isUserWithPlan = isRegularUser && hasAnyPlan;
    
    const Logout = async () => {
        await logout();
        toast.success(t('common.logoutSuccess') || 'Logged out successfully', ToastOptions('success'));
        navigate('/login');
    };
    
    const toggleLanguage = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const newLang = language === 'en' ? 'ar' : 'en';
        changeLanguage(newLang);
    };



    // Don't show header on Files page since it has its own complete header
    if (location.pathname === '/dashboard/files' || location.pathname === '/Promoter/files') {
        return null;
    }

    return (
        <div className="files-header">
            <div className="files-header__container">
                <div className="files-header__content">
                    <Link to="/" className="files-header__left" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <svg
                            className="files-header__icon"
                            viewBox="0 0 48 48"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <linearGradient id="headerLogoGradient" x1="0" y1="0" x2="48" y2="48">
                                    <stop offset="0%" stopColor="var(--color-indigo-400)" />
                                    <stop offset="50%" stopColor="var(--color-indigo-500)" />
                                    <stop offset="100%" stopColor="var(--color-indigo-600)" />
                                </linearGradient>
                                <linearGradient id="headerLogoGradient2" x1="0" y1="0" x2="48" y2="48">
                                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.85)" />
                                </linearGradient>
                            </defs>
                            <rect width="48" height="48" rx="12" fill="url(#headerLogoGradient)" />
                            <path d="M24 12C18.5 12 14 16.5 14 22C14 22.5 14 23 14.1 23.5C12.3 24.2 11 25.8 11 27.5C11 29.7 12.8 31.5 15 31.5H33C35.2 31.5 37 29.7 37 27.5C37 25.8 35.7 24.2 33.9 23.5C34 23 34 22.5 34 22C34 16.5 29.5 12 24 12Z" fill="url(#headerLogoGradient2)" />
                            <rect x="16" y="16" width="16" height="16" rx="2.5" fill="var(--color-indigo-600)" opacity="0.95" />
                            <rect x="20" y="20" width="8" height="8" rx="1.5" fill="white" opacity="0.9" />
                            <line x1="16" y1="16" x2="16" y2="32" stroke="white" strokeWidth="2.5" opacity="0.8" />
                            <line x1="32" y1="16" x2="32" y2="32" stroke="white" strokeWidth="2.5" opacity="0.8" />
                            <line x1="16" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2.5" opacity="0.8" />
                            <line x1="16" y1="24" x2="32" y2="24" stroke="white" strokeWidth="2" opacity="0.6" />
                            <line x1="24" y1="16" x2="24" y2="32" stroke="white" strokeWidth="2" opacity="0.6" />
                        </svg>
                        <div className="files-header__text">
                            <h1 className="files-header__title">MegaBox</h1>
                        </div>
                    </Link>

                    <div className="files-header__actions">
                        <div className="files-header__profile-menu" ref={profileMenuRef}>
                            <button
                                ref={profileButtonRef}
                                className="files-header__profile-button"
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setProfileMenuOpen(!profileMenuOpen);
                                }}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    touchStartedRef.current = true;
                                    setProfileMenuOpen(!profileMenuOpen);
                                }}
                            >
                                {userData?.profilePic && typeof userData.profilePic === 'string' && userData.profilePic.trim() !== '' && !profileImageError ? (
                                    <img
                                        src={userData.profilePic}
                                        alt="Profile"
                                        className="files-header__profile-image"
                                        onError={() => setProfileImageError(true)}
                                    />
                                ) : (
                                    <div className="files-header__profile-placeholder">
                                        <FaUser className="files-header__profile-icon" />
                                    </div>
                                )}
                            </button>
                            
                            {profileMenuOpen && (
                                <>
                                    <div 
                                        className="files-header__profile-backdrop"
                                        // SIMPLIFIED: Just close on backdrop click
                                        onMouseDown={(e) => {
                                            // Only close if clicking backdrop directly
                                            if (e.target === e.currentTarget) {
                                                setProfileMenuOpen(false);
                                            }
                                        }}
                                        onTouchStart={(e) => {
                                            // Only close if touching backdrop directly
                                            if (e.target === e.currentTarget) {
                                                setProfileMenuOpen(false);
                                            }
                                        }}
                                    />
                                    <div 
                                        ref={profileDropdownRef}
                                        className="files-header__profile-dropdown"
                                        style={{
                                            position: 'fixed',
                                            top: `${dropdownPosition.top}px`,
                                            ...(language === 'ar' 
                                                ? { left: `${dropdownPosition.left}px`, right: 'auto' }
                                                : { right: `${dropdownPosition.right}px`, left: 'auto' }
                                            ),
                                        }}
                                        // Let child elements handle their own events
                                    >
                                        <Link
                                            to={(isPromoter || isUserWithPlan) ? '/Promoter/profile' : '/dashboard/profile'}
                                            className="files-header__profile-item"
                                            // SIMPLIFIED click handler
                                            onClick={() => setProfileMenuOpen(false)}
                                        >
                                            <HiUserCircle className="files-header__profile-item-icon" />
                                            <span>{t("sidenav.profile")}</span>
                                        </Link>
                                        
                                        {!isOwner && (
                                            <Link
                                                to={(isPromoter || isUserWithPlan) ? '/Promoter/notifications' : '/dashboard/notifications'}
                                                className="files-header__profile-item"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                <HiBell className="files-header__profile-item-icon" />
                                                <span>{t("sidenav.notifications")}</span>
                                            </Link>
                                        )}
                                        
                                        {/* Channels - only for regular users without plans */}
                                        {!isOwner && !isPromoter && !isUserWithPlan && (
                                            <Link
                                                to="/dashboard/channels"
                                                className="files-header__profile-item"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                <HiTv className="files-header__profile-item-icon" />
                                                <span>{t("sidenav.channels") || "Channels"}</span>
                                            </Link>
                                        )}
                                        
                                        {/* Partners - for regular users without plans */}
                                        {!isOwner && !isPromoter && !isUserWithPlan && (
                                            <Link
                                                to="/Partners"
                                                className="files-header__profile-item"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                <HiUserGroup className="files-header__profile-item-icon" />
                                                <span>{t("sidenav.partners") || "Partners"}</span>
                                            </Link>
                                        )}
                                        
                                        {/* Subscribe - for regular users without plans */}
                                        {!isOwner && !isPromoter && !isUserWithPlan && (
                                            <Link
                                                to="/Subscribe"
                                                className="files-header__profile-item"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                <HiCurrencyDollar className="files-header__profile-item-icon" />
                                                <span>{t("sidenav.subscribe") || "Subscribe"}</span>
                                            </Link>
                                        )}
                                        
                                        {/* Subscribe - for promoters OR users with plans */}
                                        {!isOwner && (isPromoter || isUserWithPlan) && (
                                            <Link
                                                to="/Subscribe"
                                                className="files-header__profile-item"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                <HiTicket className="files-header__profile-item-icon" />
                                                <span>{t("sidenav.subscription") || "Subscription"}</span>
                                            </Link>
                                        )}
                                        
                                        {/* Partners Center - for promoters OR users with plans */}
                                        {!isOwner && (isPromoter || isUserWithPlan) && (
                                            <Link
                                                to="/Partners"
                                                className="files-header__profile-item"
                                                onClick={() => setProfileMenuOpen(false)}
                                            >
                                                <HiUserGroup className="files-header__profile-item-icon" />
                                                <span>{t("sidenav.partners") || "Partners Center"}</span>
                                            </Link>
                                        )}
                                        
                                        <button
                                            type="button"
                                            className="files-header__profile-item"
                                            onClick={() => {
                                                toggleTheme();
                                                setProfileMenuOpen(false);
                                            }}
                                        >
                                            {theme === 'light' ? (
                                                <HiMoon className="files-header__profile-item-icon" />
                                            ) : (
                                                <HiSun className="files-header__profile-item-icon" />
                                            )}
                                            <span>{theme === 'light' ? (t("navbar.darkMode") || "Dark Mode") : (t("navbar.lightMode") || "Light Mode")}</span>
                                        </button>
                                        
                                        <button
                                            type="button"
                                            className="files-header__profile-item"
                                            onClick={(e) => {
                                                toggleLanguage(e);
                                                setProfileMenuOpen(false);
                                            }}
                                        >
                                            <FiGlobe className="files-header__profile-item-icon" />
                                            <span>{language === 'en' ? t("navbar.arabic") : t("navbar.english")}</span>
                                        </button>
                                        
                                        <button
                                            type="button"
                                            className="files-header__profile-item"
                                            onClick={() => {
                                                Logout();
                                                setProfileMenuOpen(false);
                                            }}
                                        >
                                            <HiArrowRightOnRectangle className="files-header__profile-item-icon" />
                                            <span>{t("sidenav.logout")}</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

