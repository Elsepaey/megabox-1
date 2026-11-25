import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCookies } from 'react-cookie';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { channelService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { HiPlus } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import Loading from '../../components/Loading/Loading';
import './Channels.scss';

export default function PromoterChannels() {
    const [Token] = useCookies(['MegaBox']);
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Close sidenav when modal opens
    useEffect(() => {
        if (showCreateModal) {
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
    }, [showCreateModal]);

    // Form states
    const [channelName, setChannelName] = useState('');
    const [channelDescription, setChannelDescription] = useState('');
    const [channelImage, setChannelImage] = useState(null);
    const [myPage, setMyPage] = useState(1);
    const [subPage, setSubPage] = useState(1);
    const [activeTab, setActiveTab] = useState('my'); // 'my' | 'subscribed'
    const PAGE_LIMIT = 12;

    const { data: myChannelsData, isLoading: myChannelsLoading } = useQuery(
        ['myChannels', myPage],
        () => channelService.getMyChannels(Token.MegaBox, { page: myPage, limit: PAGE_LIMIT }),
        {
            enabled: !!Token.MegaBox,
            cacheTime: 300000,
            keepPreviousData: true,
        }
    );

    const { data: subscribedData, isLoading: subscribedLoading } = useQuery(
        ['mySubscribedChannels', subPage],
        () => channelService.getMySubscribedChannels(Token.MegaBox, { page: subPage, limit: PAGE_LIMIT }),
        {
            enabled: !!Token.MegaBox,
            cacheTime: 300000,
            keepPreviousData: true,
        }
    );

    const channelsLoading = activeTab === 'my' ? myChannelsLoading : subscribedLoading;

    const allChannels = useMemo(() => {
        const list = activeTab === 'my'
            ? (Array.isArray(myChannelsData?.data) ? myChannelsData.data : [])
            : (Array.isArray(subscribedData?.data) ? subscribedData.data : []);
        return list;
    }, [activeTab, myChannelsData, subscribedData]);

    const currentPage = activeTab === 'my' ? myPage : subPage;
    const setCurrentPage = activeTab === 'my' ? setMyPage : setSubPage;
    const totalPages = activeTab === 'my'
        ? (myChannelsData?.meta?.totalPages || 1)
        : (subscribedData?.meta?.totalPages || 1);
    const createChannelMutation = useMutation(
        (formData) => channelService.createChannel(
            formData.image,
            formData.name,
            formData.description,
            Token.MegaBox
        ),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('myChannels');
                queryClient.invalidateQueries('mySubscribedChannels');
                setShowCreateModal(false);
                setChannelName('');
                setChannelDescription('');
                setChannelImage(null);
            }
        }
    );

    const handleCreateChannel = (e) => {
        e.preventDefault();
        if (!channelName.trim()) {
            return;
        }
        createChannelMutation.mutate({
            name: channelName.trim(),
            description: channelDescription.trim(),
            image: channelImage
        });
    };

    if (channelsLoading) {
        return <Loading />;
    }

    return (
        <div className="Channels min-h-screen bg-indigo-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-indigo-900">
                        {t('channels.myChannels') || 'My Channels'}
                    </h1>
                    <motion.button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <HiPlus className="w-5 h-5" />
                        {t('channels.createChannel') || 'Create Channel'}
                    </motion.button>
                </div>
                <div className="flex gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('my')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'}`}
                    >
                        {t('channels.myChannels') || 'My Channels'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('subscribed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'subscribed' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'}`}
                    >
                        {t('filesV2.subscribedChannels') || 'Subscribed Channels'}
                    </button>
                </div>

                {/* Created/Subscribed Channels Grid */}
                {allChannels && allChannels.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allChannels.map((channel) => {
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

                                    <div className="mb-3 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 mb-1">{t('channels.channelId') || 'Channel ID'}:</p>
                                                <p className="text-xs font-mono text-indigo-700 truncate" title={channel._id || channel.id}>
                                                    {channel._id || channel.id}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const id = channel._id || channel.id;
                                                    navigator.clipboard.writeText(id).then(() => {
                                                        toast.success(t('channels.idCopied') || 'Channel ID copied!', ToastOptions("success"));
                                                    }).catch(() => {
                                                        toast.error(t('channels.copyFailed') || 'Failed to copy', ToastOptions("error"));
                                                    });
                                                }}
                                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors flex-shrink-0"
                                                title={t('channels.copyId') || 'Copy ID'}
                                            >
                                                {t('channels.copy') || 'Copy'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                                        {subCount !== undefined && (
                                            <span>{t('channels.subscribersCount', { count: subCount }) || `${subCount} subscribers`}</span>
                                        )}
                                        {channel.createdAt && (
                                            <span>{t('channels.createdAt') || 'Created'}: {new Date(channel.createdAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigate(`/Promoter/channels/${channel._id || channel.id}/files`);
                                        }}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors"
                                    >
                                        {t('channels.manageFiles') || 'Manage Files'}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl shadow-lg border-2 border-indigo-100">
                        <p className="text-gray-600 text-lg mb-4">
                            {t('channels.noChannelsCreated') || 'No channels created yet'}
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium"
                        >
                            {t('channels.createFirstChannel') || 'Create Your First Channel'}
                        </button>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                        >
                            {t('filesV2.prev') || 'Previous'}
                        </button>
                        <span className="text-sm text-indigo-900 font-medium">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="px-4 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                        >
                            {t('filesV2.next') || 'Next'}
                        </button>
                    </div>
                )}

                {/* Create Channel Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000002 }}>
                        <motion.div
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <h2 className="text-2xl font-bold text-indigo-900 mb-4">
                                {t('channels.createChannel') || 'Create Channel'}
                            </h2>
                            <form onSubmit={handleCreateChannel}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('channels.channelName') || 'Channel Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={channelName}
                                        onChange={(e) => setChannelName(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('channels.description') || 'Description'}
                                    </label>
                                    <textarea
                                        value={channelDescription}
                                        onChange={(e) => setChannelDescription(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                                        rows="3"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('channels.channelImage') || 'Channel Image'}
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setChannelImage(e.target.files[0] || null)}
                                        className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                                    >
                                        {t('common.cancel') || 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createChannelMutation.isLoading}
                                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {createChannelMutation.isLoading
                                            ? t('common.loading') || 'Loading...'
                                            : t('channels.create') || 'Create'}
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

