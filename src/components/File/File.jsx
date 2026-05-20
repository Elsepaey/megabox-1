import React, { useState, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { RiFolderVideoFill } from "react-icons/ri";
import { IoImageSharp, IoDocumentsSharp } from "react-icons/io5";
import { AgoFormatter } from '../../helpers/DateFormates';
import { FiArchive, FiMoreVertical, FiFolder } from 'react-icons/fi';
import { HiTrash, HiPencil, HiShare, HiFolderOpen, HiEye } from "react-icons/hi2";
import { FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt, FaPlay } from 'react-icons/fa';
import { LuFileArchive } from 'react-icons/lu';
import { useAuth } from '../../context/AuthContext';
import { useCookies } from 'react-cookie';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import { API_URL, fileService } from '../../services/api';
import { itemsService } from '../../services/itemsService';
import { useQueryClient } from 'react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

// Helper function to get document icon based on file extension
const getDocumentIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FaFilePdf className='w-16 h-16 text-red-600' />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className='w-16 h-16 text-blue-600' />;
    if (['xls', 'xlsx'].includes(ext)) return <FaFileExcel className='w-16 h-16 text-green-600' />;
    if (['ppt', 'pptx'].includes(ext)) return <FaFilePowerpoint className='w-16 h-16 text-orange-600' />;
    return <FaFileAlt className='w-16 h-16 text-indigo-600' />;
};

const typeConfig = {
    image: {
        icon: <IoImageSharp className='text-secondary-600 w-[25px] h-[25px]' />,
        previewStyle: (url, fileName, data) => {
            // Use thumbnail if available, fallback to full image
            const imageUrl = data?.thumbnailUrl || url;
            return {
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        },
    },
    video: {
        icon: <RiFolderVideoFill className='text-secondary-600 w-[25px] h-[25px]' />,
        previewStyle: () => ({
            background: '#000',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }),
        previewComponent: (url, fileName, data) => {
            // Use thumbnail image if available, otherwise show video preview
            if (data?.thumbnailUrl) {
                return (
                    <div className="w-full h-full relative bg-black flex items-center justify-center" style={{ zIndex: 1, position: 'relative', pointerEvents: 'none' }}>
                        <img
                            src={data.thumbnailUrl}
                            alt={fileName || 'Video thumbnail'}
                            className="w-full h-full object-cover"
                            style={{ zIndex: 1, position: 'relative', pointerEvents: 'none' }}
                            onError={(e) => {
                                // Fallback to video preview if thumbnail fails to load
                                e.target.style.display = 'none';
                                const videoEl = e.target.parentElement.querySelector('video');
                                if (videoEl) videoEl.style.display = 'block';
                            }}
                        />
                        <video
                            src={url}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                            playsInline
                            style={{ zIndex: 1, position: 'relative', pointerEvents: 'none', display: 'none' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-colors" style={{ zIndex: 2, position: 'absolute', pointerEvents: 'none' }}>
                            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 border-4 border-white/40 shadow-2xl transform hover:scale-110 transition-transform" style={{ pointerEvents: 'none' }}>
                                <FaPlay className="w-8 h-8 text-white ml-1" />
                            </div>
                        </div>
                        {/* Show processing badge if video is not ready */}
                        {data?.readyToStream === false && (
                            <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-md shadow-lg" style={{ zIndex: 3 }}>
                                Processing...
                            </div>
                        )}
                    </div>
                );
            }

            // Fallback to video preview
            return (
                <div className="w-full h-full relative bg-black flex items-center justify-center" style={{ zIndex: 1, position: 'relative', pointerEvents: 'none' }}>
                    <video
                        src={url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        playsInline
                        style={{ zIndex: 1, position: 'relative', pointerEvents: 'none' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-colors" style={{ zIndex: 2, position: 'absolute', pointerEvents: 'none' }}>
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 border-4 border-white/40 shadow-2xl transform hover:scale-110 transition-transform" style={{ pointerEvents: 'none' }}>
                            <FaPlay className="w-8 h-8 text-white ml-1" />
                        </div>
                    </div>
                    {/* Show processing badge if video is not ready */}
                    {data?.readyToStream === false && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-md shadow-lg" style={{ zIndex: 3 }}>
                            Processing...
                        </div>
                    )}
                </div>
            );
        },
    },
    document: {
        icon: <IoDocumentsSharp className='text-secondary-600 w-[25px] h-[25px]' />,
        previewStyle: (url, fileName) => {
            const ext = fileName?.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') {
                return {
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                };
            }
            return {
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            };
        },
        previewComponent: (url, fileName) => {
            const ext = fileName?.split('.').pop()?.toLowerCase();

            // For PDFs, show actual PDF preview
            if (ext === 'pdf') {
                return (
                    <div className="w-full h-full bg-white" style={{ pointerEvents: 'none' }}>
                        <iframe
                            src={`${url}#view=FitH`}
                            className="w-full h-full border-0"
                            title="PDF Preview"
                            style={{ pointerEvents: 'none' }}
                        />
                    </div>
                );
            }

            // For other documents, show icon with better styling
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
                    {getDocumentIcon(fileName)}
                    <p className="mt-3 text-sm font-semibold text-indigo-700">Document</p>
                </div>
            );
        }
    },
    zip: {
        icon: <FiFolder className='text-secondary-600 w-[25px] h-[25px]' />,
        previewStyle: () => ({
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
        }),
        previewComponent: () => (
            <div className="w-full h-full relative bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-start justify-start p-3" style={{ zIndex: 1, position: 'relative', pointerEvents: 'none' }}>
                {/* Folder tab */}
                <div className="absolute top-2 left-3 w-12 h-2 bg-amber-400 rounded-t-sm" style={{ zIndex: 2, position: 'absolute', pointerEvents: 'none' }}></div>

                {/* Folder body with files */}
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg border-2 border-amber-300/50 shadow-inner mt-3 p-3 flex flex-col gap-2" style={{ zIndex: 1, position: 'relative', pointerEvents: 'none' }}>
                    {/* File representations */}
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-8 bg-blue-500/60 rounded-sm shadow-sm"></div>
                        <div className="flex-1 h-2 bg-amber-600/30 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-8 bg-green-500/60 rounded-sm shadow-sm"></div>
                        <div className="flex-1 h-2 bg-amber-600/30 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-8 bg-purple-500/60 rounded-sm shadow-sm"></div>
                        <div className="flex-1 h-2 bg-amber-600/30 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-8 bg-red-500/60 rounded-sm shadow-sm"></div>
                        <div className="flex-1 h-2 bg-amber-600/30 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <LuFileArchive className="w-5 h-5 text-amber-700" />
                        <span className="text-xs font-semibold text-amber-800">ZIP Archive</span>
                    </div>
                </div>
            </div>
        ),
        isDownloadOnly: false,
    }
};

export default function File({ Type, data, Representation, onRename, refetch, onShare, viewMode, isSelectionMode, isSelected, onToggleSelect, onOpen }) {

    const [showMenu, setShowMenu] = useState(false);
    const { url, createdAt, fileName, fileType, _id } = data;
    const config = typeConfig[Type];
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    const { t, language } = useLanguage();
    const navigate = useNavigate();

    const [MegaBox] = useCookies(['MegaBox'])
    const queryClient = useQueryClient();

    const { DeleteFile } = useAuth();

    const truncateString = (str) =>
        str?.length <= 20 ? str : str?.slice(0, 20) + '...';

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                showMenu &&
                menuRef.current &&
                buttonRef.current &&
                !menuRef.current.contains(event.target) &&
                !buttonRef.current.contains(event.target)
            ) {
                setShowMenu(false);
            }
        };

        // Handle both mouse and touch events
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showMenu]);

    const handleOpenFile = async () => {
        if (Type === 'zip') {
            setShowMenu(false);
            // Guard against undefined fileName or _id
            if (!fileName || !_id) {
                console.error('Cannot open zip: missing fileName or _id', { fileName, _id, data });
                toast.error("Cannot open file: missing file information", ToastOptions("error"));
                return;
            }
            const currentPath = window.location.pathname;
            let basePath = '/dashboard';
            if (currentPath.startsWith('/Promoter')) {
                basePath = '/Promoter';
            } else if (currentPath.startsWith('/Owner')) {
                basePath = '/Owner';
            }
            navigate(`${basePath}/zip/${encodeURIComponent(fileName)}/${_id}`);
            return;
        }

        // Try to get a fresh signed URL from the new file-details endpoint.
        // The URL on the listing is short-lived; refetching avoids 403s on
        // images that have been visible for a while.
        let fileUrl = url || data?._sharedUrl || data?.sharedUrl || data?.shareLink;
        let resolvedType = fileType;
        if (_id && MegaBox?.MegaBox) {
            try {
                const details = await itemsService.getFileDetails(MegaBox.MegaBox, _id);
                if (details?.accessUrl) fileUrl = details.accessUrl;
                if (details?.fileType) resolvedType = details.fileType;
            } catch (e) {
                // Non-fatal — fall back to the listing URL.
                console.warn('getFileDetails failed, using listing url', e);
            }
        }

        if (!fileUrl) {
            toast.error("File URL not available", ToastOptions("error"));
            return;
        }

        if (Type === 'image' || Type === 'video' || Type === 'document') {
            // Use onOpen callback if provided (UnifiedItemList), otherwise use Representation (old Files.jsx)
            if (onOpen) {
                onOpen(data);
            } else if (Representation) {
                Representation(fileUrl, resolvedType);
            }
        }
    };


    const handleArchive = async () => {
        try {
            setShowMenu(false);
            
            // Call API first
            await fileService.archiveFile(_id, MegaBox.MegaBox);

            const fileIdStr = String(_id);
            
            // Remove from ALL filter caches immediately (including "All" with capital A)
            const filterKeys = ["All", "all", "image", "video", "document", "zip"];
            filterKeys.forEach(key => {
                queryClient.setQueryData(["GetUserFiles", key], (oldData) => {
                    if (!oldData?.files) return oldData;
                    return {
                        ...oldData,
                        files: oldData.files.filter(f => {
                            const fId = String(f._id || f.id);
                            return fId !== fileIdStr;
                        })
                    };
                });
            });
            
            // Also remove from getMyZips cache if this is a zip file
            queryClient.setQueryData("getMyZips", (oldData) => {
                if (!oldData?.zips && !oldData?.files) return oldData;
                const zips = oldData?.zips || oldData?.files || [];
                return {
                    ...oldData,
                    zips: zips.filter(zip => {
                        const zipId = String(zip._id || zip.id);
                        return zipId !== fileIdStr;
                    }),
                    files: zips.filter(zip => {
                        const zipId = String(zip._id || zip.id);
                        return zipId !== fileIdStr;
                    })
                };
            });
            
            // Invalidate all file queries to force refetch on next access
            queryClient.invalidateQueries({ queryKey: ["GetUserFiles"] });
            queryClient.invalidateQueries({ queryKey: ["GetArchivedFilesCount"] });
            queryClient.invalidateQueries({ queryKey: ["getMyZips"] });
            queryClient.invalidateQueries({ queryKey: ["getMyArchives"] });
            
            // Update archived count
            queryClient.setQueryData("GetArchivedFilesCount", (oldCount) => {
                return (oldCount || 0) + 1;
            });
            
            toast.success(t("file.fileArchivedSuccessfully") || "File archived successfully", ToastOptions("success"));

            if (refetch) {
                await refetch();
            }
        } catch {
            toast.error(t("file.failedToArchiveFile") || "Failed to archive file", ToastOptions("error"));
        }
    };

    const handleUnarchive = async () => {
        try {
            setShowMenu(false);
            
            // Call API first
            await fileService.unarchiveFile(_id, MegaBox.MegaBox);
            
            // Remove from archived cache
            queryClient.setQueryData(["GetUserFiles", "archived"], (oldData) => {
                if (!oldData?.files) return oldData;
                return {
                    ...oldData,
                    files: oldData.files.filter(f => (f._id || f.id) !== _id)
                };
            });
            
            // Add back to all filter caches (All, image, video, document, zip)
            const filterKeys = ["All", "all", "image", "video", "document", "zip"];
            const unarchivedFile = { ...data, archived: false, isArchived: false };
            
            filterKeys.forEach(key => {
                queryClient.setQueryData(["GetUserFiles", key], (oldData) => {
                    if (!oldData?.files) {
                        return { files: [unarchivedFile] };
                    }
                    // Check if file already exists to avoid duplicates
                    const exists = oldData.files.some(f => (f._id || f.id) === _id);
                    if (exists) {
                        return oldData;
                    }
                    return {
                        ...oldData,
                        files: [...oldData.files, unarchivedFile]
                    };
                });
            });
            
            // Update archived count
            queryClient.setQueryData("GetArchivedFilesCount", (oldCount) => {
                return Math.max(0, (oldCount || 0) - 1);
            });
            
            // Invalidate all queries to force refetch - including getMyArchives
            queryClient.invalidateQueries({ queryKey: ["GetUserFiles"] });
            queryClient.invalidateQueries({ queryKey: ["GetArchivedFilesCount"] });
            queryClient.invalidateQueries({ queryKey: ["getMyArchives"] });
            
            // Show success message
            toast.success("File unarchived successfully", ToastOptions("success"));
            
            // Refetch to update UI
            if (refetch) {
                await refetch();
            }
            
        } catch (error) {
            console.error("Unarchive error:", error);
            const errorMessage = error?.response?.data?.message || error?.message || "Failed to unarchive file";
            
            // If 404, the archive might not exist - still try to refresh
            if (error?.response?.status === 404) {
                toast.warning("Archive not found. Refreshing file list...", ToastOptions("warning"));
                // Invalidate and refetch to sync with server
                queryClient.invalidateQueries({ queryKey: ["GetUserFiles"] });
                queryClient.invalidateQueries({ queryKey: ["GetArchivedFilesCount"] });
                if (refetch) {
                    await refetch();
                }
            } else {
                toast.error(errorMessage, ToastOptions("error"));
            }
        }
    };

    const handleCreateZip = async () => {
        try {
            const items = [{ type: "file", id: _id }];
            await fileService.createZip(items, MegaBox.MegaBox);
            // Invalidate queries to refresh the file list
            queryClient.invalidateQueries(["GetUserFiles"]);
            refetch();
        } catch {
            // Error is handled in the service
        }
    };

    const handleDisableShare = async () => {
        try {
            await fileService.disableFileShare(_id, MegaBox.MegaBox);
            // Invalidate shared files and folders queries to remove disabled items from shared lists
            queryClient.invalidateQueries(['sharedFilesByUser']);
            queryClient.invalidateQueries('GetSharedFolders');
            // Also invalidate share link analytics to update the shared links table
            queryClient.invalidateQueries(['shareLinkAnalytics']);
            // Explicitly refetch both queries to ensure UI updates immediately
            // Refetch sharedFilesByUser to remove from shared files cards
            await queryClient.refetchQueries(['sharedFilesByUser']);
            // Refetch shareLinkAnalytics to remove from shared links table
            await queryClient.refetchQueries(['shareLinkAnalytics']);
            // Also refetch current file list if refetch function is provided
            if (refetch) {
                await refetch();
            }
        } catch {
            // Error is handled in the service
        }
    };

    const handleAction = async (action) => {
        setShowMenu(false);
        switch (action) {
            case 'open':
                handleOpenFile();
                break;
            case 'delete': {
                // Check if this is a zip file - zip files need special handling
                const isZipFile = Type === 'zip' || fileType === 'application/zip' || fileType?.includes('zip');
                
                let DeleteRes;
                if (isZipFile) {
                    // Use deleteZip for zip files (created via createZip)
                    DeleteRes = await fileService.deleteZip(_id, MegaBox.MegaBox);
                } else {
                    // Use regular deleteFile for normal files
                    DeleteRes = await DeleteFile(_id, MegaBox.MegaBox);
                }

                if (DeleteRes) {
                    toast.success(t("file.fileDeletedSuccessfully") || "File deleted successfully", ToastOptions("success"));
                    const fileIdStr = String(_id);
                    queryClient.setQueryData(["GetUserFiles", "All"], (oldData) => {
                        if (!oldData?.files) return oldData;
                        return {
                            ...oldData,
                            files: oldData.files.filter(f => String(f._id || f.id) !== fileIdStr)
                        };
                    });
                    if (isZipFile) {
                        queryClient.setQueryData("getMyZips", (oldData) => {
                            if (!oldData?.zips && !oldData?.files) return oldData;
                            const zips = oldData?.zips || oldData?.files || [];
                            return {
                                ...oldData,
                                zips: zips.filter(zip => String(zip._id || zip.id) !== fileIdStr),
                                files: zips.filter(zip => String(zip._id || zip.id) !== fileIdStr)
                            };
                        });
                    }
                    queryClient.invalidateQueries({ queryKey: ["GetUserFiles"] });
                    queryClient.invalidateQueries({ queryKey: ["getMyZips"] });
                }
                refetch();
                break;
            }
            case 'rename':
                onRename(fileName, false, _id);
                break;
            case "share":
                await onShare(_id)
                break;
            case "disableShare":
                await handleDisableShare();
                break;
            case "archive":
                await handleArchive();
                break;
            case "unarchive":
                await handleUnarchive();
                break;
            case "createZip":
                await handleCreateZip();
                break;
            default:
                break;
        }
    };

    // Early return after all hooks
    if (!config) return null;

    return (
        <motion.div
            className={`relative bg-white border rounded-lg ${viewMode === 'list' ? 'h-auto flex items-center gap-4 p-4' : 'h-[300px]'} ${isSelected ? 'border-indigo-600 bg-indigo-50' : ''} cursor-pointer hover:shadow-lg transition-shadow`}
            style={{ zIndex: 1, position: 'relative' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            onClick={(e) => {
                // Don't trigger if clicking on dropdown menu or button
                if (menuRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) {
                    return;
                }
                if (isSelectionMode) {
                    e.preventDefault();
                    if (onToggleSelect) {
                        onToggleSelect(_id, false);
                    }
                } else {
                    // If no URL but has sharedUrl, open shared link in new tab
                    if (!url && data?._sharedUrl) {
                        e.preventDefault();
                        window.open(data._sharedUrl, '_blank', 'noopener,noreferrer');
                    } else {
                        handleOpenFile();
                    }
                }
            }}
        >
            {isSelectionMode && (
                <div className="absolute top-2 left-2 z-50">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (onToggleSelect) {
                                onToggleSelect(_id, false);
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>
            )}
            <div
                ref={buttonRef}
                className={`absolute top-2 z-[100] file-menu-button ${language === 'ar' ? 'left-2' : 'right-2'}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                }}
                style={{ pointerEvents: 'auto', touchAction: 'manipulation', zIndex: 99998 }}
            >
                <FiMoreVertical className="w-5 h-5 text-indigo-600 cursor-pointer hover:text-indigo-800 transition-colors" />
            </div>

            {showMenu && (
                <div
                    ref={menuRef}
                    className={`absolute top-10 bg-white border-2 border-indigo-100 shadow-xl rounded-lg py-1.5 text-xs min-w-[160px] max-h-[280px] overflow-y-auto file-dropdown-menu ${language === 'ar' ? 'left-2' : 'right-2'}`}
                    style={{ zIndex: 99999, position: 'absolute', pointerEvents: 'auto', touchAction: 'manipulation' }}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    {(Type === 'image' || Type === 'zip' || Type === 'video' || Type === 'document') && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction('open');
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction('open');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 w-full text-left transition-colors text-indigo-900"
                            style={{ pointerEvents: 'auto', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                        >
                            {Type === 'zip' ? (
                                <>
                                    <HiFolderOpen className='w-4 h-4 text-indigo-600' />
                                    <span className="font-medium">{t("file.open") || "Open"}</span>
                                </>
                            ) : (
                                <>
                                    <HiEye className='w-4 h-4 text-indigo-600' />
                                    <span className="font-medium">{t("file.open") || "Open"}</span>
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAction('rename');
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAction('rename');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 w-full text-left transition-colors text-indigo-900"
                        style={{ pointerEvents: 'auto', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                    >
                        <HiPencil className='w-4 h-4 text-green-600' />
                        <span className="font-medium">{t("file.rename") || "Rename"}</span>
                    </button>
                    {(data?.shareLink || data?.shareUrl || data?.sharedUrl || data?._sharedUrl || data?.isShared === true || data?.isShared === "true" || data?.shared === true || data?.shared === "true") ? (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction('disableShare');
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction('disableShare');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-orange-50 w-full text-left transition-colors text-orange-600"
                            style={{ pointerEvents: 'auto', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                        >
                            <HiShare className='w-4 h-4 text-orange-600 rotate-180' />
                            <span className="font-medium">{t("file.disableShare") || "Disable Share"}</span>
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction('share');
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction('share');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 w-full text-left transition-colors text-indigo-900"
                            style={{ pointerEvents: 'auto', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                        >
                            <HiShare className='w-4 h-4 text-blue-600' />
                            <span className="font-medium">{t("file.share") || "Share"}</span>
                        </button>
                    )}
                    {(data?.archived === true || data?.isArchived === true) ? (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction('unarchive');
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAction('unarchive');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-green-50 w-full text-left transition-colors text-green-600"
                            style={{ pointerEvents: 'auto', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                        >
                            <FiArchive className='w-4 h-4 text-green-600' />
                            <span className="font-medium">{t("file.unarchive") || "Unarchive"}</span>
                        </button>
                    ) : (
                        <>
                            {Type !== 'zip' && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAction('createZip');
                                    }}
                                    onTouchEnd={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAction('createZip');
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-amber-50 w-full text-left transition-colors text-amber-600"
                                    style={{ pointerEvents: 'auto', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                                >
                                    <LuFileArchive className='w-4 h-4 text-amber-600' />
                                    <span className="font-medium">{t("file.createZip") || "Create Zip"}</span>
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAction('archive');
                                }}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAction('archive');
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 w-full text-left transition-colors text-indigo-900"
                                style={{ pointerEvents: 'auto', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                            >
                                <FiArchive className='w-4 h-4 text-purple-600' />
                                <span className="font-medium">{t("file.archive") || "Archive"}</span>
                            </button>
                        </>
                    )}
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAction('delete');
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAction('delete');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 w-full text-left transition-colors text-red-600"
                        style={{ pointerEvents: 'auto', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                    >
                        <HiTrash className='w-4 h-4 text-red-600' />
                        <span className="font-medium">{t("file.delete") || "Delete"}</span>
                    </button>
                </div>
            )}

            {viewMode === 'list' ? (
                <>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {config.icon}
                        <p className="truncate flex-1">{truncateString(fileName)}</p>
                    </div>
                    <div className="w-32 h-24 flex-shrink-0 rounded overflow-hidden relative" style={{ zIndex: 1, pointerEvents: 'none' }}>
                        {config.previewComponent ? (
                            config.previewComponent(url, fileName, data)
                        ) : (
                            <div style={config.previewStyle(url, fileName, data)} className="w-full h-full" />
                        )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                        <p className='text-sm text-gray-500'>{AgoFormatter(createdAt)}</p>
                    </div>
                </>
            ) : (
                <>
                    <div className="w-full h-[40px] p-2 flex gap-2 items-center">
                        {config.icon}
                        <p className="truncate">{truncateString(fileName)}</p>
                    </div>
                    <div className="w-full h-[200px] overflow-hidden relative" style={{ zIndex: 1, pointerEvents: 'none' }}>
                        {config.previewComponent ? (
                            config.previewComponent(url, fileName, data)
                        ) : (
                            <div style={config.previewStyle(url, fileName, data)} className="w-full h-full" />
                        )}
                    </div>
                    <div className="w-full h-[60px] flex justify-end items-center p-2">
                        <p className='text-sm text-gray-500'>{AgoFormatter(createdAt)}</p>
                    </div>
                </>
            )}
        </motion.div>
    );
}