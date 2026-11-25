import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCookies } from 'react-cookie';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaLink, FaQuestionCircle, FaCopy, FaTrash } from 'react-icons/fa';
import { HiShare } from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { api } from '../../services/apiConfig';
import { promoterService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { ToastOptions } from '../../helpers/ToastOptions';
import './SharedFiles.scss';
import '../RevenueData/RevenueData.scss';

function shareTitle(share) {
    const items = Array.isArray(share?.items) ? share.items : [];
    const names = items
        .map((item) => item?.details?.fileName || item?.details?.name || item?.itemType)
        .filter(Boolean);
    if (names.length === 0) return '-';
    if (names.length === 1) return names[0];
    return `${names[0]} (+${names.length - 1})`;
}

export default function SharedFiles() {
    const { t } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const token = cookies.MegaBox;
    const queryClient = useQueryClient();

    const [mySharesPage, setMySharesPage] = useState(1);
    const [promoterSharesPage, setPromoterSharesPage] = useState(1);

    // GET /api/users/profile
    const { data: userData } = useQuery(
        ['userAccount'],
        async () => {
            const res = await api.get('/users/profile');
            return res.data?.data;
        },
        { enabled: !!token, retry: false },
    );

    const userId = userData?._id || '';
    const isViewsPlan = userData?.promoterPlan === 'views';

    // GET /api/earnings
    const { data: earningsResponse, isLoading: earningsLoading } = useQuery(
        ['userEarnings'],
        () => promoterService.getEarnings(),
        { enabled: !!token, retry: 1 },
    );

    // GET /api/shares/my-shares
    const { data: mySharesResponse, isLoading: mySharesLoading } = useQuery(
        ['myShares', mySharesPage],
        () => promoterService.getMyShares({ page: mySharesPage, limit: 20 }),
        { enabled: !!token, retry: 1, keepPreviousData: true },
    );

    // GET /api/promoter/shares
    const { data: promoterSharesResponse, isLoading: promoterSharesLoading } = useQuery(
        ['promoterShares', promoterSharesPage],
        () => promoterService.getPromoterShares({ page: promoterSharesPage, limit: 20 }),
        { enabled: !!token && userData?.isPromoter === true, retry: 1, keepPreviousData: true },
    );

    // DELETE /api/shares/:id
    const revokeShareMutation = useMutation(
        (shareId) => promoterService.deleteShare(shareId),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['myShares']);
                queryClient.invalidateQueries(['promoterShares']);
                toast.success(t('payouts.shareRevoked') || 'Share disabled successfully', ToastOptions('success'));
            },
            onError: (error) => {
                toast.error(
                    error?.response?.data?.message || t('payouts.shareRevokeFailed') || 'Failed to disable share',
                    ToastOptions('error'),
                );
            },
        },
    );

    const earnings = earningsResponse?.earnings || {};
    const currency = 'USD';
    const availableBalance = Number(earnings.availableBalance ?? 0);
    const totalEarnings = Number(earnings.totalEarnings ?? 0);
    const confirmedRewards = Number(earnings.confirmedRewards ?? 0);

    const myShares = Array.isArray(mySharesResponse?.data) ? mySharesResponse.data : [];
    const mySharesMeta = mySharesResponse?.meta || null;

    const promoterShares = Array.isArray(promoterSharesResponse?.data) ? promoterSharesResponse.data : [];
    const promoterSharesTotalPages = Math.max(1, Math.ceil(Number(promoterSharesResponse?.total ?? 0) / 20));

    const handleCopy = async (url) => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            toast.success(t('payouts.linkCopied') || 'Link copied', ToastOptions('success'));
        } catch {
            toast.error(t('referral.copyFailed') || 'Failed to copy link', ToastOptions('error'));
        }
    };

    return (
        <div className="revenue-data-page">
            <div className="revenue-data-page__wrapper">
                {/* Earnings Summary */}
                <motion.div
                    className="revenue-earning-section"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="revenue-earning-section__header">
                        <h2 className="revenue-earning-section__title">{t('revenueData.earning')}</h2>
                        <span className="revenue-earning-section__id">
                            {t('revenueData.id')}: {userId}
                        </span>
                    </div>

                    <div className="revenue-earning-card">
                        <div className="revenue-earning-card__top">
                            <div className="revenue-earning-card__item">
                                <div className="revenue-earning-card__label">
                                    {t('revenueData.withdrawable')} / {currency}
                                    <FaQuestionCircle className="revenue-earning-card__help-icon" />
                                </div>
                                <div className="revenue-earning-card__value revenue-earning-card__value--large">
                                    {earningsLoading ? '-' : availableBalance.toFixed(4)}
                                </div>
                            </div>
                            <Link to="/Promoter/Earnings" className="revenue-earning-card__withdraw-button">
                                {t('revenueData.withdraw')}
                            </Link>
                        </div>

                        <div className="revenue-earning-card__bottom">
                            <div className="revenue-earning-card__item">
                                <div className="revenue-earning-card__label">
                                    {t('withdrawSection.totalEarnings') || 'Total Earnings'} / {currency}
                                </div>
                                <div className="revenue-earning-card__value">
                                    {earningsLoading ? '-' : totalEarnings.toFixed(4)}
                                </div>
                            </div>
                            <div className="revenue-earning-card__item">
                                <div className="revenue-earning-card__label">
                                    {t('withdrawSection.confirmedRewards') || 'Confirmed Rewards'} / {currency}
                                </div>
                                <div className="revenue-earning-card__value">
                                    {earningsLoading ? '-' : confirmedRewards.toFixed(4)}
                                </div>
                            </div>
                        </div>

                        <div className="revenue-earning-card__background">
                            <span className="revenue-earning-card__dollar-sign">$</span>
                        </div>
                    </div>
                </motion.div>

                {/* Active User Shares (GET /api/shares/my-shares) */}
                <motion.div
                    className="revenue-table-section"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="revenue-table-container">
                        <div className="shared-links-header">
                            <h2 className="shared-links-header__title">
                                {t('payouts.mySharesTitle') || 'My Active Shares'}
                            </h2>
                            <p className="shared-links-header__description">
                                {t('sidenav.linkDataSection.sharedLinksDescription')}
                            </p>
                        </div>

                        <table className="revenue-table">
                            <thead>
                                <tr>
                                    <th>{t('payouts.items') || 'Items'}</th>
                                    <th>{t('payouts.source') || 'Source'}</th>
                                    <th>{t('payouts.shareLink') || 'Share Link'}</th>
                                    <th>{t('payouts.views') || 'Views'}</th>
                                    <th>{t('payouts.installs') || 'Installs'}</th>
                                    <th>{t('sidenav.linkDataSection.creationTime') || 'Created'}</th>
                                    <th>{t('payouts.actions') || 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mySharesLoading ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                            {t('revenueData.loading') || 'Loading...'}
                                        </td>
                                    </tr>
                                ) : myShares.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                <p style={{ color: '#6b7280', margin: 0 }}>
                                                    {t('payouts.noShares') || 'No active shares yet'}
                                                </p>
                                                <Link
                                                    to="/Promoter/files"
                                                    className="revenue-earning-card__withdraw-button revenue-earning-card__share-button"
                                                >
                                                    <HiShare className="revenue-earning-card__share-icon" />
                                                    {t('sharedFiles.goToFiles') || 'Go to Files'}
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    myShares.map((share) => (
                                        <tr key={share._id}>
                                            <td title={shareTitle(share)}>{shareTitle(share)}</td>
                                            <td>{share.sourceType || '-'}</td>
                                            <td>
                                                {share.branchUrl ? (
                                                    <div className="link-cell" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <FaLink className="link-icon" />
                                                        <a
                                                            href={share.branchUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="link-text hover:text-indigo-800 underline"
                                                            title={share.branchUrl}
                                                        >
                                                            {share.branchUrl.length > 36
                                                                ? `${share.branchUrl.substring(0, 36)}...`
                                                                : share.branchUrl}
                                                        </a>
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td>{Number(share.viewsCount ?? 0).toLocaleString()}</td>
                                            <td>{Number(share.installsCount ?? 0).toLocaleString()}</td>
                                            <td>
                                                {share.createdAt
                                                    ? new Date(share.createdAt).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                    {share.branchUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopy(share.branchUrl)}
                                                            title={t('payouts.copyLink') || 'Copy'}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid #c7d2fe',
                                                                borderRadius: '0.375rem',
                                                                padding: '0.3rem 0.5rem',
                                                                cursor: 'pointer',
                                                                color: '#4338ca',
                                                            }}
                                                        >
                                                            <FaCopy />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={revokeShareMutation.isLoading}
                                                        onClick={() => revokeShareMutation.mutate(share._id)}
                                                        title={t('payouts.revokeShare') || 'Disable Share'}
                                                        style={{
                                                            background: 'transparent',
                                                            border: '1px solid #fecaca',
                                                            borderRadius: '0.375rem',
                                                            padding: '0.3rem 0.5rem',
                                                            cursor: 'pointer',
                                                            color: '#dc2626',
                                                        }}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {mySharesMeta && mySharesMeta.totalPages > 1 && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem 1.25rem',
                                }}
                            >
                                <button
                                    type="button"
                                    className="revenue-earning-card__withdraw-button"
                                    disabled={mySharesPage <= 1}
                                    onClick={() => setMySharesPage((p) => Math.max(1, p - 1))}
                                >
                                    {t('payouts.prev') || 'Previous'}
                                </button>
                                <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                                    {t('payouts.pageOf', {
                                        page: mySharesMeta.page,
                                        totalPages: mySharesMeta.totalPages,
                                    })}
                                </span>
                                <button
                                    type="button"
                                    className="revenue-earning-card__withdraw-button"
                                    disabled={mySharesPage >= mySharesMeta.totalPages}
                                    onClick={() =>
                                        setMySharesPage((p) => Math.min(mySharesMeta.totalPages, p + 1))
                                    }
                                >
                                    {t('payouts.next') || 'Next'}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Promoter Attributed Shares (GET /api/promoter/shares) */}
                {userData?.isPromoter && (
                    <motion.div
                        className="revenue-table-section"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="revenue-table-container">
                            <div className="shared-links-header">
                                <h2 className="shared-links-header__title">
                                    {t('payouts.promoterSharesTitle') || 'Promoter Share Performance'}
                                </h2>
                            </div>
                            <table className="revenue-table">
                                <thead>
                                    <tr>
                                        <th>{t('payouts.shareLink') || 'Share Link'}</th>
                                        <th>
                                            {isViewsPlan
                                                ? t('payouts.views') || 'Views'
                                                : t('payouts.installs') || 'Installs'}
                                        </th>
                                        <th>
                                            {t('payouts.revenue') || 'Revenue'} / {currency}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promoterSharesLoading ? (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
                                                {t('revenueData.loading') || 'Loading...'}
                                            </td>
                                        </tr>
                                    ) : promoterShares.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
                                                {t('payouts.noShares') || 'No active shares yet'}
                                            </td>
                                        </tr>
                                    ) : (
                                        promoterShares.map((item, idx) => (
                                            <tr key={`${item.shareLink || 'pshare'}-${idx}`}>
                                                <td>
                                                    {item.shareLink ? (
                                                        <a
                                                            href={item.shareLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="link-text hover:text-indigo-800 underline"
                                                        >
                                                            {item.shareLink}
                                                        </a>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {isViewsPlan
                                                        ? Number(item.views ?? 0).toLocaleString()
                                                        : Number(item.installs ?? 0).toLocaleString()}
                                                </td>
                                                <td>
                                                    {Number(item.revenue ?? 0).toFixed(4)} {currency}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {promoterSharesTotalPages > 1 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem 1.25rem',
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="revenue-earning-card__withdraw-button"
                                        disabled={promoterSharesPage <= 1}
                                        onClick={() => setPromoterSharesPage((p) => Math.max(1, p - 1))}
                                    >
                                        {t('payouts.prev') || 'Previous'}
                                    </button>
                                    <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                                        {t('payouts.pageOf', {
                                            page: promoterSharesPage,
                                            totalPages: promoterSharesTotalPages,
                                        })}
                                    </span>
                                    <button
                                        type="button"
                                        className="revenue-earning-card__withdraw-button"
                                        disabled={promoterSharesPage >= promoterSharesTotalPages}
                                        onClick={() =>
                                            setPromoterSharesPage((p) =>
                                                Math.min(promoterSharesTotalPages, p + 1),
                                            )
                                        }
                                    >
                                        {t('payouts.next') || 'Next'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
