import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCookies } from 'react-cookie';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { channelService, fileService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { FaUpload, FaFile, FaBell } from 'react-icons/fa';
import { LuFolder } from 'react-icons/lu';
import { HiArrowLeft, HiCloud } from 'react-icons/hi2';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import Loading from '../../components/Loading/Loading';
import File from '../../components/File/File';
import Represents from '../../components/Represents/Represents';
import ChangeName from '../../components/ChangeName/ChangeName';
import { getFileCategory } from '../../helpers/MimeType';
import UploadFile from '../../components/Upload/UploadFile/UploadFile';
import UploadFromMegaBox from '../../components/Upload/UploadFromMegaBox/UploadFromMegaBox';
import './Channels.scss';

const CHANNEL_ITEMS_LIMIT = 20;

export default function ChannelFiles() {
    const { channelId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;
    const [Token] = useCookies(['MegaBox']);
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [page, setPage] = useState(1);
    const [previewState, setPreviewState] = useState({ open: false, path: null, type: null });
    const [renameState, setRenameState] = useState({ open: false, name: '', id: null, isFolder: false });

    const folderIdParam = searchParams.get('folderId') || undefined;

    useEffect(() => {
        setPage(1);
    }, [channelId, folderIdParam]);

    useEffect(() => {
        if (showUploadModal) {
            const sidebarBackdrop = document.querySelector('.dropback');
            const sidebarToggle = document.querySelector('.bars');
            if (sidebarBackdrop && sidebarBackdrop.classList.contains('apper-dropback')) {
                sidebarBackdrop.click();
            } else if (sidebarToggle) {
                window.dispatchEvent(new CustomEvent('closeSidebar'));
            }
        }
    }, [showUploadModal]);

    const refetchChannelFiles = () => {
        queryClient.invalidateQueries(['channelFiles', channelId]);
    };

    const { data: myChannelsData } = useQuery(
        ['myChannels', 'all'],
        () => channelService.getMyChannels(Token.MegaBox, { page: 1, limit: 100 }),
        {
            enabled: !!Token.MegaBox && !!channelId,
            cacheTime: 300000
        }
    );

    const { data: subscribedChannelsData } = useQuery(
        ['mySubscribedChannels', 'all'],
        () => channelService.getMySubscribedChannels(Token.MegaBox, { page: 1, limit: 100 }),
        {
            enabled: !!Token.MegaBox && !!channelId,
            cacheTime: 300000
        }
    );

    const { data: channelItemsResponse, isLoading: filesLoading } = useQuery(
        ['channelFiles', channelId, folderIdParam || 'root', page],
        () => channelService.getUserFilesInChannel(channelId, Token.MegaBox, {
            page,
            limit: CHANNEL_ITEMS_LIMIT,
            folderId: folderIdParam,
        }),
        {
            enabled: !!Token.MegaBox && !!channelId,
            cacheTime: 300000,
            keepPreviousData: true,
        }
    );

    const items = useMemo(() => {
        if (Array.isArray(channelItemsResponse?.data)) return channelItemsResponse.data;
        if (Array.isArray(channelItemsResponse?.files)) return channelItemsResponse.files;
        return [];
    }, [channelItemsResponse]);

    const folders = useMemo(
        () => items.filter((it) => it.itemType === 'folder' || it.isFolder),
        [items]
    );
    const files = useMemo(
        () => items.filter((it) => it.itemType !== 'folder' && !it.isFolder),
        [items]
    );

    const totalPages = channelItemsResponse?.meta?.totalPages || 1;
    const totalCount = channelItemsResponse?.meta?.total ?? items.length;

    const isOwner = useMemo(() => {
        const myChannels = Array.isArray(myChannelsData?.data) ? myChannelsData.data : [];
        return myChannels.some((ch) => (ch._id || ch.id) === channelId);
    }, [myChannelsData, channelId]);

    const channelInfo = useMemo(() => {
        const allChannels = [
            ...(Array.isArray(myChannelsData?.data) ? myChannelsData.data : []),
            ...(Array.isArray(subscribedChannelsData?.data) ? subscribedChannelsData.data : []),
        ];
        return allChannels.find((channel) => (channel._id || channel.id) === channelId) || null;
    }, [myChannelsData, subscribedChannelsData, channelId]);

    useEffect(() => {
        if (subscribedChannelsData && channelId && !isOwner) {
            const subscribedChannels = Array.isArray(subscribedChannelsData?.data) ? subscribedChannelsData.data : [];
            const isChannelSubscribed = subscribedChannels.some(
                (channel) => (channel._id || channel.id) === channelId
            );
            setIsSubscribed(isChannelSubscribed);
        }
    }, [subscribedChannelsData, channelId, isOwner]);

    const subscribeMutation = useMutation(
        () => channelService.subscribeToChannel(channelId, Token.MegaBox),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['channelFiles', channelId]);
                queryClient.invalidateQueries('mySubscribedChannels');
                setIsSubscribed(true);
            },
            onError: (error) => {
                if (error?.response?.status === 400 || error?.response?.status === 409) {
                    setIsSubscribed(true);
                    queryClient.invalidateQueries('mySubscribedChannels');
                }
            }
        }
    );

    const unsubscribeMutation = useMutation(
        () => channelService.unsubscribeFromChannel(channelId, Token.MegaBox),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('mySubscribedChannels');
                setIsSubscribed(false);
            }
        }
    );

    const handleSubscribe = () => {
        subscribeMutation.mutate();
    };

    const openPreview = (resolved) => {
        const url = resolved?.url || resolved?.accessUrl;
        if (!url) return;
        setPreviewState({ open: true, path: url, type: resolved?.fileType || resolved?.type });
    };

    const closePreview = () => setPreviewState({ open: false, path: null, type: null });

    const handleRenameToggle = (name, close, id, isFolder = false) => {
        if (close) {
            setRenameState({ open: false, name: '', id: null, isFolder: false });
            return;
        }
        setRenameState({ open: true, name, id, isFolder });
    };

    const handleDeleteFile = async (item) => {
        const fileId = item?._id || item?.id;
        if (!fileId) return;
        try {
            await fileService.deleteFile(fileId, Token.MegaBox);
            toast.success(t('files.fileDeleted') || 'File deleted successfully', ToastOptions('success'));
            refetchChannelFiles();
        } catch {
            toast.error(t('files.deleteError') || 'Failed to delete file', ToastOptions('error'));
        }
    };

    const coverUrl = channelInfo?.coverImage?.secure_url
        || channelInfo?.iconId?.image?.secure_url
        || (typeof channelInfo?.image === 'object' ? channelInfo?.image?.secure_url : channelInfo?.image);
    const subCount = channelInfo?.subscriberCount ?? channelInfo?.subscribersCount;

    if (filesLoading) {
        return <Loading />;
    }

    return (
        <div className="ChannelFiles min-h-screen bg-indigo-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={() => {
                                const isPromoterRoute = pathname?.includes('/Promoter');
                                navigate(isPromoterRoute ? '/Promoter/channels' : '/dashboard/channels');
                            }}
                            className="text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            ← {t('channels.backToChannels') || 'Back to Channels'}
                        </button>
                        {folderIdParam && (
                            <button
                                type="button"
                                onClick={() => setSearchParams({})}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-200 rounded-lg text-sm text-indigo-700 hover:bg-indigo-50"
                            >
                                <HiArrowLeft className="w-4 h-4" />
                                {t('filesV2.backToChannelRoot') || 'Channel root'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {!isOwner && (
                            <>
                                {!isSubscribed ? (
                                    <motion.button
                                        onClick={handleSubscribe}
                                        disabled={subscribeMutation.isLoading}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaBell className="w-5 h-5" />
                                        {subscribeMutation.isLoading
                                            ? (t('common.loading') || 'Loading...')
                                            : (t('channels.subscribeToChannel') || 'Subscribe to Channel')
                                        }
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        onClick={() => unsubscribeMutation.mutate()}
                                        disabled={unsubscribeMutation.isLoading}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaBell className="w-5 h-5" />
                                        {t('filesV2.unsubscribe') || 'Unsubscribe'}
                                    </motion.button>
                                )}
                            </>
                        )}
                        {isOwner && (
                            <>
                                <motion.button
                                    onClick={() => setShowCopyModal(true)}
                                    className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <HiCloud className="w-5 h-5" />
                                    {t('filesV2.copyFromMegaBoxTitle') || 'Copy from MegaBox'}
                                </motion.button>
                                <motion.button
                                    onClick={() => setShowUploadModal(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FaUpload className="w-5 h-5" />
                                    {t('channels.uploadFile') || 'Upload File'}
                                </motion.button>
                            </>
                        )}
                    </div>
                </div>

                {/* Channel Info Section */}
                <div className="mb-6 bg-white rounded-xl shadow-lg border-2 border-indigo-100 p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="flex-shrink-0">
                            {coverUrl ? (
                                <img
                                    src={coverUrl}
                                    alt={channelInfo?.name || t('channels.placeholder.channelName') || 'Channel'}
                                    className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-lg border-2 border-indigo-200 shadow-md"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="w-32 h-32 md:w-40 md:h-40 bg-indigo-100 rounded-lg border-2 border-indigo-200 flex items-center justify-center shadow-md">
                                    <span className="text-indigo-400 text-4xl">📺</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-indigo-900 mb-2">
                                {channelInfo?.name || t('channels.placeholder.channelName') || t('channels.channelName') || 'Channel Name'}
                            </h1>
                            <p className="text-gray-600 mb-4 text-base">
                                {channelInfo?.description || t('channels.noDescription') || t('channels.placeholder.noDescription') || 'No description available'}
                            </p>

                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
                                    <span className="text-indigo-600 font-semibold">
                                        {totalCount} {t('files.itemsCount') || 'items'}
                                    </span>
                                </div>
                                {subCount !== undefined && (
                                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
                                        <span className="text-indigo-600 font-semibold">
                                            {t('channels.subscribersCount', { count: subCount }) || `${subCount} ${t('channels.subscribers') || 'subscribers'}`}
                                        </span>
                                    </div>
                                )}
                                {channelInfo?.createdAt && (
                                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
                                        <span className="text-indigo-600 font-semibold">
                                            {t('channels.createdAt')}: {new Date(channelInfo.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Channel Folders */}
                {folders.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-indigo-900 mb-3">
                            {t('files.folders') || 'Folders'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {folders.map((folder) => {
                                const fId = folder._id || folder.id;
                                return (
                                    <button
                                        key={fId}
                                        type="button"
                                        onClick={() => setSearchParams({ folderId: fId })}
                                        className="bg-white rounded-lg border-2 border-indigo-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex items-center gap-3 text-left"
                                    >
                                        <LuFolder className="w-10 h-10 text-indigo-600 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-indigo-900 truncate">{folder.name}</p>
                                            <p className="text-xs text-indigo-500">{t('folder.folder') || 'Folder'}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Channel Files */}
                {files.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {files.map((file) => (
                            <File
                                key={file._id || file.id}
                                Type={getFileCategory(file.fileType || file.mimeType || '')}
                                data={{
                                    ...file,
                                    fileName: file.fileName || file.name || t('channels.placeholder.fileName') || 'Unnamed File',
                                    url: file.accessUrl || file.url || file.fileUrl || file.downloadUrl || '',
                                    fileSize: file.fileSize || file.size || 0,
                                    createdAt: file.createdAt || file.uploadedAt || ''
                                }}
                                viewMode="grid"
                                readOnly={!isOwner}
                                onOpen={openPreview}
                                onRename={isOwner ? handleRenameToggle : undefined}
                                onDelete={isOwner ? handleDeleteFile : undefined}
                                refetch={refetchChannelFiles}
                            />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {folders.length === 0 && files.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl shadow-lg border-2 border-indigo-100">
                        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaFile className="w-12 h-12 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {t('channels.placeholder.noResults') || 'No files found'}
                        </h3>
                        <p className="text-gray-600 text-lg mb-4">
                            {t('channels.noFiles') || 'No files in this channel yet'}
                        </p>
                        {isOwner && (
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                {t('channels.uploadFirstFile') || 'Upload the first file'}
                            </button>
                        )}
                        {!isOwner && !isSubscribed && (
                            <button
                                onClick={handleSubscribe}
                                disabled={subscribeMutation.isLoading}
                                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {subscribeMutation.isLoading
                                    ? (t('common.loading') || 'Loading...')
                                    : (t('channels.subscribeToChannel') || 'Subscribe to Channel')
                                }
                            </button>
                        )}
                    </div>
                )}

                {/* Pagination */}
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

                {showUploadModal && (
                    <UploadFile
                        ToggleUploadFile={() => setShowUploadModal(false)}
                        refetch={refetchChannelFiles}
                        isChannel={true}
                        id={channelId}
                    />
                )}
                {showCopyModal && (
                    <UploadFromMegaBox
                        onClose={() => setShowCopyModal(false)}
                        channelId={channelId}
                        targetFolderId={folderIdParam}
                        refetch={refetchChannelFiles}
                    />
                )}
                {previewState.open && (
                    <Represents
                        path={previewState.path}
                        type={previewState.type}
                        ToggleUploadFile={closePreview}
                    />
                )}
                {renameState.open && (
                    <ChangeName
                        oldFileName={renameState.name}
                        Toggle={handleRenameToggle}
                        refetch={refetchChannelFiles}
                        FileId={renameState.id}
                        isFolder={renameState.isFolder}
                    />
                )}
            </div>
        </div>
    );
}
