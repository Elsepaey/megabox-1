import React, { useState, useEffect } from 'react'
import './Sidenav.scss'
import {
    HiChevronLeft,
    HiChevronRight,
    HiBars3,
    HiArrowRightOnRectangle,
    HiUserCircle,
    HiFolder,
    HiShare,
    HiUsers,
    HiChartBar,
    HiUserGroup,
    HiDocumentText,
    HiHandRaised,
    HiBell,
    HiCurrencyDollar,
    HiChevronDown,
    HiSun,
    HiMoon
} from "react-icons/hi2";
import { FiGlobe } from 'react-icons/fi';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery, useQueryClient } from 'react-query';
import { notificationService, userService } from '../../services';
import { fileService } from '../../services/api';
import { getAllUnifiedItems } from '../../services/itemsService';
import { API_URL } from '../../services/api';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../helpers/ToastOptions';
import { getFileCategory } from '../../helpers/MimeType';
import Represents from '../Represents/Represents';

export default function Sidenav({ role }) {
    const [collapsed, setcollapsed] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false); // renamed from Hide for clarity
    const [expandedFolders, setExpandedFolders] = useState({});
    const [folderFiles, setFolderFiles] = useState({});
    const [allFilesOpen, setAllFilesOpen] = useState(false);
    const [ShowRepresent, setRepresents] = useState(false);
    const [Path, setPath] = useState();
    const [fileType, setfileType] = useState();
    const { pathname } = useLocation();
    const navigate = useNavigate()
    const { logout } = useAuth();
    const { t, language, changeLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [Token] = useCookies(['MegaBox']);
    const queryClient = useQueryClient();

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
    };

    // Get unread notifications count
    useQuery(
        ['userNotifications'],
        () => notificationService.getUserNotifications(Token.MegaBox),
        {
            enabled: !!Token.MegaBox && role === "User",
            refetchInterval: 30000, // Refetch every 30 seconds
            retry: false
        }
    );

    const { data: userData } = useQuery(
        ['userAccount'],
        () => userService.getUserInfo(Token.MegaBox),
        {
            enabled: !!Token.MegaBox && role === "User",
            retry: false
        }
    );

    const isPromoter = userData?.isPromoter === "true" || userData?.isPromoter === true;

    const GetFolders = async () => {
        if (!Token.MegaBox || role !== "User") return { folders: [] };
        try {
            const items = await getAllUnifiedItems(Token.MegaBox, { type: 'folders' });
            // Filter to get only folders
            const folders = items.filter(item => item.isFolder || item.itemType === 'folder');
            return { folders };
        } catch {
            return { folders: [] };
        }
    };

    const { data: foldersData } = useQuery(
        ['userFolders'],
        GetFolders,
        {
            enabled: !!Token.MegaBox && role === "User",
            retry: false,
            refetchInterval: 10000, // Refetch every 10 seconds
            refetchOnWindowFocus: true, // Refetch when window gains focus
            refetchOnMount: true // Refetch when component mounts
        }
    );

    const GetFiles = async () => {
        if (!Token.MegaBox || role !== "User") return { files: [] };
        try {
            const items = await getAllUnifiedItems(Token.MegaBox);
            // Split into files and folders for backward compatibility
            const files = items.filter(item => !item.isFolder && item.itemType !== 'folder');
            return { files };
        } catch {
            return { files: [] };
        }
    };

    const { data: filesData } = useQuery(
        ['userFiles'],
        GetFiles,
        {
            enabled: !!Token.MegaBox && role === "User",
            retry: false,
            refetchInterval: 10000, // Refetch every 10 seconds
            refetchOnWindowFocus: true, // Refetch when window gains focus
            refetchOnMount: true // Refetch when component mounts
        }
    );

    const handleFileClick = (file) => {
        const fileCategory = getFileCategory(file?.fileType);
        const fileUrl = file?.url || file?.fileUrl;

        if (fileCategory === 'image' || fileCategory === 'video') {
            Representation(fileUrl, file?.fileType, false);
            closeSidebar();
        } else {
            const fileName = file?.fileName || file?.name;
            const fileId = file?._id || file?.id;
            // Guard against undefined fileName or fileId
            if (!fileName || !fileId) {
                console.error('Cannot open file: missing name or id', { fileName, fileId, file });
                return;
            }
            const filePath = isPromoter ? '/Promoter/file' : '/dashboard/file';
            navigate(`${filePath}/${encodeURIComponent(fileName)}/${fileId}`);
            closeSidebar();
        }
    };

    const handleFolderClick = (folder, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const folderId = folder?._id || folder?.id;
        const folderName = folder?.name;
        // Guard against undefined folderId or folderName
        if (!folderId || !folderName) {
            console.error('Cannot open folder: missing id or name', { folderId, folderName, folder });
            return;
        }
        const filePath = isPromoter ? '/Promoter/file' : '/dashboard/file';
        navigate(`${filePath}/${encodeURIComponent(folderName)}/${folderId}`);
        closeSidebar();
    };

    const renderFolder = (folder, level = 0) => {
        const folderId = folder?._id || folder?.id;
        const isExpanded = expandedFolders[folderId] === true;
        const files = folderFiles[folderId] || [];
        const subfolders = folder?.children || [];
        
        return (
            <SubMenu
                key={folderId}
                label={
                    <span 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleFolderClick(folder, e);
                        }}
                        style={{ cursor: 'pointer', flex: 1 }}
                    >
                        {folder?.name}
                    </span>
                }
                icon={
                    <svg className="sidenav-files-tree-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <path d="M3 6C3 4.89543 3.89543 4 5 4H8.58579C8.851 4 9.10536 4.10536 9.29289 4.29289L10.7071 5.70711C10.8946 5.89464 11.149 6 11.4142 6H15C16.1046 6 17 6.89543 17 8V14C17 15.1046 16.1046 16 15 16H5C3.89543 16 3 15.1046 3 14V6Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1.5" />
                    </svg>
                }
                className="sidenav-folder-submenu"
                open={isExpanded}
                defaultOpen={false}
                onOpenChange={(open) => {
                    if (collapsed) {
                        return;
                    }
                    
                    setExpandedFolders(prev => ({
                        ...prev,
                        [folderId]: open
                    }));
                    
                    if (open) {
                        userService.getFolderFiles(folderId, null, Token.MegaBox)
                        .then((data) => {
                            setFolderFiles(prev => ({
                                ...prev,
                                [folderId]: data?.files || []
                            }));
                        })
                        .catch(() => {
                            setFolderFiles(prev => ({
                                ...prev,
                                [folderId]: []
                            }));
                        });
                        
                        queryClient.invalidateQueries(['userFolders']);
                        queryClient.invalidateQueries(['userFiles']);
                    }
                }}
            >
                {subfolders.length > 0 && subfolders.map((subfolder) => renderFolder(subfolder, level + 1))}
                
                {files.length > 0 ? (
                    files.map((file) => (
                        <MenuItem
                            key={file?._id || file?.id}
                            className="sidenav-files-tree-item sidenav-files-tree-item--file"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFileClick(file);
                            }}
                            icon={
                                <svg className="sidenav-files-tree-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                    <path d="M4 4C4 2.89543 4.89543 2 6 2H10.5858C10.851 2 11.1054 2.10536 11.2929 2.29289L15.7071 6.70711C15.8946 6.89464 16 7.149 16 7.41421V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1.5"/>
                                </svg>
                            }
                        >
                            {file?.fileName || file?.name}
                        </MenuItem>
                    ))
                ) : isExpanded && folderFiles[folderId] && subfolders.length === 0 ? (
                    <div className="sidenav-empty-folder">
                        {t("sidenav.emptyFolder") || "Empty folder"}
                    </div>
                ) : null}
            </SubMenu>
        );
    };

    const filesNotInFolders = filesData?.files?.filter(file => !file.folderId && !file.folder) || [];

    const Logout = async () => {
        await logout();
        toast.success(t('common.logoutSuccess') || 'Logged out successfully', ToastOptions('success'));
        navigate('/login');
    }

    const toggleLanguage = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const newLang = language === 'en' ? 'ar' : 'en';
        changeLanguage(newLang);
    }

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    }

    const closeSidebar = () => {
        setSidebarOpen(false);
    }
    useEffect(() => {
        const handleCloseSidebar = () => {
            closeSidebar();
        };
        window.addEventListener('closeSidebar', handleCloseSidebar);
        return () => {
            window.removeEventListener('closeSidebar', handleCloseSidebar);
        };
    }, []);

    const handleICon = () => {
        setcollapsed(!collapsed);
    }

    useEffect(() => {
        if (collapsed) {
            setAllFilesOpen(false);
            setExpandedFolders({});
        }
    }, [collapsed]);
    
    useEffect(() => {
        if (!allFilesOpen) {
            setExpandedFolders({});
        }
    }, [allFilesOpen]);

    useEffect(() => {
        if (collapsed || !allFilesOpen) return;

        const timeoutId = setTimeout(() => {
            const allFolderSubmenus = document.querySelectorAll('.sidenav-folder-submenu');
            
            allFolderSubmenus.forEach((submenu) => {
                const isSubmenuRoot = submenu.classList.contains('ps-submenu-root');
                const isOpen = submenu.classList.contains('ps-open') || 
                               submenu.getAttribute('aria-expanded') === 'true';
                
                if (isSubmenuRoot && isOpen) {
                    const content = submenu.querySelector('.ps-submenu-content');
                    if (content) {
                        content.style.setProperty('display', 'block', 'important');
                        content.style.setProperty('visibility', 'visible', 'important');
                        content.style.setProperty('opacity', '1', 'important');
                        content.style.setProperty('height', 'auto', 'important');
                        content.style.setProperty('max-height', 'none', 'important');
                        content.style.setProperty('overflow-y', 'visible', 'important');
                    }
                }
            });
        }, 50);

        return () => clearTimeout(timeoutId);
    }, [expandedFolders, allFilesOpen, collapsed]);

    return <>

        {/* Backdrop - only visible when sidebar is open on mobile */}
        <div 
            className={`dropback ${sidebarOpen ? 'apper-dropback' : ''}`} 
            onClick={closeSidebar}
        />
        
        {/* Sidebar container - doesn't cover the whole screen */}
        <aside className="allnav">

            <Sidebar collapsed={collapsed}>
                <Menu className='main-menu'>

                    {/* Main sidebar panel - this is what slides in/out */}
                    <Menu className={`main-side ${sidebarOpen ? 'show' : 'hide'} ${collapsed ? 'collapsed' : ''} p-1 overflow-y-auto min-h-screen`}>

                        <MenuItem
                            className="mb-3 rounded-lg text-xl mt-3 text-white cursor-pointer close"
                            onClick={handleICon}
                            icon={collapsed ? <HiBars3 className="text-lg" /> : (language === 'ar' ? <HiChevronRight className="text-lg" /> : <HiChevronLeft className="text-lg" />)}
                        ></MenuItem>

                        <Link to={'/'} className='flex justify-center items-center my-3 mb-4 sidenav-logo-container' style={{ display: "flex", justifyContent: "center", flexDirection: collapsed ? 'column' : 'row', gap: collapsed ? '0.5rem' : '0.75rem' }}>
                            <svg
                                className={collapsed ? 'Logo-colaps' : 'Logo'}
                                viewBox="0 0 48 48"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <linearGradient id="sidenavLogoGradient" x1="0" y1="0" x2="48" y2="48">
                                        <stop offset="0%" stopColor="var(--color-indigo-400)" />
                                        <stop offset="50%" stopColor="var(--color-indigo-500)" />
                                        <stop offset="100%" stopColor="var(--color-indigo-600)" />
                                    </linearGradient>
                                    <linearGradient id="sidenavLogoGradient2" x1="0" y1="0" x2="48" y2="48">
                                        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                                        <stop offset="100%" stopColor="rgba(255, 255, 255, 0.85)" />
                                    </linearGradient>
                                </defs>
                                <rect width="48" height="48" rx="12" fill="url(#sidenavLogoGradient)" />
                                <path d="M24 12C18.5 12 14 16.5 14 22C14 22.5 14 23 14.1 23.5C12.3 24.2 11 25.8 11 27.5C11 29.7 12.8 31.5 15 31.5H33C35.2 31.5 37 29.7 37 27.5C37 25.8 35.7 24.2 33.9 23.5C34 23 34 22.5 34 22C34 16.5 29.5 12 24 12Z" fill="url(#sidenavLogoGradient2)" />
                                <rect x="16" y="16" width="16" height="16" rx="2.5" fill="var(--color-indigo-600)" opacity="0.95" />
                                <rect x="20" y="20" width="8" height="8" rx="1.5" fill="white" opacity="0.9" />
                                <line x1="16" y1="16" x2="16" y2="32" stroke="white" strokeWidth="2.5" opacity="0.8" />
                                <line x1="32" y1="16" x2="32" y2="32" stroke="white" strokeWidth="2.5" opacity="0.8" />
                                <line x1="16" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2.5" opacity="0.8" />
                                <line x1="16" y1="24" x2="32" y2="24" stroke="white" strokeWidth="2" opacity="0.6" />
                                <line x1="24" y1="16" x2="24" y2="32" stroke="white" strokeWidth="2" opacity="0.6" />
                            </svg>
                            {!collapsed && <span className="sidenav-logo-text">MegaBox</span>}
                        </Link>



                        {role === "User" ? (
                            <>
                                <SubMenu
                                    label={
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isPromoter) {
                                                    navigate('/dashboard/files');
                                                    closeSidebar();
                                                }
                                            }}
                                            style={{ cursor: 'pointer', flex: 1 }}
                                        >
                                            {t("sidenav.allFiles")}
                                        </span>
                                    }
                                    icon={<HiFolder className="icon transition ease-linear" />}
                                    className="sidenav-files-submenu"
                                    open={!collapsed && allFilesOpen}
                                    onOpenChange={(open) => {
                                        if (collapsed) {
                                            setAllFilesOpen(false);
                                            return;
                                        }
                                        setAllFilesOpen(open);
                                        
                                        if (open) {
                                            queryClient.invalidateQueries(['userFolders']);
                                            queryClient.invalidateQueries(['userFiles']);
                                        }
                                    }}
                                    defaultOpen={false}
                                >
                                    {foldersData?.folders?.map((folder) => renderFolder(folder))}
                                    
                                    {filesNotInFolders.slice(0, 50).map((file) => (
                                        <MenuItem
                                            key={file?._id || file?.id}
                                            className="sidenav-files-tree-item sidenav-files-tree-item--file"
                                            onClick={() => handleFileClick(file)}
                                            icon={
                                                <svg className="sidenav-files-tree-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                                                    <path d="M4 4C4 2.89543 4.89543 2 6 2H10.5858C10.851 2 11.1054 2.10536 11.2929 2.29289L15.7071 6.70711C15.8946 6.89464 16 7.149 16 7.41421V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1.5"/>
                                                </svg>
                                            }
                                        >
                                            {file?.fileName || file?.name}
                                        </MenuItem>
                                    ))}
                                </SubMenu>
                            </>
                        ) : role === "Owner" ? (
                            <>
                                <MenuItem onClick={closeSidebar} className={pathname === "/Owner/profile" ? 'menu-items Active' : 'menu-items'} component={<Link to='/Owner/profile' className='Remove_hover transition ease-linear' />}
                                    icon={<HiUserCircle className={pathname === "/Owner/profile" ? 'icon transition ease-linear Active' : 'icon transition ease-linear'} />}>

                                    {t("sidenav.profile")}

                                </MenuItem>



                                <MenuItem onClick={closeSidebar} className={pathname === "/Owner/notifications" ? 'menu-items Active' : 'menu-items'} component={<Link to='/Owner/notifications' className='Remove_hover transition ease-linear' />}
                                    icon={
                                        <div className="relative">
                                            <HiBell className={pathname === "/Owner/notifications" ? 'icon transition ease-linear Active' : 'icon transition ease-linear'} />
                                        </div>
                                    }>

                                    {t("sidenav.notifications")}

                                </MenuItem>



                                <div className="sidenav-bottom-actions">

                                    <MenuItem

                                        className="menu-items ThemeToggle"

                                        icon={theme === 'light' ? <HiSun className="icon" /> : <HiMoon className="icon" />}

                                        onClick={toggleTheme}

                                    >

                                        {!collapsed && (theme === 'light' ? t("navbar.darkMode") || "Dark Mode" : t("navbar.lightMode") || "Light Mode")}

                                    </MenuItem>

                                    <MenuItem

                                        className="menu-items LanguageToggle"

                                        icon={<FiGlobe className="icon" />}

                                        onClick={toggleLanguage}

                                    >

                                        {!collapsed && (language === 'en' ? t("navbar.arabic") : t("navbar.english"))}

                                    </MenuItem>



                                    <MenuItem

                                        className="menu-items Logout"

                                        icon={<HiArrowRightOnRectangle className="icon" />}

                                        onClick={Logout}

                                    >

                                        {!collapsed && t("sidenav.logout")}

                                    </MenuItem>

                                </div>

                            </>

                        ) : null}







                    </Menu>

                </Menu>

            </Sidebar>

        </aside>



        {/* Mobile hamburger button */}

        <span className='bars' onClick={toggleSidebar}>

            {sidebarOpen ? (language === 'ar' ? <HiChevronRight /> : <HiChevronLeft />) : <HiBars3 />}

        </span>

        {/* File Preview Modal */}
        {ShowRepresent && (
            <Represents 
                path={Path} 
                type={fileType} 
                ToggleUploadFile={() => Representation("", "", true)} 
            />
        )}

    </>
}