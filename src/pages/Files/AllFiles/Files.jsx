import React, { useState, useEffect, useRef } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Folder } from '../../../components/Folder/Folder'
import File from '../../../components/File/File'
import UnifiedItemList from '../../../components/UnifiedItemList/UnifiedItemList'
import { HiOutlinePlus } from "react-icons/hi2";
import { LuFolderPlus, LuFolder } from "react-icons/lu";
import { HiViewGrid, HiViewList } from "react-icons/hi";
import UploadFile from '../../../components/Upload/UploadFile/UploadFile';
import UploadOptions from '../../../components/Upload/UploadOptions/UploadOptions';
import UploadFromMegaBox from '../../../components/Upload/UploadFromMegaBox/UploadFromMegaBox';
import AddFolder from '../../../components/Upload/AddFolder/AddFolder';
import { API_URL } from '../../../services/api';
import { api } from '../../../services/apiConfig';
import { useCookies } from 'react-cookie';
import { useQuery, useQueryClient } from 'react-query';
import { getFileCategory } from '../../../helpers/MimeType';
import Represents from '../../../components/Represents/Represents';
import ChangeName from '../../../components/ChangeName/ChangeName';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { fileService, userService } from '../../../services/api';
import { getAllUnifiedItems } from '../../../services/itemsService';
import { useLanguage } from '../../../context/LanguageContext';
import ShareLinkModal from '../../../components/ShareLinkModal/ShareLinkModal';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { HiUserCircle, HiArrowRightOnRectangle, HiUserGroup, HiCurrencyDollar, HiArrowUp, HiBell, HiShare, HiTicket, HiTrash } from 'react-icons/hi2';
import { FiGlobe, FiArchive } from 'react-icons/fi';
import { FaUser, FaTimes } from 'react-icons/fa';
import { LuFileArchive } from 'react-icons/lu';
import './Files.scss';

export default function Files() {
    const { t, language, changeLanguage } = useLanguage();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [Token] = useCookies(['MegaBox']);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [profileImageError, setProfileImageError] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, left: 0 });
    const profileMenuRef = useRef(null);
    const profileButtonRef = useRef(null);
    const profileDropdownRef = useRef(null);
    const touchStartedRef = useRef(false);
    
    useEffect(() => {
        // Add/remove class on body when profile menu is open
        if (profileMenuOpen) {
            document.body.classList.add('profile-menu-open');
        } else {
            document.body.classList.remove('profile-menu-open');
        }

        if (!profileMenuOpen) {
            touchStartedRef.current = false;
            return;
        }

        const handleClickOutside = (event) => {
            // Don't close if clicking inside dropdown or its children
            if (
                profileDropdownRef.current && 
                profileDropdownRef.current.contains(event.target)
            ) {
                return;
            }
            
            // Don't close if clicking the profile button
            if (
                profileButtonRef.current &&
                profileButtonRef.current.contains(event.target)
            ) {
                return;
            }
            
            // Close if clicking outside
            setProfileMenuOpen(false);
            touchStartedRef.current = false;
        };

        const positionTimer = setTimeout(() => {
            if (profileButtonRef.current) {
                const rect = profileButtonRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                const dropdownHeight = 250;
                const dropdownWidth = 220;
                
                let top = rect.bottom + 8;
                let right = viewportWidth - rect.right;
                let left = rect.left;
                
                if (top + dropdownHeight > viewportHeight - 80) {
                    top = rect.top - dropdownHeight - 8;
                }
                
                if (language === 'ar') {
                    if (left + dropdownWidth > viewportWidth - 16) {
                        left = viewportWidth - dropdownWidth - 16;
                    }
                    if (left < 16) left = 16;
                } else {
                    if (right < 16) right = 16;
                    if (right + dropdownWidth > viewportWidth) {
                        right = viewportWidth - dropdownWidth - 16;
                    }
                }
                
                setDropdownPosition({
                    top: Math.max(8, top),
                    right: Math.max(8, right),
                    left: Math.max(8, left)
                });
            }
        }, 10);

        // Use bubble phase instead
        document.addEventListener('mousedown', handleClickOutside, false);
        document.addEventListener('touchstart', handleClickOutside, false);
        
        return () => {
            clearTimeout(positionTimer);
            document.removeEventListener('mousedown', handleClickOutside, false);
            document.removeEventListener('touchstart', handleClickOutside, false);
            document.body.classList.remove('profile-menu-open');
        };
    }, [profileMenuOpen, language]);

    const Active = "inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm transition-all duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";
    const InActive = "inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-white border border-indigo-300 rounded-lg shadow-sm transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";

    const [AddFileShow, setAddFileShow] = useState(false);
    const [showUploadOptions, setShowUploadOptions] = useState(false);
    const [showUploadFromMegaBox, setShowUploadFromMegaBox] = useState(false);
    const [AddFolderAdding, setAddFolderAdding] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [shareTitle, setShareTitle] = useState('');
    const [showPromoterModal, setShowPromoterModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState({ files: [], folders: [] });
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const ToggleShowAddFile = () => setAddFileShow(!AddFileShow);
    const ToggleUploadOptions = () => setShowUploadOptions(!showUploadOptions);
    const ToggleUploadFromMegaBox = () => setShowUploadFromMegaBox(!showUploadFromMegaBox);
    const ToggleFolderAdding = () => setAddFolderAdding(!AddFolderAdding);

    const handleSelectDesktop = () => {
        setAddFileShow(true);
    };

    const handleSelectMegaBox = () => {
        setShowUploadFromMegaBox(true);
    };

    const [FilterKey, setFilterKey] = useState('All');
    const queryClient = useQueryClient();
    
    const { data: userData } = useQuery(
        ['userAccount'],
        () => userService.getUserInfo(Token.MegaBox),
        {
            enabled: !!Token.MegaBox,
            retry: false
        }
    );
    
    const isPromoter = userData?.isPromoter === "true" || userData?.isPromoter === true;
    
    // Handle upload button click - show options for both promoters and users
    // Both get the same upload options (desktop upload and upload from MegaBox)
    const handleUploadClick = () => {
        ToggleUploadOptions();
    };
    
    const Logout = async () => {
        await logout();
        toast.success(t('common.logoutSuccess') || 'Logged out successfully', ToastOptions('success'));
        navigate('/login');
    };
    
    const toggleLanguage = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const newLang = language === 'en' ? 'ar' : 'en';
        changeLanguage(newLang);
    };

    // Unified data fetching - gets both files and folders in one call
    const GetUnifiedItems = async ({ queryKey }) => {
        const [, filterKey] = queryKey;
        const token = Token.MegaBox;

        try {
            const key = filterKey.toLowerCase();

            // Special handling for archived items
            if (key === 'archived') {
                const data = await fileService.getMyArchives(token);
                if (!data?.files) data = { files: [] };
                if (!data?.folders) data = { ...data, folders: [] };
                // Convert to unified array format
                return [...(data.folders || []), ...(data.files || [])];
            }

            // For zip filter, use unified endpoint (includes both uploaded and created zips)
            if (key === 'zip') {
                const items = await getAllUnifiedItems(token, { type: 'zip' });
                return items;
            }

            // For all other filters, use unified endpoint
            // 'all' -> no type filter (gets everything)
            // 'image', 'video', 'document', 'folders' -> pass as type filter
            const type = key === 'all' ? undefined : key;
            const items = await getAllUnifiedItems(token, { type });
            return items;
        } catch (error) {
            console.error('Error fetching unified items:', error);
            return [];
        }
    };

    const { data: unifiedItems, refetch, isLoading: filesLoading } = useQuery(
        ["items", FilterKey],
        GetUnifiedItems,
        {
            enabled: !!Token.MegaBox,
        }
    );

    // For backward compatibility, split unified items into files and folders
    const data = React.useMemo(() => {
        if (!unifiedItems) return { files: [], folders: [] };
        const files = [];
        const folders = [];
        unifiedItems.forEach(item => {
            if (item.isFolder || item.itemType === 'folder') {
                folders.push(item);
            } else {
                files.push(item);
            }
        });
        return { files, folders };
    }, [unifiedItems]);

    const folders = { folders: data.folders };
    const foldersLoading = filesLoading;
    
    // Enhanced refetch function that also invalidates sidenav query
    const refetchFoldersWithSidenav = async () => {
        await refFolders();
        // Invalidate sidenav folders query to update sidebar immediately
        queryClient.invalidateQueries(['userFolders']);
        await queryClient.refetchQueries(['userFolders']);
    };

    const SelectFilter = async (type) => {
        setFilterKey(type);
    }

    const [ShowRepresent, setRepresents] = useState(false);
    const [Path, setPath] = useState();
    const [fileType, setfileType] = useState();

    const Representation = (path, type, close) => {
        if (close) {
            setPath(null)
            setfileType(null);
            setRepresents(false);
            return
        } else {
            setPath(path);
            setfileType(type);
            setRepresents(!ShowRepresent)
        }
    }

    const [ShowUpdateName, setupdateName] = useState(false);
    const [OldName, setOldName] = useState(null);
    const [FileId, setFileId] = useState(null);
    const [IsFolder, setIsFolder] = useState(false);
    const [IsZip, setIsZip] = useState(false);

    const ToggleNameChange = (name, close, id, isFolder = false) => {
        if (close) {
            setupdateName(!ShowUpdateName);
            return;
        }
        setFileId(id)
        setOldName(name)
        setIsFolder(isFolder)
        
        // Check if this is a zip file (created via createZip) for rename handling
        const file = data?.files?.find(f => (f._id || f.id) === id);
        const isZipFile = !isFolder && file && (
            file.fileType === 'application/zip' || 
            file.fileType?.includes('zip') ||
            file.items // zip files created via createZip have an items array
        );
        
        setIsZip(isZipFile || false);
        setupdateName(!ShowUpdateName);
    }

    const DeleteFolder = async (folderId) => {
        try {
            await userService.deleteFolder(folderId, Token.MegaBox);
            toast.success(t("files.folderDeletedSuccess"), ToastOptions("success"));
            refFolders();
        } catch {
            toast.error(t("files.folderDeleteFailed"), ToastOptions("error"));
        }
    }

    const ArchiveFolder = async (folderId) => {
        try {
            await userService.archiveFolder(folderId, Token.MegaBox);
            toast.success("Folder archived successfully", ToastOptions("success"));
            
            // Remove from current folder cache immediately
            queryClient.setQueryData("GetUserFolders", (oldData) => {
                if (!oldData?.folders) return oldData;
                return {
                    ...oldData,
                    folders: oldData.folders.filter(f => (f._id || f.id) !== folderId)
                };
            });
            
            // Remove from zip filter cache if present
            queryClient.setQueryData(["GetUserFiles", "zip"], (oldData) => {
                if (!oldData?.folders) return oldData;
                return {
                    ...oldData,
                    folders: (oldData.folders || []).filter(f => (f._id || f.id) !== folderId)
                };
            });
            
            // Invalidate all queries to force refetch
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["GetArchivedFilesCount"] });
            queryClient.invalidateQueries({ queryKey: ["userFolders"] });
            
            // Update archived count
            queryClient.setQueryData("GetArchivedFilesCount", (oldCount) => {
                return (oldCount || 0) + 1;
            });
            
            await refFolders();
        } catch {
            toast.error("Failed to archive folder", ToastOptions("error"));
        }
    }

    const ShareFile = async (id, isFolder = false) => {
        // Check if user is promoter - only promoters can share
        if (!isPromoter) {
            setShowPromoterModal(true);
            return;
        }

        try {
            if (isFolder) {
                const response = await userService.generateFolderShareLink(id, Token.MegaBox);
                const link = response?.shareUrl || response?.shareLink;
                if (link) {
                    setShareUrl(link);
                    setShareTitle("Share Folder");
                    setShowShareModal(true);
                } else {
                    toast.error("Failed to generate share link", ToastOptions("error"));
                }
            } else {
                // Check if this is a zip file (created via createZip)
                // Find the file in the current data to check if it's a zip
                const file = data?.files?.find(f => (f._id || f.id) === id);
                const isZipFile = file && (
                    file.fileType === 'application/zip' || 
                    file.fileType?.includes('zip') ||
                    file.items // zip files created via createZip have an items array
                );

                let response;
                if (isZipFile) {
                    // Use zip-specific share link endpoint
                    response = await fileService.generateZipShareLink(id, Token.MegaBox);
                } else {
                    // Use regular file share link endpoint
                    response = await fileService.generateShareLink(id, Token.MegaBox);
                }

                // Handle different response structures
                const link = response?.shareUrl || response?.shareLink || response?.data?.shareUrl || response?.data?.shareLink || response?.data?.data?.shareLink || response?.data?.data?.shareUrl;
                if (link) {
                    setShareUrl(link);
                    setShareTitle(isZipFile ? "Share Zip File" : "Share File");
                    setShowShareModal(true);
                } else if (response?.message && (response.message.includes('نجاح') || response.message.includes('success'))) {
                    // If success message but no link, still show success (link might be in different format)
                    toast.success(response.message || "Share link generated successfully", ToastOptions("success"));
                } else {
                    toast.error("Failed to generate share link", ToastOptions("error"));
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate share link", ToastOptions("error"));
        }
    }

    // Toggle selection mode
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        if (isSelectionMode) {
            setSelectedItems({ files: [], folders: [] });
        }
    }

    // Toggle item selection
    const toggleItemSelection = (id, isFolder = false) => {
        if (isFolder) {
            setSelectedItems(prev => ({
                ...prev,
                folders: prev.folders.includes(id)
                    ? prev.folders.filter(fId => fId !== id)
                    : [...prev.folders, id]
            }));
        } else {
            setSelectedItems(prev => ({
                ...prev,
                files: prev.files.includes(id)
                    ? prev.files.filter(fId => fId !== id)
                    : [...prev.files, id]
            }));
        }
    }

    // Share multiple items
    const shareMultipleItems = async () => {
        // Check if user is promoter - only promoters can share
        if (!isPromoter) {
            setShowPromoterModal(true);
            return;
        }

        if (selectedItems.files.length === 0 && selectedItems.folders.length === 0) {
            toast.error("Please select at least one item to share", ToastOptions("error"));
            return;
        }

        try {
            const response = await userService.generateMultiShareLink(
                selectedItems.folders,
                selectedItems.files,
                Token.MegaBox
            );
            const link = response?.shareUrl || response?.shareLink;
            if (link) {
                setShareUrl(link);
                setShareTitle(`Share ${selectedItems.files.length + selectedItems.folders.length} Items`);
                setShowShareModal(true);
                setIsSelectionMode(false);
                setSelectedItems({ files: [], folders: [] });
            } else {
                toast.error("Failed to generate share link", ToastOptions("error"));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to generate share link", ToastOptions("error"));
        }
    }

    // Archive multiple items using createArchive endpoint
    const archiveMultipleItems = async () => {
        if (selectedItems.files.length === 0 && selectedItems.folders.length === 0) {
            toast.error("Please select at least one item to archive", ToastOptions("error"));
            return;
        }

        try {
            // Call API
            await fileService.createArchive(
                selectedItems.files,
                selectedItems.folders,
                Token.MegaBox
            );
            
            // Remove files from ALL filter caches immediately
            const filterKeys = ["All", "all", "image", "video", "document", "zip"];
            const fileIdSet = new Set(selectedItems.files.map(id => String(id)));
            const folderIdSet = new Set(selectedItems.folders.map(id => String(id)));
            
            filterKeys.forEach(key => {
                queryClient.setQueryData(["GetUserFiles", key], (oldData) => {
                    if (!oldData?.files) return oldData;
                    return {
                        ...oldData,
                        files: oldData.files.filter(f => {
                            const fileId = String(f._id || f.id);
                            return !fileIdSet.has(fileId);
                        })
                    };
                });
            });
            
            // Remove folders from current cache immediately
            queryClient.setQueryData("GetUserFolders", (oldData) => {
                if (!oldData?.folders) return oldData;
                return {
                    ...oldData,
                    folders: oldData.folders.filter(f => {
                        const folderId = String(f._id || f.id);
                        return !folderIdSet.has(folderId);
                    })
                };
            });
            
            // Remove folders from zip filter if present
            queryClient.setQueryData(["GetUserFiles", "zip"], (oldData) => {
                if (!oldData?.folders) return oldData;
                return {
                    ...oldData,
                    folders: (oldData.folders || []).filter(f => {
                        const folderId = String(f._id || f.id);
                        return !folderIdSet.has(folderId);
                    })
                };
            });
            
            // Also remove from getMyZips cache if any zips were archived
            queryClient.setQueryData("getMyZips", (oldData) => {
                if (!oldData?.zips && !oldData?.files) return oldData;
                const zips = oldData?.zips || oldData?.files || [];
                return {
                    ...oldData,
                    zips: zips.filter(zip => {
                        const zipId = String(zip._id || zip.id);
                        return !fileIdSet.has(zipId) && !folderIdSet.has(zipId);
                    }),
                    files: zips.filter(zip => {
                        const zipId = String(zip._id || zip.id);
                        return !fileIdSet.has(zipId) && !folderIdSet.has(zipId);
                    })
                };
            });
            
            toast.success(`Archived ${selectedItems.files.length + selectedItems.folders.length} item(s) successfully`, ToastOptions("success"));
            
            setIsSelectionMode(false);
            setSelectedItems({ files: [], folders: [] });
            
            // Invalidate all queries to force refetch
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["userFolders"] });
            queryClient.invalidateQueries({ queryKey: ["GetArchivedFilesCount"] });
            queryClient.invalidateQueries({ queryKey: ["getMyArchives"] });
            
            // Update archived count
            const totalArchived = selectedItems.files.length + selectedItems.folders.length;
            queryClient.setQueryData("GetArchivedFilesCount", (oldCount) => {
                return (oldCount || 0) + totalArchived;
            });
            
            // Refetch to update UI
            await refetch();
            await refFolders();
            
        } catch {
            toast.error("Failed to archive items", ToastOptions("error"));
        }
    }



    // Unarchive multiple items
    const unarchiveMultipleItems = async () => {
        if (selectedItems.files.length === 0 && selectedItems.folders.length === 0) {
            toast.error("Please select at least one item to unarchive", ToastOptions("error"));
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;
            
            // Unarchive files
            for (const fileId of selectedItems.files) {
                try {
                    await fileService.unarchiveFile(fileId, Token.MegaBox);
                    successCount++;
                } catch (err) {
                    // Continue with other files even if one fails
                    if (err?.response?.status !== 404) {
                        errorCount++;
                    }
                }
            }
            
            // Unarchive folders
            for (const folderId of selectedItems.folders) {
                try {
                    await userService.unarchiveFolder(folderId, Token.MegaBox);
                    successCount++;
                } catch (err) {
                    // Continue with other folders even if one fails
                    if (err?.response?.status !== 404) {
                        errorCount++;
                    }
                }
            }
            
            // Remove from archived cache
            queryClient.setQueryData(["GetUserFiles", "archived"], (oldData) => {
                if (!oldData?.files && !oldData?.folders) return oldData;
                return {
                    ...oldData,
                    files: (oldData.files || []).filter(f => !selectedItems.files.includes(f._id || f.id)),
                    folders: (oldData.folders || []).filter(f => !selectedItems.folders.includes(f._id || f.id))
                };
            });
            
            // Update archived count
            queryClient.setQueryData("GetArchivedFilesCount", (oldCount) => {
                return Math.max(0, (oldCount || 0) - successCount);
            });
            
            // Invalidate all queries to force refetch
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["userFolders"] });
            queryClient.invalidateQueries({ queryKey: ["GetArchivedFilesCount"] });
            queryClient.invalidateQueries({ queryKey: ["getMyArchives"] });
            
            setIsSelectionMode(false);
            setSelectedItems({ files: [], folders: [] });
            
            // Show appropriate message
            if (successCount > 0 && errorCount === 0) {
                toast.success(`Unarchived ${successCount} item(s) successfully`, ToastOptions("success"));
            } else if (successCount > 0 && errorCount > 0) {
                toast.warning(`Unarchived ${successCount} item(s), ${errorCount} failed`, ToastOptions("warning"));
            } else {
                toast.error("Failed to unarchive items", ToastOptions("error"));
            }
            
            // Refetch to update UI
            await refetch();
            await refFolders();
            
        } catch (error) {
            const errorMessage = error?.response?.data?.message || error?.message || "Failed to unarchive items";
            
            // If 404, refresh to sync with server
            if (error?.response?.status === 404) {
                toast.warning("Some archives not found. Refreshing...", ToastOptions("warning"));
                queryClient.invalidateQueries({ queryKey: ["items"] });
                queryClient.invalidateQueries({ queryKey: ["items"] });
                queryClient.invalidateQueries({ queryKey: ["GetArchivedFilesCount"] });
                await refetch();
                await refFolders();
            } else {
                toast.error(errorMessage, ToastOptions("error"));
            }
        }
    }

    // Create zip from selected items
    const createZipFromSelected = async () => {
        if (selectedItems.files.length === 0 && selectedItems.folders.length === 0) {
            toast.error("Please select at least one item to create zip", ToastOptions("error"));
            return;
        }

        try {
            // Convert to Postman collection format
            const items = [];
            selectedItems.files.forEach(fileId => {
                items.push({ type: "file", id: fileId });
            });
            selectedItems.folders.forEach(folderId => {
                items.push({ type: "folder", id: folderId });
            });
            
            await fileService.createZip(items, Token.MegaBox);
            
            setIsSelectionMode(false);
            setSelectedItems({ files: [], folders: [] });
            // Refetch files and invalidate queries to show the new zip
            await refetch();
            queryClient.invalidateQueries(["items"]);
            refFolders();
        } catch {
            // Error is handled in the service
        }
    }

    const GetArchivedFilesCount = async () => {
        try {
            const data = await fileService.getMyArchives(Token.MegaBox);
            return data?.files?.length || 0;
        } catch {
            return 0;
        }
    };

    const { data: archivedData } = useQuery("GetArchivedFilesCount", GetArchivedFilesCount, {
        refetchInterval: false,
        staleTime: 30000
    });



    const filterOptions = [
        { key: "All", label: t("files.allFiles"), count: unifiedItems?.length || 0 },
        { key: "image", label: t("files.images"), count: data?.files?.filter(f => getFileCategory(f?.fileType) === 'image')?.length || 0 },
        { key: "video", label: t("files.videos"), count: data?.files?.filter(f => getFileCategory(f?.fileType) === 'video')?.length || 0 },
        { key: "document", label: t("files.documents"), count: data?.files?.filter(f => getFileCategory(f?.fileType) === 'document')?.length || 0 },
        { key: "zip", label: t("files.zip"), count: data?.files?.filter(f => getFileCategory(f?.fileType) === 'zip')?.length || 0 },
        { key: "folders", label: t("files.folders"), count: data?.folders?.length || 0 },
    ];

    return <>
        <div className="min-h-screen bg-indigo-50" style={{ fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            <div className="files-header">
                <div className="files-header__container">
                    <div className="files-header__content">
                        <Link to="/" className="files-header__left" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <svg
                                className="files-header__icon"
                                viewBox="0 0 48 48"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <linearGradient id="logoGradient" x1="0" y1="0" x2="48" y2="48">
                                        <stop offset="0%" stopColor="var(--color-indigo-400)" />
                                        <stop offset="50%" stopColor="var(--color-indigo-500)" />
                                        <stop offset="100%" stopColor="var(--color-indigo-600)" />
                                    </linearGradient>
                                    <linearGradient id="logoGradient2" x1="0" y1="0" x2="48" y2="48">
                                        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                                        <stop offset="100%" stopColor="rgba(255, 255, 255, 0.85)" />
                                    </linearGradient>
                                </defs>
                                <rect width="48" height="48" rx="12" fill="url(#logoGradient)" />
                                <path d="M24 12C18.5 12 14 16.5 14 22C14 22.5 14 23 14.1 23.5C12.3 24.2 11 25.8 11 27.5C11 29.7 12.8 31.5 15 31.5H33C35.2 31.5 37 29.7 37 27.5C37 25.8 35.7 24.2 33.9 23.5C34 23 34 22.5 34 22C34 16.5 29.5 12 24 12Z" fill="url(#logoGradient2)" />
                                <rect x="16" y="16" width="16" height="16" rx="2.5" fill="var(--color-indigo-600)" opacity="0.95" />
                                <rect x="20" y="20" width="8" height="8" rx="1.5" fill="white" opacity="0.9" />
                                <line x1="16" y1="16" x2="16" y2="32" stroke="white" strokeWidth="2.5" opacity="0.8" />
                                <line x1="32" y1="16" x2="32" y2="32" stroke="white" strokeWidth="2.5" opacity="0.8" />
                                <line x1="16" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2.5" opacity="0.8" />
                                <line x1="16" y1="24" x2="32" y2="24" stroke="white" strokeWidth="2" opacity="0.6" />
                                <line x1="24" y1="16" x2="24" y2="32" stroke="white" strokeWidth="2" opacity="0.6" />
                            </svg>
                            <div className="files-header__text">
                                <h1 className="files-header__title">{t("files.headerTitle")}</h1>
                                <p className="files-header__subtitle">{t("files.headerSubtitle")}</p>
                            </div>
                        </Link>

                        <div className="files-header__actions">
                            <button
                                className="files-header__button"
                                onClick={handleUploadClick}
                            >
                                <HiArrowUp className="files-header__button-icon" />
                                {t("files.uploadFile")}
                            </button>
                            <button
                                className="files-header__button"
                                onClick={ToggleFolderAdding}
                            >
                                <LuFolderPlus className="files-header__button-icon" />
                                {t("files.newFolder")}
                            </button>
                            
                            <div className="files-header__profile-menu" ref={profileMenuRef}>
                                <button
                                    ref={profileButtonRef}
                                    className="files-header__profile-button"
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setProfileMenuOpen(!profileMenuOpen);
                                    }}
                                    onTouchEnd={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        touchStartedRef.current = true;
                                        setProfileMenuOpen(!profileMenuOpen);
                                    }}
                                >
                                    {userData?.profilePic && typeof userData.profilePic === 'string' && userData.profilePic.trim() !== '' && !profileImageError ? (
                                        <img
                                            src={userData.profilePic}
                                            alt="Profile"
                                            className="files-header__profile-image"
                                            onError={() => setProfileImageError(true)}
                                        />
                                    ) : (
                                        <div className="files-header__profile-placeholder">
                                            <FaUser className="files-header__profile-icon" />
                                        </div>
                                    )}
                                </button>
                                
                                {profileMenuOpen && (
                                    <>
                                        <div 
                                            className="files-header__profile-backdrop"
                                            // SIMPLIFIED: Just close on backdrop click
                                            onMouseDown={(e) => {
                                                // Only close if clicking backdrop directly
                                                if (e.target === e.currentTarget) {
                                                    setProfileMenuOpen(false);
                                                }
                                            }}
                                            onTouchStart={(e) => {
                                                // Only close if touching backdrop directly
                                                if (e.target === e.currentTarget) {
                                                    setProfileMenuOpen(false);
                                                }
                                            }}
                                        />
                                        <div 
                                            ref={profileDropdownRef}
                                            className="files-header__profile-dropdown"
                                            style={{
                                                position: 'fixed',
                                                top: `${dropdownPosition.top}px`,
                                                ...(language === 'ar' 
                                                    ? { left: `${dropdownPosition.left}px`, right: 'auto' }
                                                    : { right: `${dropdownPosition.right}px`, left: 'auto' }
                                                ),
                                            }}
                                            // Let child elements handle their own events
                                        >
                                        <Link
                                            to={isPromoter ? '/Promoter/profile' : '/dashboard/profile'}
                                            className="files-header__profile-item"
                                            // SIMPLIFIED click handler
                                            onClick={() => setProfileMenuOpen(false)}
                                        >
                                            <HiUserCircle className="files-header__profile-item-icon" />
                                            <span>{t("sidenav.profile")}</span>
                                        </Link>
                                        
                                        <Link
                                            to={isPromoter ? '/Promoter/notifications' : '/dashboard/notifications'}
                                            className="files-header__profile-item"
                                            onClick={() => setProfileMenuOpen(false)}
                                        >
                                            <HiBell className="files-header__profile-item-icon" />
                                            <span>{t("sidenav.notifications")}</span>
                                        </Link>
                                        
                                        {!isPromoter && (
                                            <>
                                                <Link
                                                    to="/Partners"
                                                    className="files-header__profile-item"
                                                    onClick={() => setProfileMenuOpen(false)}
                                                >
                                                    <HiUserGroup className="files-header__profile-item-icon" />
                                                    <span>{t("sidenav.partners") || "Partners"}</span>
                                                </Link>
                                                <Link
                                                    to="/Subscribe"
                                                    className="files-header__profile-item"
                                                    onClick={() => setProfileMenuOpen(false)}
                                                >
                                                    <HiCurrencyDollar className="files-header__profile-item-icon" />
                                                    <span>{t("sidenav.subscribe") || "Subscribe"}</span>
                                                </Link>
                                            </>
                                        )}
                                        
                                        {isPromoter && (
                                            <>
                                                <Link
                                                    to="/Subscribe"
                                                    className="files-header__profile-item"
                                                    onClick={() => setProfileMenuOpen(false)}
                                                >
                                                    <HiTicket className="files-header__profile-item-icon" />
                                                    <span>{t("sidenav.subscription") || "Subscription"}</span>
                                                </Link>
                                                <Link
                                                    to="/Partners"
                                                    className="files-header__profile-item"
                                                    onClick={() => setProfileMenuOpen(false)}
                                                >
                                                    <HiUserGroup className="files-header__profile-item-icon" />
                                                    <span>{t("sidenav.partners") || "Partners Center"}</span>
                                                </Link>
                                            </>
                                        )}
                                        
                                        <button
                                            type="button"
                                            className="files-header__profile-item"
                                            onClick={(e) => {
                                                toggleLanguage(e);
                                                setProfileMenuOpen(false);
                                            }}
                                        >
                                            <FiGlobe className="files-header__profile-item-icon" />
                                            <span>{language === 'en' ? t("navbar.arabic") : t("navbar.english")}</span>
                                        </button>
                                        
                                        <button
                                            type="button"
                                            className="files-header__profile-item"
                                            onClick={() => {
                                                Logout();
                                                setProfileMenuOpen(false);
                                            }}
                                        >
                                            <HiArrowRightOnRectangle className="files-header__profile-item-icon" />
                                            <span>{t("sidenav.logout")}</span>
                                        </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="files-content max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-5 md:mb-6 gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl sm:text-2xl font-semibold text-indigo-900 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{t("files.items")}</h2>
                            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-indigo-700" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                {filesLoading ? t("files.loading") : `${unifiedItems?.length || 0} ${t("files.itemsCount")}`}
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0 gap-2 flex-wrap">
                            {isSelectionMode && (selectedItems.files.length > 0 || selectedItems.folders.length > 0) && (
                                <>
                                    {FilterKey === 'archived' ? (
                                        <button
                                            onClick={unarchiveMultipleItems}
                                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                                        >
                                            <FiArchive className="h-4 w-4" />
                                            Unarchive ({selectedItems.files.length + selectedItems.folders.length})
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={createZipFromSelected}
                                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-amber-700 transition-all flex items-center gap-2"
                                            >
                                                <LuFileArchive className="h-4 w-4" />
                                                Create Zip ({selectedItems.files.length + selectedItems.folders.length})
                                            </button>
                                            <button
                                                onClick={archiveMultipleItems}
                                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                                            >
                                                <FiArchive className="h-4 w-4" />
                                                Archive ({selectedItems.files.length + selectedItems.folders.length})
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={shareMultipleItems}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                                    >
                                        <HiShare className="h-4 w-4" />
                                        Share ({selectedItems.files.length + selectedItems.folders.length})
                                    </button>
                                </>
                            )}
                            <button
                                onClick={toggleSelectionMode}
                                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                                    isSelectionMode
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                }`}
                            >
                                {isSelectionMode ? 'Cancel' : 'Select'}
                            </button>
                            <span className="text-xs sm:text-sm text-indigo-700 mr-1 sm:mr-2 hidden xs:inline" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{t("files.view")}</span>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid'
                                    ? 'bg-indigo-600 border-2 border-indigo-700 text-white'
                                    : 'bg-white border-2 border-indigo-300 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400'
                                    }`}
                            >
                                <HiViewGrid className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${viewMode === 'list'
                                    ? 'bg-indigo-600 border-2 border-indigo-700 text-white'
                                    : 'bg-white border-2 border-indigo-300 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400'
                                    }`}
                            >
                                <HiViewList className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-indigo-200 p-0.5 sm:p-1 mb-4 sm:mb-5 md:mb-6 overflow-x-auto">
                        <div className="flex flex-wrap gap-0.5 sm:gap-1 min-w-max sm:min-w-0">
                            {filterOptions.map((option) => (
                                <button
                                    key={option.key}
                                    onClick={() => SelectFilter(option.key)}
                                    className={`flex items-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${FilterKey === option.key ? Active : InActive
                                        }`}
                                >
                                    <span className="hidden sm:inline">{option.label}</span>
                                    <span className="sm:hidden">{option.label.split(' ')[0]}</span>
                                    <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${FilterKey === option.key
                                        ? 'bg-white bg-opacity-20 text-white'
                                        : 'bg-indigo-100 text-indigo-600'
                                        }`}>
                                        {option.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <UnifiedItemList
                        items={unifiedItems || []}
                        isLoading={filesLoading}
                        viewMode={viewMode}
                        isSelectionMode={isSelectionMode}
                        selectedItems={selectedItems}
                        onToggleSelect={toggleItemSelection}
                        onDelete={(item) => {
                            if (item.isFolder || item.itemType === 'folder') {
                                DeleteFolder(item);
                            } else {
                                const fileId = item._id || item.id;
                                // Implement file deletion
                                fileService.deleteFile(fileId, Token.MegaBox)
                                    .then(() => {
                                        toast.success(t("files.fileDeleted"), ToastOptions("success"));
                                        refetch();
                                        queryClient.invalidateQueries("GetArchivedFilesCount");
                                    })
                                    .catch((error) => {
                                        toast.error(t("files.deleteError"), ToastOptions("error"));
                                    });
                            }
                        }}
                        onRename={(name, close, id, isFolder) => ToggleNameChange(name, close, id, isFolder)}
                        onShare={(id, isFolder) => ShareFile(id, isFolder)}
                        onArchive={(item) => {
                            if (item.isFolder || item.itemType === 'folder') {
                                ArchiveFolder(item);
                            } else {
                                // Implement file archiving
                                fileService.archiveFile(item._id || item.id, Token.MegaBox)
                                    .then(() => {
                                        toast.success(t("files.fileArchived"), ToastOptions("success"));
                                        refetch();
                                        queryClient.invalidateQueries("GetArchivedFilesCount");
                                    })
                                    .catch((error) => {
                                        toast.error(t("files.archiveError"), ToastOptions("error"));
                                    });
                            }
                        }}
                        onOpenItem={(item) => {
                            if (item.isFolder || item.itemType === 'folder') {
                                // Navigate to folder
                                const folderId = item._id || item.id;
                                const folderName = item.name || item.fileName;
                                // Guard against undefined folderId
                                if (!folderId || !folderName) {
                                    console.error('Cannot open folder: missing id or name', { folderId, folderName, item });
                                    toast.error("Cannot open folder: missing folder information", ToastOptions("error"));
                                    return;
                                }
                                navigate(`/dashboard/file/${encodeURIComponent(folderName)}/${folderId}`);
                            } else {
                                // Open file preview
                                const url = item.url || item.accessUrl || item._sharedUrl || item.sharedUrl || item.shareLink;
                                if (url) {
                                    const fileType = item.fileType || item.type;
                                    Representation(url, fileType);
                                }
                            }
                        }}
                    />
                </div>
            </div>
        </div>

        <AnimatePresence>
            {showUploadOptions && (
                <UploadOptions 
                    key="upload-options" 
                    onClose={ToggleUploadOptions}
                    onSelectDesktop={handleSelectDesktop}
                    onSelectMegaBox={handleSelectMegaBox}
                    isPromoter={isPromoter}
                />
            )}
            {AddFileShow && <UploadFile key="upload-file" ToggleUploadFile={ToggleShowAddFile} refetch={refetch} />}
            {showUploadFromMegaBox && (
                <UploadFromMegaBox 
                    key="upload-from-megabox" 
                    ToggleUploadFile={ToggleUploadFromMegaBox} 
                    refetch={refetch} 
                />
            )}
            {AddFolderAdding && <AddFolder key="add-folder" ToggleUploadFile={ToggleFolderAdding} refetch={refetchFoldersWithSidenav} />}
            {ShowRepresent && <Represents key="represents" path={Path} type={fileType} ToggleUploadFile={() => Representation("", "", true)} />}
            {ShowUpdateName && (
                <ChangeName
                    key="change-name"
                    oldFileName={OldName}
                    Toggle={ToggleNameChange}
                    refetch={IsFolder ? refFolders : refetch}
                    FileId={FileId}
                    isFolder={IsFolder}
                    isZip={IsZip}
                />
            )}
            {showShareModal && (
                <ShareLinkModal
                    key="share-link-modal"
                    isOpen={showShareModal}
                    onClose={() => {
                        setShowShareModal(false);
                        setShareUrl('');
                    }}
                    shareUrl={shareUrl}
                    title={shareTitle}
                />
            )}
            {showPromoterModal && (
                <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowPromoterModal(false)}
                >
                    <motion.div
                        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-indigo-100"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-lg">
                                    <HiUserGroup className="text-amber-600 text-xl" />
                                </div>
                                <h3 className="text-xl font-bold text-indigo-900">
                                    {t("files.bePromoter") || "Be a Promoter"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowPromoterModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Message */}
                        <div className="mb-6">
                            <p className="text-gray-700 mb-4">
                                {t("files.shareRequiresPromoter") || "Sharing is only available for promoters. Please become a promoter to share files."}
                            </p>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                <p className="text-sm text-indigo-800">
                                    {t("files.promoterBenefits") || "As a promoter, you can share files and folders, track analytics, and earn from your content."}
                                </p>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPromoterModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                {t("common.cancel") || "Cancel"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowPromoterModal(false);
                                    navigate('/Partners');
                                }}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <HiUserGroup className="w-5 h-5" />
                                {t("files.viewPlans") || "View Plans"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
}
