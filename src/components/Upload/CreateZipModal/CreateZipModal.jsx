import React, { useState, useMemo, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import { LuFileArchive, LuFolder, LuFile, LuSearch } from 'react-icons/lu';
import { useCookies } from 'react-cookie';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { PreventFunction } from '../../../helpers/Prevent';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { useLanguage } from '../../../context/LanguageContext';
import { fileService } from '../../../services/fileService';
import { getAllUnifiedItems } from '../../../services/itemsService';
import './CreateZipModal.scss';

const MAX_ZIP_ITEMS = 100;
const EMPTY_ITEMS = [];

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let idx = 0;
    while (val >= 1024 && idx < units.length - 1) {
        val /= 1024;
        idx += 1;
    }
    return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function normalizeCandidate(item) {
    const type = item.type || (item.isFolder || item.itemType === 'folder' ? 'folder' : 'file');
    const id = String(item.id || item._id);
    const name = item.name || item.fileName || '';
    const fileSize = item.fileSize || item.size || 0;
    return { type, id, name, fileSize };
}

export default function CreateZipModal({
    open = true,
    onClose,
    folderId = null,
    initialItems = EMPTY_ITEMS,
    availableItems,
    onSuccess,
    refetch,
}) {
    const { t } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const queryClient = useQueryClient();

    const [zipName, setZipName] = useState('');
    const [search, setSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMap, setSelectedMap] = useState(() => {
        const map = new Map();
        (initialItems || []).forEach((item) => {
            const norm = normalizeCandidate(item);
            if (norm.id) {
                map.set(`${norm.type}:${norm.id}`, norm);
            }
        });
        return map;
    });

    const wasOpenRef = useRef(open);

    useEffect(() => {
        const transitionedToOpen = open && !wasOpenRef.current;
        wasOpenRef.current = open;
        if (!transitionedToOpen) return;
        const map = new Map();
        (initialItems || EMPTY_ITEMS).forEach((item) => {
            const norm = normalizeCandidate(item);
            if (norm.id) {
                map.set(`${norm.type}:${norm.id}`, norm);
            }
        });
        setSelectedMap(map);
        setZipName('');
        setSearch('');
    }, [open, initialItems]);

    const shouldFetch = open && (!availableItems || availableItems.length === 0);

    const { data: fetchedItems = [], isLoading } = useQuery(
        ['createZipCandidates', folderId || 'root'],
        () => getAllUnifiedItems(cookies.MegaBox, { folderId: folderId || undefined }),
        {
            enabled: shouldFetch && Boolean(cookies.MegaBox),
            staleTime: 30000,
        }
    );

    const allCandidates = useMemo(() => {
        const source = availableItems && availableItems.length > 0 ? availableItems : fetchedItems;
        const seen = new Map();
        source.forEach((raw) => {
            const norm = normalizeCandidate(raw);
            if (norm.id) {
                seen.set(`${norm.type}:${norm.id}`, norm);
            }
        });
        (initialItems || []).forEach((raw) => {
            const norm = normalizeCandidate(raw);
            const key = `${norm.type}:${norm.id}`;
            if (norm.id && !seen.has(key)) {
                seen.set(key, norm);
            }
        });
        return Array.from(seen.values());
    }, [availableItems, fetchedItems, initialItems]);

    const filteredCandidates = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allCandidates;
        return allCandidates.filter((item) => item.name.toLowerCase().includes(q));
    }, [allCandidates, search]);

    if (!open) return null;

    const selectedCount = selectedMap.size;

    const toggleItem = (item) => {
        const key = `${item.type}:${item.id}`;
        setSelectedMap((prev) => {
            const next = new Map(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                if (next.size >= MAX_ZIP_ITEMS) {
                    toast.warning(
                        t('filesV2.zipMaxItemsWarning') || `You can select up to ${MAX_ZIP_ITEMS} items`,
                        ToastOptions('warning')
                    );
                    return prev;
                }
                next.set(key, item);
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedCount < 1 || selectedCount > MAX_ZIP_ITEMS || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const items = Array.from(selectedMap.values()).map(({ type, id }) => ({ type, id }));
            const result = await fileService.createZip(
                {
                    items,
                    fileName: zipName.trim() || undefined,
                    folderId: folderId || undefined,
                },
                cookies.MegaBox
            );
            toast.success(
                result?.message || t('filesV2.zipCreatedSuccess') || 'ZIP archive created successfully',
                ToastOptions('success')
            );
            queryClient.invalidateQueries(['items']);
            queryClient.invalidateQueries(['userStorage']);
            if (refetch) await refetch();
            if (onSuccess) onSuccess(result);
            if (onClose) onClose();
        } catch (error) {
            const msg = error?.message || t('filesV2.zipCreateFailed') || 'Failed to create ZIP archive';
            toast.error(msg, ToastOptions('error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            className="CreateZipModal_backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className="CreateZipModal_modal"
                onClick={PreventFunction}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.25 }}
            >
                <div className="CreateZipModal_header">
                    <div className="CreateZipModal_title_wrap">
                        <div className="CreateZipModal_icon">
                            <LuFileArchive className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="CreateZipModal_title">
                                {t('filesV2.createZipTitle') || 'Create ZIP Archive'}
                            </h2>
                            <p className="CreateZipModal_subtitle">
                                {t('filesV2.createZipSubtitle') || 'Select files or folders to compress into a ZIP file'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="CreateZipModal_close"
                        onClick={onClose}
                        aria-label={t('common.close') || 'Close'}
                    >
                        <HiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="CreateZipModal_body">
                        <div className="CreateZipModal_field">
                            <label htmlFor="create-zip-name">
                                {t('filesV2.zipNameLabel') || 'ZIP file name (optional)'}
                            </label>
                            <input
                                id="create-zip-name"
                                type="text"
                                className="CreateZipModal_input"
                                value={zipName}
                                onChange={(e) => setZipName(e.target.value)}
                                placeholder={t('filesV2.zipNamePlaceholder') || 'archive.zip'}
                                maxLength={150}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="CreateZipModal_toolbar">
                            <div className="CreateZipModal_search_wrap">
                                <LuSearch className="CreateZipModal_search_icon w-4 h-4" />
                                <input
                                    type="text"
                                    className="CreateZipModal_search_input"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('filesV2.searchItemsPlaceholder') || 'Search files and folders...'}
                                />
                            </div>
                            <span className="CreateZipModal_count">
                                {selectedCount} / {MAX_ZIP_ITEMS} {t('filesV2.selected') || 'selected'}
                            </span>
                        </div>

                        <div className="CreateZipModal_list">
                            {isLoading ? (
                                <div className="CreateZipModal_empty">
                                    {t('common.loading') || 'Loading...'}
                                </div>
                            ) : filteredCandidates.length === 0 ? (
                                <div className="CreateZipModal_empty">
                                    {t('filesV2.noItemsAvailable') || 'No files or folders available'}
                                </div>
                            ) : (
                                filteredCandidates.map((item) => {
                                    const key = `${item.type}:${item.id}`;
                                    const checked = selectedMap.has(key);
                                    return (
                                        <label
                                            key={key}
                                            className={`CreateZipModal_item ${checked ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleItem(item)}
                                                disabled={isSubmitting}
                                            />
                                            <span className="CreateZipModal_item_icon">
                                                {item.type === 'folder' ? (
                                                    <LuFolder className="w-4 h-4" />
                                                ) : (
                                                    <LuFile className="w-4 h-4" />
                                                )}
                                            </span>
                                            <div className="CreateZipModal_item_info">
                                                <div className="CreateZipModal_item_name">{item.name}</div>
                                                <div className="CreateZipModal_item_meta">
                                                    {item.type === 'folder'
                                                        ? (t('folder.folder') || 'Folder')
                                                        : formatBytes(item.fileSize)}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="CreateZipModal_footer">
                        <button
                            type="button"
                            className="CreateZipModal_btn_cancel"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            {t('common.cancel') || 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            className="CreateZipModal_btn_submit"
                            disabled={selectedCount < 1 || selectedCount > MAX_ZIP_ITEMS || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {t('filesV2.creatingZip') || 'Creating...'}
                                </>
                            ) : (
                                <>
                                    <LuFileArchive className="w-4 h-4" />
                                    {t('filesV2.createZipButton') || 'Create ZIP'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
