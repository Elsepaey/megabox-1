import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    HiFolder,
    HiShare,
    HiChartBar,
    HiUserGroup,
    HiHandRaised,
    HiCurrencyDollar,
    HiUsers,
    HiDocumentText,
    HiCreditCard,
    HiServer,
    HiArrowDownTray,
    HiTv,
    HiFlag,
    HiChatBubbleLeftRight,
    HiLink,
    HiDocument,
    HiBell,
    HiRectangleStack,
    HiSparkles,
    HiPhoto,
    HiScale,
    HiCog6Tooth,
    HiArchiveBox,
    HiDocumentMagnifyingGlass,
    HiWallet
} from "react-icons/hi2";
import { useLanguage } from '../../context/LanguageContext';
import './BottomNavigation.scss';

export default function BottomNavigation({ role, isPromoter, userData }) {
    const { t, language } = useLanguage();
    const { pathname } = useLocation();

    const getMenuItems = () => {
        if (role === "User") {
            // Hide bottom navigation for regular users (non-promoters)
            if (!isPromoter) {
                return [];
            }

            const hasPromoterPlan = Boolean(userData?.promoterPlan);
            if (hasPromoterPlan) {
                return [
                    {
                        path: '/Promoter/revenue-data',
                        icon: HiChartBar,
                        label: t("sidenav.revenueData"),
                        key: 'revenue'
                    },
                    {
                        path: '/Promoter/shared-files',
                        icon: HiShare,
                        label: t("sidenav.linkData"),
                        key: 'link-data'
                    },
                    {
                        path: '/Promoter/files',
                        icon: HiFolder,
                        label: t("sidenav.allFiles"),
                        key: 'files'
                    },
                    {
                        path: '/Promoter/channels',
                        icon: HiTv,
                        label: t("sidenav.channels") || "Channels",
                        key: 'channels'
                    },
                    {
                        path: '/Promoter/Earnings',
                        icon: HiCurrencyDollar,
                        label: t("sidenav.withdraw"),
                        key: 'withdraw'
                    },
                    {
                        path: '/Promoter/referral',
                        icon: HiUserGroup,
                        label: t("sidenav.referral"),
                        key: 'referral'
                    }
                ];
            }
            
            const items = [
                {
                    path: isPromoter ? '/Promoter/files' : '/dashboard/files',
                    icon: HiFolder,
                    label: t("sidenav.allFiles"),
                    key: 'files'
                }
            ];

            if (hasPromoterPlan) {
                items.push({
                    path: '/Promoter/shared-files',
                    icon: HiShare,
                    label: t("sidenav.sharedFiles"),
                    key: 'shared-files'
                });
            }

            if (isPromoter) {
                items.push({
                    path: '/Promoter',
                    icon: HiCurrencyDollar,
                    label: t("sidenav.promoterDashboard"),
                    key: 'promoter'
                });
                items.push({
                    path: '/Promoter/channels',
                    icon: HiTv,
                    label: t("sidenav.channels") || "Channels",
                    key: 'channels'
                });
            }

            if (hasPromoterPlan) {
                items.push({
                    path: '/Promoter/revenue-data',
                    icon: HiChartBar,
                    label: t("sidenav.revenueData"),
                    key: 'revenue'
                });
            }

            if (hasPromoterPlan) {
                items.push({
                    path: '/Promoter/Earnings',
                    icon: HiChartBar,
                    label: t("sidenav.earnings"),
                    key: 'earnings'
                });
            }

            if (isPromoter) {
                items.push({
                    path: '/Promoter/referral',
                    icon: HiUserGroup,
                    label: t("sidenav.referral"),
                    key: 'referral'
                });
            }

            items.push({
                path: '/Partners',
                icon: HiHandRaised,
                label: t("sidenav.partners"),
                key: 'partners'
            });

            return items;
        } else if (role === "Owner") {
            return [
                { path: '/Owner', icon: HiChartBar, label: t("staffNav.analytics"), key: 'staffAnalytics', exact: true },
                { path: '/Owner/Users', icon: HiUsers, label: t("staffNav.users"), key: 'staffUsers' },
                { path: '/Owner/AllPromoters', icon: HiUserGroup, label: t("staffNav.promoters"), key: 'staffPromoters', match: ['/Owner/Promoter/'] },
                { path: '/Owner/Reports', icon: HiFlag, label: t("staffNav.reports"), key: 'staffReports' },
                { path: '/Owner/Complaints', icon: HiChatBubbleLeftRight, label: t("staffNav.complaints"), key: 'staffComplaints' },
                { path: '/Owner/Shares', icon: HiLink, label: t("staffNav.shares"), key: 'staffShares' },
                { path: '/Owner/Channels', icon: HiTv, label: t("staffNav.channels"), key: 'staffChannels' },
                { path: '/Owner/Files', icon: HiDocument, label: t("staffNav.files"), key: 'staffFiles' },
                { path: '/Owner/Folders', icon: HiFolder, label: t("staffNav.folders"), key: 'staffFolders' },
                { path: '/Owner/Notifications', icon: HiBell, label: t("staffNav.notifications"), key: 'staffNotifications' },
                { path: '/Owner/Withdrawals', icon: HiCurrencyDollar, label: t("staffNav.withdrawals"), key: 'staffWithdrawals' },
                { path: '/Owner/PaymentMethods', icon: HiWallet, label: t("staffNav.paymentMethods"), key: 'staffPaymentMethods' },
                { path: '/Owner/Plans', icon: HiRectangleStack, label: t("staffNav.plans"), key: 'staffPlans' },
                { path: '/Owner/Subscriptions', icon: HiCreditCard, label: t("staffNav.subscriptions"), key: 'staffSubscriptions' },
                { path: '/Owner/Storage', icon: HiServer, label: t("staffNav.storage"), key: 'staffStorage' },
                { path: '/Owner/Wheel', icon: HiSparkles, label: t("staffNav.wheel"), key: 'staffWheel' },
                { path: '/Owner/Catalogs', icon: HiPhoto, label: t("staffNav.catalogs"), key: 'staffCatalogs' },
                { path: '/Owner/Legal', icon: HiScale, label: t("staffNav.legal"), key: 'staffLegal' },
                { path: '/Owner/AppConfig', icon: HiCog6Tooth, label: t("staffNav.appConfig"), key: 'staffAppConfig' },
                { path: '/Owner/Zips', icon: HiArchiveBox, label: t("staffNav.zips"), key: 'staffZips' },
                { path: '/Owner/Ocr', icon: HiDocumentMagnifyingGlass, label: t("staffNav.ocr"), key: 'staffOcr' },
            ];
        }
        return [];
    };

    const menuItems = getMenuItems();

    // Don't render bottom navigation if there are no menu items
    if (menuItems.length === 0) {
        return null;
    }

    const isPathActive = (itemPath, currentPathname, allMenuItems) => {
        const normalizedPathname = currentPathname.endsWith('/') ? currentPathname.slice(0, -1) : currentPathname;
        const normalizedItemPath = itemPath.endsWith('/') ? itemPath.slice(0, -1) : itemPath;
        
        if (normalizedPathname === normalizedItemPath) return true;
        
        if (normalizedPathname.startsWith(normalizedItemPath + '/')) {
            const hasMoreSpecificMatch = allMenuItems.some(otherItem => {
                if (otherItem.path === itemPath) return false;
                const normalizedOtherPath = otherItem.path.endsWith('/') ? otherItem.path.slice(0, -1) : otherItem.path;
                if (normalizedOtherPath.startsWith(normalizedItemPath + '/')) {
                    return normalizedPathname === normalizedOtherPath || 
                           normalizedPathname.startsWith(normalizedOtherPath + '/');
                }
                return false;
            });
            return !hasMoreSpecificMatch;
        }
        return false;
    };

    const checkIsActive = (item) => {
        if (item.key === 'files') {
            return pathname === '/dashboard/files' || 
                   pathname === '/dashboard/files/' ||
                   pathname.startsWith('/dashboard/files/') ||
                   pathname === '/Promoter/files' || 
                   pathname === '/Promoter/files/' ||
                   pathname.startsWith('/Promoter/files/');
        }
        if (item.key === 'channels') {
            return pathname === '/Promoter/channels' || 
                   pathname === '/Promoter/channels/' ||
                   pathname.startsWith('/Promoter/channels/');
        }
        if (item.match?.some((prefix) => pathname.startsWith(prefix))) return true;
        if (item.exact) return pathname.replace(/\/$/, '') === item.path;
        return isPathActive(item.path, pathname, menuItems);
    };

    return (
        <nav className="bottom-navigation" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="bottom-navigation__container">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = checkIsActive(item);
                    
                    return (
                        <Link
                            key={item.key}
                            to={item.path}
                            className={`bottom-navigation__item ${isActive ? 'bottom-navigation__item--active' : ''}`}
                        >
                            <div className="bottom-navigation__icon-wrapper">
                                <Icon className="bottom-navigation__icon" />
                                {item.badge && item.badge > 0 && (
                                    <span className="bottom-navigation__badge">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className="bottom-navigation__label">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}