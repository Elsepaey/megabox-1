import React, { useState, useRef, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api, userService, fileService } from '../../services/api';
import { premiumService } from '../../services/premiumService';
import { toast } from 'react-toastify';
import { FaCamera, FaTrash, FaEdit, FaSave, FaTimes, FaCrown, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { ToastOptions } from '../../helpers/ToastOptions';
import './Profile.scss';
import { useCookies } from 'react-cookie';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

function formatMbToGb(mb) {
    const val = Number(mb) || 0;
    return (val / 1024).toFixed(2);
}

export default function Profile() {
    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [imageError, setImageError] = useState(false);
    const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
    const [loggingOutAll, setLoggingOutAll] = useState(false);
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();
    const [Token] = useCookies(['MegaBox']);
    const { t, language } = useLanguage();
    const { UserRole, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isOwnerPath = location.pathname.startsWith('/Owner');
    const isStaffFromRole = UserRole === 'Owner' || UserRole === 'Admin';

    // Fetch user profile
    const { data: userData, isLoading, error: userError, refetch } = useQuery(
        'userProfile',
        () => userService.getUserInfo(Token.MegaBox),
        {
            enabled: !!Token.MegaBox,
            onSuccess: () => {
                setImageError(false);
            },
            onError: () => {
                toast.error(t('profile.errorLoading') || 'Failed to fetch user data', ToastOptions('error'));
            },
        },
    );

    const isStaff =
        isOwnerPath ||
        isStaffFromRole ||
        userData?.role === 'Owner' ||
        userData?.role === 'Admin';

    const { data: userStorage } = useQuery(
        'userStorageUsage',
        async () => {
            const response = await fileService.getUserStorageUsage(Token.MegaBox);
            return response?.data || response;
        },
        {
            enabled: !!Token.MegaBox && !!userData && !isStaff,
            cacheTime: 300000,
            retry: false,
        },
    );

    const { data: myRequestsData } = useQuery(
        'my-subscription-requests-profile',
        () => premiumService.getMyRequests({ page: 1, limit: 5 }),
        {
            enabled: !!Token.MegaBox && !!userData && !isStaff,
            retry: false,
        },
    );

    const pendingRequest = (myRequestsData?.data || []).find((r) => r.status === 'pending') || null;

    // Fetch real analytics summary + earnings (never called for staff)
    const { data: userAnalytics, isLoading: analyticsLoading } = useQuery(
        'userAnalyticsSummary',
        async () => {
            const [summaryRes, earningsRes] = await Promise.all([
                api.get('/analytics/summary').then((r) => r.data).catch(() => null),
                api.get('/earnings').then((r) => r.data).catch(() => null),
            ]);

            const summary = summaryRes?.summary || {};
            const earnings = earningsRes?.earnings || {};

            return {
                totalViews: summary.totalViews ?? earnings.totalViews ?? 0,
                totalDownloads: summary.totalDownloads ?? earnings.totalDownloads ?? 0,
                totalEarnings: earnings.totalEarnings ?? summary.totalEarnings ?? 0,
                confirmedRewards: earnings.confirmedRewards ?? 0,
                pendingRewards: earnings.pendingRewards ?? 0,
                availableBalance: earnings.availableBalance ?? 0,
                topFiles: summaryRes?.topFiles || [],
            };
        },
        {
            enabled: !!Token.MegaBox && !!userData && !isStaff,
            cacheTime: 300000,
            retry: false,
        },
    );

    const profilePicUrl =
        typeof userData?.profilePic === 'string'
            ? userData.profilePic
            : userData?.profilePic?.secure_url || userData?.avatar?.secure_url || '';

    useEffect(() => {
        if (profilePicUrl) {
            setImageError(false);
        }
    }, [profilePicUrl]);

    // Update username mutation
    const updateUsernameMutation = useMutation(
        (username) => userService.updateUsername(username, Token.MegaBox),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('userProfile');
                setIsEditing(false);
                toast.success(t('profile.usernameUpdated'), ToastOptions('success'));
            },
            onError: (error) => {
                toast.error(error?.message || t('profile.usernameUpdateFailed'), ToastOptions('error'));
            },
        },
    );

    const updateProfileImageMutation = useMutation(
        (file) => userService.updateProfileImage(file, Token.MegaBox),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('userProfile');
                setImageError(false);
                toast.success(t('profile.imageUpdated'), ToastOptions('success'));
            },
            onError: (error) => {
                toast.error(error?.message || t('profile.imageUpdateFailed'), ToastOptions('error'));
            },
        },
    );

    const deleteProfileImageMutation = useMutation(
        () => userService.deleteProfileImage(Token.MegaBox),
        {
            onSuccess: () => {
                setImageError(false);
                setShowDeleteImageModal(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                queryClient.invalidateQueries('userProfile');
                queryClient.invalidateQueries(['userProfile']);
                queryClient.invalidateQueries(['userAccount']);
                queryClient.invalidateQueries('userAccount');
                refetch();
                toast.success(t('profile.imageDeleted'), ToastOptions('success'));
            },
            onError: (error) => {
                toast.error(error?.message || t('profile.imageDeleteFailed'), ToastOptions('error'));
            },
        },
    );

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            updateProfileImageMutation.mutate(file);
        }
    };

    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        if (newUsername.trim()) {
            updateUsernameMutation.mutate(newUsername.trim());
        }
    };

    const handleLogoutAllDevices = async () => {
        setLoggingOutAll(true);
        try {
            await logout({ allDevices: true });
            toast.success(
                t('accountPremium.logoutAllSuccess') || 'Logged out of all devices',
                ToastOptions('success'),
            );
            navigate('/login');
        } finally {
            setLoggingOutAll(false);
        }
    };

    if (isLoading) {
        return (
            <div className="Profile flex justify-center items-center min-h-[60vh] bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-purple-200"></div>
                        <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-t-4 border-purple-600 border-r-4 border-r-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-sm sm:text-base text-purple-600 font-medium animate-pulse">
                        {t('common.loading') || 'Loading...'}
                    </p>
                </div>
            </div>
        );
    }

    if (userError) {
        return (
            <div className="Profile flex justify-center items-center min-h-[60vh] px-4">
                <div className="text-red-500 text-sm sm:text-base">{t('profile.errorLoading')}</div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="Profile flex justify-center items-center min-h-[60vh] px-4">
                <div className="text-gray-500 text-sm sm:text-base">{t('profile.noData')}</div>
            </div>
        );
    }

    const storage = userStorage || userData.storage || {};
    const freeDrive = storage.free_drive || { total_mb: 0, used_mb: 0, usage_percentage: 0 };
    const paidDrive = storage.paid_drive || { total_mb: 0, used_mb: 0, usage_percentage: 0 };
    const totalUsedMb = (Number(freeDrive.used_mb) || 0) + (Number(paidDrive.used_mb) || 0);
    const totalQuotaMb = (Number(freeDrive.total_mb) || 0) + (Number(paidDrive.total_mb) || 0);
    const totalUsagePct =
        totalQuotaMb > 0 ? Math.min(100, Math.round((totalUsedMb / totalQuotaMb) * 100)) : 0;

    const isPremiumActive =
        Boolean(userData.isBrimume) &&
        (!userData.brimumeExpiresAt || new Date(userData.brimumeExpiresAt) > new Date());

    return (
        <div
            className="Profile min-h-screen bg-indigo-50 pb-32"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            style={{ fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}
        >
            <motion.div
                className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border-2 border-indigo-100">
                    <div className="flex flex-col md:flex-row">
                        <motion.div
                            className="md:flex-shrink-0 flex flex-col items-center md:items-start"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="relative flex justify-center md:justify-start">
                                {profilePicUrl && !imageError ? (
                                    <img
                                        key={profilePicUrl}
                                        className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 lg:h-56 lg:w-56 xl:h-64 xl:w-64 object-cover rounded-lg m-2 sm:m-3 md:m-4 lg:m-5 border-4 border-indigo-200 shadow-md"
                                        src={profilePicUrl}
                                        alt="Profile"
                                        crossOrigin="anonymous"
                                        referrerPolicy="no-referrer"
                                        onError={() => setImageError(true)}
                                        onLoad={() => setImageError(false)}
                                    />
                                ) : (
                                    <div className="flex h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 lg:h-56 lg:w-56 xl:h-64 xl:w-64 items-center justify-center rounded-lg m-2 sm:m-3 md:m-4 lg:m-5 border-4 border-indigo-200 shadow-md bg-gradient-to-br from-indigo-100 to-indigo-200">
                                        <FaUser className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 text-indigo-600" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 sm:gap-3 justify-center md:justify-start items-center w-full px-3 sm:px-4 md:px-5 lg:px-6 mt-2 mb-2">
                                <motion.button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 sm:p-2.5 md:p-3 rounded-full shadow-lg transition-all flex-shrink-0"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={updateProfileImageMutation.isLoading}
                                    title={t('profile.changeImage')}
                                >
                                    {updateProfileImageMutation.isLoading ? (
                                        <div className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <FaCamera className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                    )}
                                </motion.button>
                                {profilePicUrl && (
                                    <motion.button
                                        type="button"
                                        className="bg-red-600 hover:bg-red-700 text-white p-2 sm:p-2.5 md:p-3 rounded-full shadow-lg transition-all flex-shrink-0"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowDeleteImageModal(true)}
                                        disabled={deleteProfileImageMutation.isLoading || updateProfileImageMutation.isLoading}
                                        title={t('profile.deleteImage')}
                                        aria-label={t('profile.deleteImage')}
                                    >
                                        {deleteProfileImageMutation.isLoading ? (
                                            <div className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <FaTrash className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                        )}
                                    </motion.button>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </motion.div>

                        <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 flex-1 w-full">
                            <motion.div
                                className="uppercase tracking-wide text-xs sm:text-sm text-indigo-600 font-semibold flex items-center gap-2 mb-3 sm:mb-4 md:mb-5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {t('profile.profileInformation')}
                                {isPremiumActive && (
                                    <FaCrown
                                        className="text-yellow-500 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"
                                        title={t('profile.premiumUser')}
                                    />
                                )}
                            </motion.div>

                            {/* Personal Referral Link Section - hidden for staff */}
                            {!isStaff && (
                                <div className="mt-4 sm:mt-5 md:mt-6 lg:mt-8">
                                    <h2 className="text-sm sm:text-base md:text-lg font-semibold text-indigo-900 mb-2 sm:mb-3">
                                        {t('profile.personalLink')}
                                    </h2>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4 bg-indigo-50 rounded-lg p-2 sm:p-2.5 md:p-3">
                                        <input
                                            type="text"
                                            readOnly
                                            value={
                                                userData?.referralLink ||
                                                `${window.location.origin}/register?ref=${userData?._id}`
                                            }
                                            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-indigo-200 rounded-md text-xs sm:text-sm text-indigo-900 bg-white focus:border-indigo-400 focus:outline-none truncate"
                                        />
                                        <motion.button
                                            onClick={() => {
                                                const linkToCopy =
                                                    userData?.referralLink ||
                                                    `${window.location.origin}/register?ref=${userData?._id}`;
                                                navigator.clipboard.writeText(linkToCopy);
                                                toast.success(t('profile.linkCopied'), ToastOptions('success'));
                                            }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm rounded-md transition-all font-medium whitespace-nowrap"
                                        >
                                            {t('profile.copy')}
                                        </motion.button>
                                    </div>
                                </div>
                            )}

                            <AnimatePresence mode="wait">
                                {isEditing ? (
                                    <motion.form
                                        key="edit-form"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="mt-3 sm:mt-4"
                                        onSubmit={handleUsernameSubmit}
                                    >
                                        <input
                                            type="text"
                                            className="block w-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 mt-2 text-indigo-900 bg-white border-2 border-indigo-200 rounded-md focus:border-indigo-500 focus:outline-none text-xs sm:text-sm md:text-base"
                                            placeholder={t('profile.enterNewUsername')}
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                        />

                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                                            <motion.button
                                                type="submit"
                                                disabled={updateUsernameMutation.isLoading}
                                                className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base font-medium transition-all"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <FaSave className="w-3 h-3 sm:w-4 sm:h-4" /> {t('profile.save')}
                                            </motion.button>
                                            <motion.button
                                                type="button"
                                                className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base font-medium transition-all"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setIsEditing(false)}
                                            >
                                                <FaTimes className="w-3 h-3 sm:w-4 sm:h-4" /> {t('profile.cancel')}
                                            </motion.button>
                                        </div>
                                    </motion.form>
                                ) : (
                                    <motion.div
                                        key="display-info"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="mt-3 sm:mt-4"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
                                            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-900 break-words">
                                                {userData.username || t('profile.user')}
                                            </h1>
                                            <motion.button
                                                className="text-indigo-600 hover:text-indigo-700 transition-colors flex-shrink-0"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    setNewUsername(userData.username || '');
                                                    setIsEditing(true);
                                                }}
                                            >
                                                <FaEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </motion.button>
                                        </div>
                                        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base text-indigo-700 break-words">
                                            {userData.email}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-4 sm:mt-5 md:mt-6 lg:mt-8">
                                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-indigo-900 mb-3 sm:mb-4">
                                    {t('profile.accountDetails')}
                                </h2>
                                <div
                                    className={`grid gap-2 sm:gap-3 md:gap-4 ${
                                        isStaff ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                                    }`}
                                >
                                    <div className="bg-indigo-50 border-2 border-indigo-100 p-2.5 sm:p-3 md:p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                                            {t('profile.userId')}
                                        </p>
                                        <p className="text-xs sm:text-sm md:text-base text-indigo-900 font-semibold mt-1 break-all">
                                            {userData._id || userData.userId}
                                        </p>
                                    </div>
                                    {!isStaff && (
                                        <div className="bg-indigo-50 border-2 border-indigo-100 p-2.5 sm:p-3 md:p-4 rounded-lg">
                                            <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                                                {t('profile.accountType')}
                                            </p>
                                            <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
                                                <div className="flex flex-col">
                                                    <p
                                                        className={`text-xs sm:text-sm md:text-base font-semibold ${
                                                            isPremiumActive
                                                                ? 'text-yellow-600'
                                                                : pendingRequest
                                                                    ? 'text-orange-600'
                                                                    : 'text-indigo-700'
                                                        }`}
                                                    >
                                                        {isPremiumActive
                                                            ? t('profile.premium')
                                                            : pendingRequest
                                                                ? t('profile.premiumPending') || 'Pending Approval'
                                                                : t('profile.standard')}
                                                    </p>
                                                    {isPremiumActive && userData.brimumeExpiresAt && (
                                                        <p className="text-[11px] text-indigo-500 mt-0.5">
                                                            {t('accountPremium.expiresOn') || 'Expires on'}:{' '}
                                                            {new Date(userData.brimumeExpiresAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                    {pendingRequest && (
                                                        <p className="text-[11px] text-orange-600 mt-0.5">
                                                            {pendingRequest.plan?.name
                                                                ? `${pendingRequest.plan.name} · `
                                                                : ''}
                                                            {t('profile.waitingForApproval') || 'Waiting for admin approval'}
                                                        </p>
                                                    )}
                                                </div>
                                                {!isPremiumActive && (
                                                    <motion.button
                                                        type="button"
                                                        onClick={() => navigate('/Premium')}
                                                        className="px-2.5 sm:px-3 py-1.5 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-medium transition-colors flex items-center gap-1.5"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaCrown className="w-3 h-3 flex-shrink-0" />
                                                        <span>
                                                            {pendingRequest
                                                                ? t('accountPremium.myRequestsTitle') || 'View Request'
                                                                : t('accountPremium.goToPremium') || 'Choose a Premium Plan'}
                                                        </span>
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Storage Usage Section - hidden for staff */}
            {!isStaff && (
                <motion.div
                    className="container mx-auto px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-3 sm:py-4 md:py-5 lg:py-6 xl:py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border-2 border-indigo-100">
                        <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8">
                            <motion.div
                                className={`uppercase tracking-wide text-xs sm:text-sm text-indigo-600 font-semibold flex items-center gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 ${
                                    language === 'ar' ? 'justify-end' : 'justify-start'
                                }`}
                                style={{ textAlign: language === 'ar' ? 'right' : 'left' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {t('profile.storageUsage')}
                                <svg
                                    className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                                    />
                                </svg>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                                {/* Storage Overview */}
                                <div className="bg-indigo-50 border-2 border-indigo-100 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-indigo-900 mb-2 sm:mb-3 md:mb-4">
                                        {t('profile.storageOverview')}
                                    </h3>
                                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                                                <span className="text-indigo-700 font-medium">
                                                    {t('profile.usedSpace')}
                                                </span>
                                                <span className="text-indigo-600 font-semibold">
                                                    {formatMbToGb(totalUsedMb)} GB
                                                </span>
                                            </div>
                                            <div className="w-full bg-indigo-200 rounded-full h-2 sm:h-2.5">
                                                <div
                                                    className="bg-indigo-600 h-2 sm:h-2.5 rounded-full transition-all duration-300"
                                                    style={{ width: `${totalUsagePct}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-1.5 sm:pt-2">
                                            <span className="text-indigo-700 text-xs sm:text-sm font-medium">
                                                {t('profile.totalSpace')}
                                            </span>
                                            <span className="text-indigo-900 font-semibold text-xs sm:text-sm md:text-base">
                                                {formatMbToGb(totalQuotaMb)} GB
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Storage Details */}
                                <div className="bg-indigo-50 border-2 border-indigo-100 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-indigo-900 mb-2 sm:mb-3 md:mb-4">
                                        {t('profile.storageDetails')}
                                    </h3>
                                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-500 flex-shrink-0"></div>
                                                <span className="text-indigo-700 text-xs sm:text-sm font-medium">
                                                    {t('accountPremium.freeDrive') || 'Free Storage'}
                                                </span>
                                            </div>
                                            <span className="text-indigo-900 font-semibold text-xs sm:text-sm">
                                                {Math.round(freeDrive.used_mb || 0)} / {Math.round(freeDrive.total_mb || 0)} MB
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                                                <span className="text-indigo-700 text-xs sm:text-sm font-medium">
                                                    {t('accountPremium.paidDrive') || 'Premium Storage'}
                                                </span>
                                            </div>
                                            <span className="text-indigo-900 font-semibold text-xs sm:text-sm">
                                                {Math.round(paidDrive.used_mb || 0)} / {Math.round(paidDrive.total_mb || 0)} MB
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* User Analytics Section - hidden for staff */}
            {!isStaff && (
                <motion.div
                    className="container mx-auto px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-3 sm:py-4 md:py-5 lg:py-6 xl:py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border-2 border-indigo-100">
                        <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8">
                            <motion.div
                                className={`uppercase tracking-wide text-xs sm:text-sm text-indigo-600 font-semibold flex items-center gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 ${
                                    language === 'ar' ? 'justify-end' : 'justify-start'
                                }`}
                                style={{ textAlign: language === 'ar' ? 'right' : 'left' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                {t('profile.userAnalytics')}
                                <svg
                                    className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </motion.div>

                            {analyticsLoading ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
                                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 border-r-4 border-r-transparent absolute top-0 left-0"></div>
                                        </div>
                                        <p className="text-sm text-purple-600 font-medium animate-pulse">
                                            {t('profile.analytics.loading')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                                    {/* Total Views Card */}
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 sm:p-5 shadow-sm">
                                        <p className="text-xs sm:text-sm text-blue-600 font-medium mb-2">
                                            {t('profile.analytics.totalViews')}
                                        </p>
                                        <p className="text-2xl sm:text-3xl font-bold text-blue-900">
                                            {userAnalytics?.totalViews ?? 0}
                                        </p>
                                    </div>

                                    {/* Total Downloads Card */}
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4 sm:p-5 shadow-sm">
                                        <p className="text-xs sm:text-sm text-green-600 font-medium mb-2">
                                            {t('profile.analytics.totalDownloads')}
                                        </p>
                                        <p className="text-2xl sm:text-3xl font-bold text-green-900">
                                            {userAnalytics?.totalDownloads ?? 0}
                                        </p>
                                    </div>

                                    {/* Total Earnings Card */}
                                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl p-4 sm:p-5 shadow-sm">
                                        <p className="text-xs sm:text-sm text-indigo-600 font-medium mb-2">
                                            {t('accountPremium.totalEarnings') || 'Total Earnings'}
                                        </p>
                                        <p className="text-2xl sm:text-3xl font-bold text-indigo-900">
                                            ${Number(userAnalytics?.totalEarnings ?? 0).toFixed(2)}
                                        </p>
                                    </div>

                                    {/* Available Balance Card */}
                                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200 rounded-xl p-4 sm:p-5 shadow-sm">
                                        <p className="text-xs sm:text-sm text-pink-600 font-medium mb-2">
                                            {t('accountPremium.availableBalance') || 'Available Balance'}
                                        </p>
                                        <p className="text-2xl sm:text-3xl font-bold text-pink-900">
                                            ${Number(userAnalytics?.availableBalance ?? 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Account Sessions / Log out of all devices */}
            <motion.div
                className="container mx-auto px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-3 sm:py-4 md:py-5 lg:py-6 xl:py-8 mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
            >
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border-2 border-indigo-100">
                    <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-indigo-900">
                                {t('accountPremium.sessionsTitle') || 'Account Sessions'}
                            </h2>
                            <p className="text-xs sm:text-sm text-indigo-600 mt-1">
                                {t('accountPremium.logoutAllHint') ||
                                    'Revokes your session on every signed-in device and browser.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleLogoutAllDevices}
                            disabled={loggingOutAll}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                        >
                            <FaSignOutAlt />
                            <span>
                                {loggingOutAll
                                    ? t('accountPremium.loggingOutAll') || 'Logging out...'
                                    : t('accountPremium.logoutAllDevices') || 'Log out of all devices'}
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {showDeleteImageModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !deleteProfileImageMutation.isLoading && setShowDeleteImageModal(false)}
                    >
                        <motion.div
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-indigo-100"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                                {t('profile.deleteImage')}
                            </h3>
                            <p className="text-sm text-gray-600 mb-6">
                                {t('profile.confirmDeleteImage')}
                            </p>
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                                    onClick={() => setShowDeleteImageModal(false)}
                                    disabled={deleteProfileImageMutation.isLoading}
                                >
                                    {t('profile.cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium flex items-center gap-2"
                                    onClick={() => deleteProfileImageMutation.mutate()}
                                    disabled={deleteProfileImageMutation.isLoading}
                                >
                                    {deleteProfileImageMutation.isLoading && (
                                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                    )}
                                    {t('profile.delete')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
