import React, { useEffect, useState } from 'react';
import './VideoPreview.scss';
import PreviewNav from '../../components/PreviewNav/PreviewNav';
import { GiSave } from "react-icons/gi";
import { CiMobile3 } from "react-icons/ci";
import { FaFile, FaEye } from "react-icons/fa";
import { LuFolder } from "react-icons/lu";
import { HiArrowLeft } from "react-icons/hi2";
import FilePreview from './FilePreview';
import Represents from '../../components/Represents/Represents';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { extractBranchDataFromUrl } from '../../helpers/Deeplink';
import { fileService } from '../../services/api';
import { itemsService } from '../../services/itemsService';
import Loading from '../../components/Loading/Loading';
import { DateFormatter } from '../../helpers/DateFormates';
import { GetFileTypeByName } from '../../helpers/GetFileTypeByName';
import { useCookies } from 'react-cookie';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import { useLanguage } from '../../context/LanguageContext';

const SHARE_PAGE_LIMIT = 20;

export default function VideoPreview() {
    const { VideoId } = useParams();
    const [searchParams] = useSearchParams();
    const [fileData, setFileData] = useState(null);
    const [shareItems, setShareItems] = useState([]);
    const [shareMeta, setShareMeta] = useState(null);
    const [shareId, setShareId] = useState(null);
    const [page, setPage] = useState(1);
    const [contentType, setContentType] = useState('file'); // 'file' | 'share'
    const [fileLoading, setFileLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [previewState, setPreviewState] = useState({ open: false, path: null, type: null });
    const [Token] = useCookies(['MegaBox']);
    const navigate = useNavigate();
    const { t } = useLanguage();

    const folderIdParam = searchParams.get('folderId');

    useEffect(() => {
        setPage(1);
    }, [VideoId, folderIdParam]);

    useEffect(() => {
        const loadContent = async () => {
            if (!Token.MegaBox) {
                setFileLoading(false);
                return;
            }

            setFileLoading(true);
            try {
                let resolvedId = VideoId;
                try {
                    const branchData = await extractBranchDataFromUrl(window.location.href);
                    if (branchData?.shareId) resolvedId = branchData.shareId;
                    else if (branchData?.fileId) resolvedId = branchData.fileId;
                } catch {
                    // Branch SDK unavailable — use URL param directly
                }

                if (!resolvedId) {
                    navigate('/');
                    return;
                }

                try {
                    const shareResp = await fileService.getShareItems(resolvedId, Token.MegaBox, {
                        page,
                        limit: SHARE_PAGE_LIMIT,
                        folderId: folderIdParam || undefined,
                    });
                    const items = Array.isArray(shareResp?.data) ? shareResp.data : [];
                    setShareId(resolvedId);
                    setShareItems(items);
                    setShareMeta(shareResp?.meta || null);
                    setContentType('share');
                    return;
                } catch {
                    // Not a share ID — fall back to loading as a direct file (GET /files/:id)
                }

                const details = await itemsService.getFileDetails(Token.MegaBox, resolvedId);
                setFileData({
                    ...details,
                    name: details?.fileName || details?.name,
                    url: details?.accessUrl || details?.url,
                    fileType: details?.fileType || GetFileTypeByName(details?.fileName || details?.name),
                });
                setContentType('file');
            } catch (error) {
                console.error('Error loading content:', error);
                toast.error(error?.response?.data?.message || "Failed to load content", ToastOptions("error"));
                navigate('/');
            } finally {
                setFileLoading(false);
            }
        };

        loadContent();
    }, [VideoId, folderIdParam, page, Token.MegaBox, navigate]);

    const handleSaveItem = async (itemId, itemType = 'file') => {
        if (!Token.MegaBox) {
            toast.error("Please login to save files", ToastOptions("error"));
            navigate('/login');
            return;
        }
        if (!itemId) {
            toast.error("Item ID not found", ToastOptions("error"));
            return;
        }
        setSavingId(itemId);
        try {
            await fileService.saveFile(itemId, Token.MegaBox, {
                itemType,
                shareId: shareId || undefined,
            });
        } catch {
            // Error toast handled in fileService.saveFile
        } finally {
            setSavingId(null);
        }
    };

    const handleOpenSharedFile = async (file) => {
        const fileId = file._id || file.id;
        if (!fileId || !Token.MegaBox) return;
        try {
            const details = await itemsService.getFileDetails(Token.MegaBox, fileId);
            const accessUrl = details?.accessUrl || details?.url;
            if (!accessUrl) {
                toast.error(t('files.failedToLoadFile') || 'File URL not available', ToastOptions('error'));
                return;
            }
            setPreviewState({
                open: true,
                path: accessUrl,
                type: details?.fileType || file.fileType || GetFileTypeByName(file.fileName || file.name),
            });
        } catch (err) {
            if (err?.response?.status === 403) {
                toast.info(
                    err?.response?.data?.message || t('filesV2.saveRequiredToPreview') || 'Save this file to MegaBox first to preview or download it.',
                    ToastOptions('info')
                );
            } else {
                toast.error(err?.response?.data?.message || 'Failed to open file', ToastOptions('error'));
            }
        }
    };

    const closePreview = () => setPreviewState({ open: false, path: null, type: null });

    if (fileLoading) return <Loading />;

    if (!Token.MegaBox) {
        return (
            <div className="VideoPreviewLayout min-h-screen">
                <PreviewNav />
                <section className="VideoPreview_main">
                    <div className="VideoPreview container mx-auto max-w-md text-center bg-white rounded-xl shadow-md p-8 mt-10">
                        <h2 className="text-xl font-bold text-indigo-900 mb-3">
                            {t('filesV2.loginToViewShare') || 'Sign in to view shared content'}
                        </h2>
                        <p className="text-sm text-gray-600 mb-6">
                            {t('filesV2.loginToViewShareDesc') || 'Please log in to your MegaBox account to access shared files and folders.'}
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                        >
                            {t('common.login') || 'Log in'}
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    if (contentType === 'share') {
        const folders = shareItems.filter((item) => item.itemType === 'folder' || item.isFolder);
        const files = shareItems.filter((item) => item.itemType !== 'folder' && !item.isFolder);
        const totalPages = shareMeta?.totalPages || 1;

        return (
            <div className="VideoPreviewLayout min-h-screen">
                <PreviewNav />
                <section className="VideoPreview_main">
                    <div className="VideoPreview container mx-auto">
                        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <LuFolder className="w-8 h-8 text-indigo-600" />
                                <div>
                                    <h2 className="text-xl font-semibold dark:text-white">
                                        {t('filesV2.sharedItems') || 'Shared Items'}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {shareMeta?.total ?? shareItems.length} {t('files.itemsCount') || 'items'}
                                    </p>
                                </div>
                            </div>
                            {folderIdParam && (
                                <button
                                    onClick={() => navigate(`/share/${shareId}`)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                >
                                    <HiArrowLeft className="w-4 h-4" />
                                    {t('filesV2.backToShareRoot') || 'Back to shared items'}
                                </button>
                            )}
                        </div>

                        {folders.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('files.folders') || 'Folders'}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {folders.map((folder) => {
                                        const fId = folder._id || folder.id;
                                        return (
                                            <div
                                                key={fId}
                                                className="bg-white rounded-lg border-2 border-indigo-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-3"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/share/${shareId}?folderId=${fId}`)}
                                                    className="flex items-center gap-3 text-left w-full"
                                                >
                                                    <LuFolder className="w-10 h-10 text-indigo-600 flex-shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-indigo-900 truncate">{folder.name}</p>
                                                        <p className="text-xs text-indigo-500">{t('folder.folder') || 'Folder'}</p>
                                                    </div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveItem(fId, 'folder')}
                                                    disabled={savingId === fId}
                                                    className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <GiSave className="w-4 h-4" />
                                                    {savingId === fId ? (t('common.loading') || 'Saving...') : (t('filesV2.saveToMegaBox') || 'Save to MegaBox')}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {files.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('files.files') || 'Files'}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {files.map((file) => {
                                        const fId = file._id || file.id;
                                        const name = file.fileName || file.name || 'File';
                                        return (
                                            <div
                                                key={fId}
                                                className="bg-white rounded-lg border-2 border-indigo-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-3"
                                            >
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => handleOpenSharedFile(file)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleOpenSharedFile(file)}
                                                    className="cursor-pointer"
                                                >
                                                    {file.thumbnailUrl ? (
                                                        <img
                                                            src={file.thumbnailUrl}
                                                            alt={name}
                                                            className="w-full h-36 object-cover rounded-md mb-2"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-36 bg-indigo-50 rounded-md mb-2 flex items-center justify-center">
                                                            <FaFile className="w-10 h-10 text-indigo-400" />
                                                        </div>
                                                    )}
                                                    <p className="font-semibold text-indigo-900 truncate text-sm" title={name}>{name}</p>
                                                    {file.createdAt && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{DateFormatter(file.createdAt)}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenSharedFile(file)}
                                                        className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1"
                                                    >
                                                        <FaEye className="w-3.5 h-3.5" />
                                                        {t('file.open') || 'Preview'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveItem(fId, 'file')}
                                                        disabled={savingId === fId}
                                                        className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                                                    >
                                                        <GiSave className="w-3.5 h-3.5" />
                                                        {savingId === fId ? (t('common.loading') || 'Saving...') : (t('filesV2.saveToMegaBox') || 'Save')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {folders.length === 0 && files.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500 dark:text-gray-400">{t('files.noItems') || 'No items found'}</p>
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-6">
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
                    </div>
                </section>
                {previewState.open && (
                    <Represents
                        path={previewState.path}
                        type={previewState.type}
                        ToggleUploadFile={closePreview}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="VideoPreviewLayout min-h-screen">
            <PreviewNav />
            <section className="VideoPreview_main">
                <div className="VideoPreview container mx-auto flex lg:flex-nowrap gap-3 flex-wrap">
                    <div className="lg:w-1/3 w-full VideoPreview_buttons flex flex-col items-center gap-3">
                        <button
                            onClick={() => handleSaveItem(fileData?._id || fileData?.id, 'file')}
                            disabled={savingId === (fileData?._id || fileData?.id)}
                            className="First_Button"
                        >
                            {savingId ? (t('common.loading') || 'Saving...') : (t('filesV2.saveToMegaBox') || 'Save to MegaBox')} <GiSave />
                        </button>
                        {fileData?.url && (
                            <a
                                href={fileData.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="Main_Button text-center"
                            >
                                Download
                            </a>
                        )}
                        <a href='https://play.google.com/store/apps/details?id=com.dubox.drive' className="First_Button">
                            Show it in application <CiMobile3 />
                        </a>
                    </div>

                    <div className="lg:w-3/4 w-full VideoPreview_main_sec2">
                        <div className="h-[80px] border-b flex justify-start">
                            <div className="flex items-center gap-4 h-full px-3">
                                <FaFile className="w-10 h-10 FileTypeIcon" />
                                <div className="font-medium dark:text-white">
                                    <div>{fileData?.name || fileData?.fileName}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {DateFormatter(fileData?.createdAt)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center items-center">
                            <FilePreview fileType={fileData} />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
