import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { channelService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { FaFolder } from 'react-icons/fa';
import { HiPlus } from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import Loading from '../../components/Loading/Loading';
import './Channels.scss';

export default function Channels() {
    const [Token] = useCookies(['MegaBox']);
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);

    // Close sidenav when modal opens
    useEffect(() => {
        if (showSubscribeModal) {
            // Close sidebar by clicking the backdrop or toggling
            const sidebarBackdrop = document.querySelector('.dropback');
            const sidebarToggle = document.querySelector('.bars');
            if (sidebarBackdrop && sidebarBackdrop.classList.contains('apper-dropback')) {
                sidebarBackdrop.click();
            } else if (sidebarToggle) {
                // Dispatch custom event to close sidebar
                window.dispatchEvent(new CustomEvent('closeSidebar'));
            }
        }
    }, [showSubscribeModal]);

    const [channelId, setChannelId] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_LIMIT = 12;

    const { data: channelsData, isLoading: channelsLoading } = useQuery(
        ['mySubscribedChannels', page],
        () => channelService.getMySubscribedChannels(Token.MegaBox, { page, limit: PAGE_LIMIT }),
        {
            enabled: !!Token.MegaBox,
            cacheTime: 300000,
            keepPreviousData: true,
        }
    );

    const subscribedChannels = useMemo(() => {
        if (Array.isArray(channelsData?.data)) return channelsData.data;
        if (Array.isArray(channelsData?.data?.subscribedChannels)) return channelsData.data.subscribedChannels;
        return [];
    }, [channelsData]);
    const totalPages = channelsData?.meta?.totalPages || 1;
    const subscribeMutation = useMutation(
        (id) => channelService.subscribeToChannel(id, Token.MegaBox),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('mySubscribedChannels');
                setShowSubscribeModal(false);
                setChannelId('');
            }
        }
    );

    const unsubscribeMutation = useMutation(
        (id) => channelService.unsubscribeFromChannel(id, Token.MegaBox),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('mySubscribedChannels');
            }
        }
    );
    const handleSubscribe = (e) => {
        e.preventDefault();
        if (!channelId) {
            return;
        }
        subscribeMutation.mutate(channelId);
    };

    if (channelsLoading) {
        return <Loading />;
    }

    return (
        <div className="Channels min-h-screen bg-indigo-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-indigo-900">
                        {t('channels.title') || 'My Channels'}
                    </h1>
                    <button
                        onClick={() => setShowSubscribeModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                    >
                        <HiPlus className="w-5 h-5" />
                        {t('channels.subscribeToChannel') || 'Subscribe to Channel'}
                    </button>
                </div>

                {/* Subscribed Channels Grid */}
                {subscribedChannels && subscribedChannels.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subscribedChannels.map((channel) => {
                            const coverUrl = channel.coverImage?.secure_url
                                || channel.iconId?.image?.secure_url
                                || (typeof channel.image === 'object' ? channel.image?.secure_url : channel.image);
                            const subCount = channel.subscriberCount ?? channel.subscribersCount;
                            return (
                                <motion.div
                                    key={channel._id || channel.id}
                                    className="bg-white rounded-xl shadow-lg border-2 border-indigo-100 p-6 hover:shadow-xl transition-shadow"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    {coverUrl ? (
                                        <img
                                            src={coverUrl}
                                            alt={channel.name || t('channels.placeholder.channelName') || 'Channel'}
                                            className="w-full h-48 object-cover rounded-lg mb-4"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-indigo-100 rounded-lg mb-4 flex items-center justify-center">
                                            <span className="text-indigo-400 text-sm">{t('channels.placeholder.channelName') || 'No Image'}</span>
                                        </div>
                                    )}
                                    <h3 className="text-xl font-semibold text-indigo-900 mb-2">
                                        {channel.name || t('channels.placeholder.channelName') || 'Unnamed Channel'}
                                    </h3>
                                    <p className="text-gray-600 text-sm mb-4">
                                        {channel.description || t('channels.noDescription') || 'No description'}
                                    </p>
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                                        {subCount !== undefined && (
                                            <span>{t('channels.subscribersCount', { count: subCount }) || `${subCount} subscribers`}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                navigate(`/dashboard/channels/${channel._id || channel.id}/files`);
                                            }}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors"
                                        >
                                            {t('channels.viewFiles') || 'View Files'}
                                        </button>
                                        <button
                                            onClick={() => unsubscribeMutation.mutate(channel._id || channel.id)}
                                            disabled={unsubscribeMutation.isLoading}
                                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm transition-colors disabled:opacity-50"
                                        >
                                            {t('filesV2.unsubscribe') || 'Unsubscribe'}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl shadow-lg border-2 border-indigo-100">
                        <FaFolder className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">
                            {t('channels.noChannels') || 'No channels subscribed yet'}
                        </p>
                        <button
                            onClick={() => setShowSubscribeModal(true)}
                            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            {t('channels.subscribeToChannel') || 'Subscribe to a channel'}
                        </button>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                        >
                            {t('filesV2.prev') || 'Previous'}
                        </button>
                        <span className="text-sm text-indigo-900 font-medium">
                            {page} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                        >
                            {t('filesV2.next') || 'Next'}
                        </button>
                    </div>
                )}

                {/* Subscribe to Channel Modal */}
                {showSubscribeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000002 }}>
                        <motion.div
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <h2 className="text-2xl font-bold text-indigo-900 mb-4">
                                {t('channels.subscribeToChannel') || 'Subscribe to Channel'}
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                                {t('channels.subscribeHint') || 'Enter the Channel ID provided by the channel owner to subscribe.'}
                            </p>
                            <form onSubmit={handleSubscribe}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('channels.channelId') || 'Channel ID'}
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={channelId}
                                            onChange={(e) => setChannelId(e.target.value)}
                                            className="flex-1 px-4 py-2 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                                            placeholder={t('channels.enterChannelId') || 'Enter channel ID'}
                                            required
                                        />
                                        {channelId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(channelId).then(() => {
                                                        toast.success(t('channels.idCopied') || 'Channel ID copied!', ToastOptions("success"));
                                                    }).catch(() => {
                                                        toast.error(t('channels.copyFailed') || 'Failed to copy', ToastOptions("error"));
                                                    });
                                                }}
                                                className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors text-sm"
                                                title={t('channels.copyId') || 'Copy ID'}
                                            >
                                                {t('channels.copy') || 'Copy'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowSubscribeModal(false)}
                                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                                    >
                                        {t('common.cancel') || 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={subscribeMutation.isLoading}
                                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {subscribeMutation.isLoading
                                            ? t('common.loading') || 'Loading...'
                                            : t('channels.subscribe') || 'Subscribe'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}

