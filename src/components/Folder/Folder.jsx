import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMoreVertical, FiArchive } from 'react-icons/fi';
import { HiTrash, HiPencil, HiShare, HiLinkSlash } from "react-icons/hi2";
import { LuFolder } from "react-icons/lu";
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import { useLanguage } from '../../context/LanguageContext';
import { useCookies } from 'react-cookie';
import { useQueryClient } from 'react-query';
import { userService } from '../../services/api';

export const Folder = ({ name, data, onRename, onDelete, onShare, onDisableShare, onArchive, isSelectionMode, isSelected, onToggleSelect, refetch, readOnly = false }) => {
    const [open, setOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    const { t, language } = useLanguage();
    const { pathname } = useLocation();
    const [Token] = useCookies(['MegaBox']);
    const queryClient = useQueryClient();
    // Determine base path based on current location
    const getBasePath = () => {
        if (pathname.startsWith('/Promoter')) {
            return '/Promoter/file';
        } else if (pathname.startsWith('/dashboard')) {
            return '/dashboard/file';
        } else if (pathname.startsWith('/Owner')) {
            return '/Owner/file';
        }
        return '/dashboard/file'; // Default fallback
    };
    
    const folderPath = `${getBasePath()}/${encodeURIComponent(data?.name || name)}/${data?._id || data?.id}`;

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

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);


    const handleUnarchive = async () => {
        try {
            await userService.unarchiveFolder(data?._id || data?.id, Token.MegaBox);
            toast.success("Folder unarchived successfully", ToastOptions("success"));
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["userFolders"] });
            queryClient.invalidateQueries({ queryKey: ["GetArchivedFilesCount"] });
            queryClient.invalidateQueries({ queryKey: ["getMyArchives"] });
            queryClient.invalidateQueries({
                predicate: (query) =>
                    typeof query.queryKey?.[0] === 'string' && query.queryKey[0].startsWith('GetUserFile-')
            });
            if (refetch) {
                refetch();
            }
        } catch {
            toast.error("Failed to unarchive folder", ToastOptions("error"));
        }
    };

    const handleAction = async (action, e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(false);

        switch (action) {
            case 'rename':
                if (onRename) onRename(name, false, data?._id, true);
                break;
            case 'delete':
                if (onDelete) onDelete(data?._id);
                break;
            case 'share':
                if (onShare) onShare(data?._id);
                break;
            case 'disableShare':
                if (onDisableShare) await onDisableShare(data?._id || data?.id);
                break;
            case 'archive':
                if (onArchive) onArchive(data?._id);
                break;
            case 'unarchive':
                await handleUnarchive();
                break;
            default:
                break;
        }
    };

    const isArchived = data?.archived === true || data?.isArchived === true;
    const isShared = Boolean(data?.isShared);
    const canRename = !readOnly && Boolean(onRename);
    const canShare = !readOnly && Boolean(onShare);
    const canDisableShare = !readOnly && isShared && Boolean(onDisableShare);
    const canArchiveAction = !readOnly && (isArchived || Boolean(onArchive));
    const canDelete = !readOnly && Boolean(onDelete);
    const hasMenuActions = canRename || canShare || canDisableShare || canArchiveAction || canDelete;

    return (
        <div className={`relative bg-gradient-to-br from-white to-indigo-50 rounded-lg border-2 ${isSelected ? 'border-indigo-600 bg-indigo-100' : 'border-indigo-200'} shadow-md hover:shadow-xl transition-all duration-300 hover:border-indigo-400 hover:scale-[1.01] sm:hover:scale-[1.02] h-auto self-start`} style={{ zIndex: 1, position: 'relative', isolation: 'isolate' }}>
            {isSelectionMode && (
                <div className="absolute top-2 left-2 z-20">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (onToggleSelect) {
                                onToggleSelect(data?._id || data?.id, true);
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>
            )}
            <Link to={folderPath} className="block" onClick={(e) => isSelectionMode && e.preventDefault()}>
                <div
                    className="flex items-center p-3 sm:p-4 md:p-5 cursor-pointer group"
                    onClick={(e) => {
                        if (isSelectionMode) {
                            e.preventDefault();
                            if (onToggleSelect) {
                                onToggleSelect(data?._id || data?.id, true);
                            }
                        } else {
                            setOpen(!open);
                        }
                    }}
                >
                    <div className="flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-indigo-100 rounded-lg blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                        <LuFolder className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-indigo-600 relative z-10 group-hover:text-indigo-700 transition-colors duration-300" style={{ filter: 'drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3))' }} />
                    </div>
                    <div className="px-2 sm:px-3 md:px-4 mr-auto flex-1 min-w-0">
                        <h4 className="font-bold text-indigo-900 truncate text-sm sm:text-base md:text-lg group-hover:text-indigo-700 transition-colors duration-300" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            {name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 sm:mt-1 flex-wrap">
                            <p className="text-xs text-indigo-500">{t("folder.folder")}</p>
                            {isShared && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700">
                                    <HiShare className="w-3 h-3" />
                                    {t("filesV2.sharedBadge") || "Shared"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>

            {hasMenuActions && (
                <div
                    ref={buttonRef}
                    className={`absolute top-1.5 sm:top-2 z-10 ${language === 'ar' ? 'left-1.5 sm:left-2' : 'right-1.5 sm:right-2'}`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                >
                    <FiMoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 cursor-pointer hover:text-indigo-800 transition-colors" />
                </div>
            )}

            {showMenu && hasMenuActions && (
                <div
                    ref={menuRef}
                    className={`absolute top-8 sm:top-10 bg-white border-2 border-indigo-100 shadow-xl rounded-lg py-1.5 text-xs min-w-[160px] max-h-[280px] overflow-y-auto file-dropdown-menu ${language === 'ar' ? 'left-1.5 sm:left-2' : 'right-1.5 sm:right-2'}`}
                    style={{ zIndex: 999999 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {canRename && (
                        <button
                            onClick={(e) => handleAction('rename', e)}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 w-full text-left transition-colors text-indigo-900"
                        >
                            <HiPencil className='w-4 h-4 text-green-600 flex-shrink-0' />
                            <span className="font-medium">{t("folder.rename")}</span>
                        </button>
                    )}
                    {canShare && (
                        <button
                            onClick={(e) => handleAction('share', e)}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 w-full text-left transition-colors text-indigo-900"
                        >
                            <HiShare className='w-4 h-4 text-blue-600 flex-shrink-0' />
                            <span className="font-medium">{t("folder.share")}</span>
                        </button>
                    )}
                    {canDisableShare && (
                        <button
                            onClick={(e) => handleAction('disableShare', e)}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-amber-50 w-full text-left transition-colors text-amber-700"
                        >
                            <HiLinkSlash className='w-4 h-4 text-amber-600 flex-shrink-0' />
                            <span className="font-medium">{t("filesV2.disableSharing") || "Disable sharing"}</span>
                        </button>
                    )}
                    {canArchiveAction && (isArchived ? (
                        <button
                            onClick={(e) => handleAction('unarchive', e)}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-green-50 w-full text-left transition-colors text-green-600"
                        >
                            <FiArchive className='w-4 h-4 text-green-600 flex-shrink-0' />
                            <span className="font-medium">{t("folder.unarchive") || "Unarchive"}</span>
                        </button>
                    ) : (
                        <button
                            onClick={(e) => handleAction('archive', e)}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 w-full text-left transition-colors text-indigo-900"
                        >
                            <FiArchive className='w-4 h-4 text-purple-600 flex-shrink-0' />
                            <span className="font-medium">{t("folder.archive")}</span>
                        </button>
                    ))}
                    {canDelete && (
                        <>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                                onClick={(e) => handleAction('delete', e)}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 w-full text-left transition-colors text-red-600"
                            >
                                <HiTrash className='w-4 h-4 text-red-600 flex-shrink-0' />
                                <span className="font-medium">{t("folder.delete")}</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};