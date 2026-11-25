import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { FaWallet, FaMoneyBillWave, FaChartLine } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import './EarningCard.scss';

export default function EarningCard({
    withdrawable,
    estimatedIncome,
    actualIncome,
    currency = 'USD',
    onWithdraw,
    showWithdraw = true,
}) {
    const { t } = useLanguage();

    return (
        <motion.div
            className="earning-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
        >
            <div className="earning-card__content">
                <div className="earning-card__item">
                    <div className="earning-card__label">
                        {t('revenueData.withdrawable') || 'Withdrawable'} / {currency}
                    </div>
                    <div className="earning-card__value">{withdrawable ?? '0.00'}</div>
                    {showWithdraw && (
                        <motion.button
                            type="button"
                            className="earning-card__withdraw-btn"
                            onClick={onWithdraw}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaWallet />
                            {t('revenueData.withdraw') || 'Withdraw'}
                        </motion.button>
                    )}
                </div>

                <div className="earning-card__divider" />

                <div className="earning-card__item">
                    <div className="earning-card__label">
                        {t('withdrawSection.totalEarnings') || 'Total Earnings'} / {currency}
                    </div>
                    <div className="earning-card__value">{estimatedIncome ?? '0.00'}</div>
                    <div className="earning-card__icon">
                        <FaChartLine />
                    </div>
                </div>

                <div className="earning-card__divider" />

                <div className="earning-card__item">
                    <div className="earning-card__label">
                        {t('withdrawSection.confirmedRewards') || 'Confirmed Rewards'} / {currency}
                    </div>
                    <div className="earning-card__value">{actualIncome ?? '0.00'}</div>
                    <div className="earning-card__icon">
                        <FaMoneyBillWave />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
