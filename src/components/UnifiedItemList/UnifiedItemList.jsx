import React from 'react';
import { LuFolder } from 'react-icons/lu';
import { Folder } from '../Folder/Folder';
import File from '../File/File';
import { useLanguage } from '../../context/LanguageContext';

/**
 * UnifiedItemList - Renders a mixed list of files and folders
 *
 * @param {Object} props
 * @param {Array} props.items - Mixed array of files and folders
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.viewMode - 'grid' | 'list'
 * @param {boolean} props.isSelectionMode - Whether selection mode is active
 * @param {Object} props.selectedItems - { files: [], folders: [] }
 * @param {Function} props.onToggleSelect - Handler for item selection
 * @param {Function} props.onDelete - Handler for delete action
 * @param {Function} props.onRename - Handler for rename action
 * @param {Function} props.onShare - Handler for share action
 * @param {Function} props.onArchive - Handler for archive action
 * @param {Function} props.onOpenItem - Handler for opening items (files/folders)
 */
function UnifiedItemList({
    items = [],
    isLoading = false,
    viewMode = 'grid',
    isSelectionMode = false,
    selectedItems = { files: [], folders: [] },
    onToggleSelect,
    onDelete,
    onRename,
    onShare,
    onArchive,
    onOpenItem,
}) {
    const { t } = useLanguage();

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 rounded-lg h-24 sm:h-28 md:h-32"></div>
                        <div className="mt-2 sm:mt-3 bg-gray-200 rounded h-3 sm:h-4 w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (!items || items.length === 0) {
        return (
            <div className="text-center py-8 sm:py-10 md:py-12 px-4">
                <LuFolder
                    className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-indigo-400"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
                <h3 className="mt-2 text-sm font-medium text-indigo-900 drop-shadow-md" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {t("files.noItems")}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-indigo-700 px-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {t("files.noItemsMessage")}
                </p>
            </div>
        );
    }

    // Render items grid/list
    const gridClass = viewMode === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6"
        : "flex flex-col gap-3";

    return (
        <div className={gridClass}>
            {items.map((item, index) => {
                const itemId = item._id || item.id;
                const isFolder = item.isFolder || item.itemType === 'folder';

                if (isFolder) {
                    // Render Folder component
                    return (
                        <Folder
                            key={`folder-${itemId}-${index}`}
                            name={item.name || item.fileName}
                            data={item}
                            onRename={(name, close, id) => onRename?.(name, close, id, true)}
                            onDelete={() => onDelete?.(item)}
                            onShare={() => onShare?.(itemId, true)}
                            onArchive={() => onArchive?.(item)}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedItems.folders?.includes(itemId)}
                            onToggleSelect={onToggleSelect}
                        />
                    );
                } else {
                    // Determine file type
                    const fileType = item.fileType || item.type || '';
                    let Type = 'document'; // default

                    if (fileType.startsWith('image/') || fileType.includes('image')) {
                        Type = 'image';
                    } else if (fileType.startsWith('video/') || fileType.includes('video')) {
                        Type = 'video';
                    } else if (fileType.includes('zip') || fileType === 'application/zip') {
                        Type = 'zip';
                    } else if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('word')) {
                        Type = 'document';
                    }

                    // Render File component
                    return (
                        <File
                            key={`file-${itemId}-${index}`}
                            Type={Type}
                            data={item}
                            viewMode={viewMode}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedItems.files?.includes(itemId)}
                            onToggleSelect={onToggleSelect}
                            onDelete={() => onDelete?.(item)}
                            onRename={(name, close, id) => onRename?.(name, close, id, false)}
                            onShare={() => onShare?.(itemId, false)}
                            onArchive={() => onArchive?.(item)}
                            onOpen={() => onOpenItem?.(item)}
                        />
                    );
                }
            })}
        </div>
    );
}

export default UnifiedItemList;
