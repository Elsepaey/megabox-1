import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { HiX } from "react-icons/hi";
import { HiComputerDesktop, HiCloud } from "react-icons/hi2";
import { PreventFunction } from '../../../helpers/Prevent';
import { useLanguage } from '../../../context/LanguageContext';
import { useCookies } from 'react-cookie';
import { authService } from '../../../services/authService';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../../helpers/ToastOptions';
import './UploadOptions.scss';

export default function UploadOptions({ onClose, onSelectDesktop, onSelectMegaBox, isPromoter = false }) {
    const { t } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const [isLoadingAppLink, setIsLoadingAppLink] = useState(false);

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

    const handleMegaBoxClick = async () => {
        if (onSelectMegaBox) {
            onSelectMegaBox();
            onClose();
            return;
        }
        if (isPromoter) {
            // For promoters, get app link and redirect to download
            setIsLoadingAppLink(true);
            try {
                const response = await authService.getAppLink(cookies.MegaBox);
                
                // Handle new response structure with links array
                let appLink = null;
                
                if (response?.links && Array.isArray(response.links) && response.links.length > 0) {
                    // Get active links only
                    const activeLinks = response.links.filter(link => link.isActive);
                    
                    if (activeLinks.length > 0) {
                        // Try to find link matching user's platform
                        const userPlatform = detectPlatform();
                        const platformLink = activeLinks.find(link => 
                            link.platform?.toLowerCase() === userPlatform
                        );
                        
                        // Use platform-specific link if found, otherwise use first active link
                        appLink = platformLink?.link || activeLinks[0]?.link;
                    }
                } else {
                    // Fallback to old response structure
                    appLink = response?.appLink || response?.link || response?.url || 
                             response?.data?.appLink || response?.data?.link || response?.data?.url;
                }
                
                if (appLink) {
                    // Show success toast with message from response if available
                    const successMessage = response?.message || t('uploadOptions.appLinkSuccess') || 'App link retrieved successfully';
                    toast.success(successMessage, ToastOptions("success"));
                    
                    // Open the link in a new window
                    window.open(appLink, '_blank');
                    onClose();
                } else {
                    toast.error(t('uploadOptions.appLinkNotFound') || 'App download link not found', ToastOptions("error"));
                }
            } catch (error) {
                toast.error(error.response?.data?.message || error.message || t('uploadOptions.appLinkError') || 'Failed to get app download link', ToastOptions("error"));
            } finally {
                setIsLoadingAppLink(false);
            }
        } else {
            onClose();
        }
    };

    return (
        <motion.div 
            className='UploadOptions_backdrop' 
            onClick={onClose} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.3, ease: 'linear' }} 
            exit={{ opacity: 0 }}
        >
            <motion.div 
                className="UploadOptions_modal"
                onClick={PreventFunction} 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: 20, opacity: 0 }} 
                transition={{ duration: 0.4, type: 'spring' }}
            >
                <HiX 
                    className='UploadOptions_close' 
                    onClick={onClose}
                />

                <div className="UploadOptions_header">
                    <h2 className="UploadOptions_title">{t("uploadOptions.title")}</h2>
                    <p className="UploadOptions_subtitle">{t("uploadOptions.subtitle")}</p>
                </div>

                <div className="UploadOptions_options">
                    <button
                        className="UploadOptions_option"
                        onClick={() => {
                            onSelectDesktop();
                            onClose();
                        }}
                    >
                        <div className="UploadOptions_option_icon">
                            <HiComputerDesktop />
                        </div>
                        <div className="UploadOptions_option_content">
                            <h3 className="UploadOptions_option_title">{t("uploadOptions.fromDesktop")}</h3>
                            <p className="UploadOptions_option_desc">{t("uploadOptions.fromDesktopDesc")}</p>
                        </div>
                    </button>

                    {(onSelectMegaBox || isPromoter) && (
                        <button
                            className="UploadOptions_option"
                            onClick={handleMegaBoxClick}
                            disabled={isLoadingAppLink}
                        >
                            <div className="UploadOptions_option_icon">
                                <HiCloud />
                            </div>
                            <div className="UploadOptions_option_content">
                                <h3 className="UploadOptions_option_title">
                                    {onSelectMegaBox
                                        ? (t("filesV2.copyFromMegaBoxTitle") || t("uploadOptions.fromMegaBox") || "Copy from MegaBox")
                                        : t("uploadOptions.fromMegaBox")}
                                </h3>
                                <p className="UploadOptions_option_desc">
                                    {onSelectMegaBox
                                        ? (t("filesV2.copyFromMegaBoxDesc") || "Copy existing files from your MegaBox drive")
                                        : isLoadingAppLink
                                            ? (t("uploadOptions.loadingAppLink") || "Loading...")
                                            : (t("uploadOptions.fromMegaBoxDesc") || "Download MegaBox app to upload files")
                                    }
                                </p>
                            </div>
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

