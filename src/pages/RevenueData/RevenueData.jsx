import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { FaQuestionCircle } from 'react-icons/fa';
import { HiShare } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useCookies } from 'react-cookie';
import { api } from '../../services/apiConfig';
import { promoterService } from '../../services/api';
import './RevenueData.scss';

export default function RevenueData() {
    const { t } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const token = cookies.MegaBox;

    const [breakdownPage, setBreakdownPage] = useState(1);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

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

    // GET /api/earnings
    const { data: earningsResponse, isLoading: earningsLoading } = useQuery(
        ['userEarnings'],
        () => promoterService.getEarnings(),
        { enabled: !!token, retry: 1 },
    );

    // GET /api/earnings/breakdown
    const { data: breakdownResponse, isLoading: breakdownLoading } = useQuery(
        ['earningsBreakdown', breakdownPage],
        () => promoterService.getEarningsBreakdown({ page: breakdownPage, limit: 20 }),
        { enabled: !!token, retry: 1, keepPreviousData: true },
    );

    // GET /api/promoter/stats
    const { data: promoterStats, isLoading: statsLoading } = useQuery(
        ['promoterStats', fromDate, toDate],
        () => promoterService.getPromoterStats({ from: fromDate || undefined, to: toDate || undefined }),
        { enabled: !!token && userData?.isPromoter === true, retry: false },
    );

    const earnings = earningsResponse?.earnings || {};
    const currency = 'USD';
    const availableBalance = Number(earnings.availableBalance ?? 0);
    const totalEarnings = Number(earnings.totalEarnings ?? 0);
    const confirmedRewards = Number(earnings.confirmedRewards ?? 0);
    const pendingRewards = Number(earnings.pendingRewards ?? 0);

    const breakdownList = Array.isArray(breakdownResponse?.data) ? breakdownResponse.data : [];
    const breakdownMeta = breakdownResponse?.meta || null;
    const dailyGraph = Array.isArray(promoterStats?.graph) ? [...promoterStats.graph].reverse() : [];

    return (
        <div className="revenue-data-page">
            <div className="revenue-data-page__wrapper">
                {/* Earning Summary Card */}
                <motion.div
                    className="revenue-earning-section"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="revenue-earning-section__header">
                        <h2 className="revenue-earning-section__title">{t('revenueData.earning') || 'Earning'}</h2>
                        <span className="revenue-earning-section__id">
                            {t('revenueData.id') || 'ID'}: {userId}
                        </span>
                    </div>

                    <div className="revenue-earning-card">
                        <div className="revenue-earning-card__top">
                            <div className="revenue-earning-card__item">
                                <div className="revenue-earning-card__label">
                                    {t('revenueData.withdrawable') || 'Withdrawable'} / {currency}
                                    <FaQuestionCircle className="revenue-earning-card__help-icon" />
                                </div>
                                <div className="revenue-earning-card__value revenue-earning-card__value--large">
                                    {earningsLoading ? '-' : availableBalance.toFixed(4)}
                                </div>
                            </div>
                            <Link to="/Promoter/Earnings" className="revenue-earning-card__withdraw-button">
                                {t('revenueData.withdraw') || 'Withdraw'}
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

                            <div className="revenue-earning-card__item">
                                <div className="revenue-earning-card__label">
                                    {t('withdrawSection.pendingRewards') || 'Pending Rewards'} / {currency}
                                </div>
                                <div className="revenue-earning-card__value">
                                    {earningsLoading ? '-' : pendingRewards.toFixed(4)}
                                </div>
                            </div>
                        </div>

                        <div className="revenue-earning-card__background">
                            <span className="revenue-earning-card__dollar-sign">$</span>
                        </div>
                    </div>
                </motion.div>

                {/* File Earnings Breakdown (GET /api/earnings/breakdown) */}
                <motion.div
                    className="revenue-table-section"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="revenue-table-container">
                        <div style={{ padding: '1rem 1.25rem 0.25rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                                {t('payouts.fileBreakdownTitle') || 'File Earnings Breakdown'}
                            </h3>
                        </div>
                        <table className="revenue-table">
                            <thead>
                                <tr>
                                    <th>{t('sidenav.linkDataSection.fileName') || 'File Name'}</th>
                                    <th>{t('payouts.views') || 'Views'}</th>
                                    <th>{t('payouts.downloads') || 'Downloads'}</th>
                                    <th>
                                        {t('revenueData.total') || 'Total'} / {currency}
                                    </th>
                                    <th>{t('payouts.lastUpdated') || 'Last Updated'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {breakdownLoading ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                            <p style={{ color: '#6b7280', margin: 0 }}>
                                                {t('revenueData.loading') || 'Loading...'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : breakdownList.length > 0 ? (
                                    breakdownList.map((item, index) => (
                                        <motion.tr
                                            key={item.fileId || index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: Math.min(index * 0.03, 0.3) }}
                                        >
                                            <td title={item.fileName}>{item.fileName || '-'}</td>
                                            <td>{Number(item.views ?? 0).toLocaleString()}</td>
                                            <td>{Number(item.downloads ?? 0).toLocaleString()}</td>
                                            <td>
                                                {Number(item.totalEarnings ?? 0).toFixed(4)} {currency}
                                            </td>
                                            <td>
                                                {item.lastUpdated
                                                    ? new Date(item.lastUpdated).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                <p style={{ color: '#6b7280', margin: 0 }}>
                                                    {t('payouts.noBreakdown') || 'No file earnings recorded yet'}
                                                </p>
                                                <Link
                                                    to="/Promoter/shared-files"
                                                    className="revenue-earning-card__withdraw-button revenue-earning-card__share-button"
                                                >
                                                    <HiShare className="revenue-earning-card__share-icon" />
                                                    {t('revenueData.toShare') || 'To share'}
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {breakdownMeta && breakdownMeta.totalPages > 1 && (
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
                                    disabled={breakdownPage <= 1}
                                    onClick={() => setBreakdownPage((p) => Math.max(1, p - 1))}
                                >
                                    {t('payouts.prev') || 'Previous'}
                                </button>
                                <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                                    {t('payouts.pageOf', {
                                        page: breakdownMeta.page,
                                        totalPages: breakdownMeta.totalPages,
                                    })}
                                </span>
                                <button
                                    type="button"
                                    className="revenue-earning-card__withdraw-button"
                                    disabled={breakdownPage >= breakdownMeta.totalPages}
                                    onClick={() =>
                                        setBreakdownPage((p) => Math.min(breakdownMeta.totalPages, p + 1))
                                    }
                                >
                                    {t('payouts.next') || 'Next'}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Daily Promoter Revenue (GET /api/promoter/stats) */}
                {userData?.isPromoter && (
                    <motion.div
                        className="revenue-table-section"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="revenue-table-container">
                            <div
                                style={{
                                    padding: '1rem 1.25rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem',
                                }}
                            >
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                                    {t('payouts.dailyRevenueTitle') || 'Daily Promoter Revenue'}
                                </h3>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span>{t('payouts.fromDate') || 'From'}</span>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        />
                                    </label>
                                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span>{t('payouts.toDate') || 'To'}</span>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            style={{ padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                        />
                                    </label>
                                </div>
                            </div>
                            <table className="revenue-table">
                                <thead>
                                    <tr>
                                        <th>{t('revenueData.date') || 'Date (UTC)'}</th>
                                        <th>
                                            {t('payouts.revenue') || 'Revenue'} / {currency}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statsLoading ? (
                                        <tr>
                                            <td colSpan="2" style={{ textAlign: 'center', padding: '1.5rem' }}>
                                                {t('revenueData.loading') || 'Loading...'}
                                            </td>
                                        </tr>
                                    ) : dailyGraph.length > 0 ? (
                                        dailyGraph.map((day) => (
                                            <tr key={day.date}>
                                                <td>{day.date}</td>
                                                <td>
                                                    {Number(day.revenue ?? 0).toFixed(4)} {currency}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
                                                {t('payouts.noDailyData') || 'No revenue recorded in this date range'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
