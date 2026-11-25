import React, { useState, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import { HiCloud } from 'react-icons/hi2';
import { LuFile, LuSearch, LuCopy } from 'react-icons/lu';
import { useCookies } from 'react-cookie';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { PreventFunction } from '../../../helpers/Prevent';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { useLanguage } from '../../../context/LanguageContext';
import { fileService } from '../../../services/fileService';
import { getAllUnifiedItems } from '../../../services/itemsService';
import './UploadFromMegaBox.scss';

const MAX_COPY_FILES = 50;

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let idx = 0;
    while (val >= 1024 && idx < units.length - 1) {
        val /= 1024;
        idx += 1;
    }
    return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function UploadFromMegaBox({
    onClose,
    ToggleUploadFile,
    insideFile = false,
    id,
    targetFolderId,
    channelId,
    refetch,
    onSuccess,
}) {
    const closeHandler = onClose || ToggleUploadFile;
    const { t } = useLanguage();
    const [cookies] = useCookies(['MegaBox']);
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: allItems = [], isLoading } = useQuery(
        ['copyFromMegaBoxFiles'],
        () => getAllUnifiedItems(cookies.MegaBox),
        {
            enabled: Boolean(cookies.MegaBox),
            staleTime: 30000,
        }
    );

    const completedFiles = useMemo(() => {
        return allItems.filter((item) => {
            const isFolder = item.isFolder || item.itemType === 'folder';
            if (isFolder) return false;
            if (item.upload_status && item.upload_status !== 'completed') return false;
            if (channelId && !(item.isVideo || (item.fileType || '').startsWith('video/'))) {
                return false;
            }
            return Boolean(item._id || item.id);
        });
    }, [allItems, channelId]);

    const filteredFiles = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return completedFiles;
        return completedFiles.filter((file) =>
            (file.fileName || file.name || '').toLowerCase().includes(q)
        );
    }, [completedFiles, search]);

    const toggleFile = (fileId) => {
        setSelectedIds((prev) => {
            if (prev.includes(fileId)) {
                return prev.filter((item) => item !== fileId);
            }
            if (prev.length >= MAX_COPY_FILES) {
                toast.warning(
                    t('filesV2.copyMaxFilesWarning') || `You can copy up to ${MAX_COPY_FILES} files at once`,
                    ToastOptions('warning')
                );
                return prev;
            }
            return [...prev, fileId];
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedIds.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const resolvedTargetFolderId = targetFolderId ?? (insideFile ? id : undefined);
            const result = await fileService.copyFiles(
                {
                    fileIds: selectedIds,
                    targetFolderId: resolvedTargetFolderId || undefined,
                    channelId: channelId || undefined,
                },
                cookies.MegaBox
            );
            const count = result?.copiedCount ?? selectedIds.length;
            toast.success(
                result?.message ||
                    (t('filesV2.copyFilesSuccess') || `${count} file(s) copied successfully`),
                ToastOptions('success')
            );
            queryClient.invalidateQueries(['items']);
            queryClient.invalidateQueries(['userStorage']);
            if (channelId) {
                queryClient.invalidateQueries(['channelFiles', channelId]);
            }
            if (refetch) await refetch();
            if (onSuccess) onSuccess(result);
            if (closeHandler) closeHandler();
        } catch (error) {
            const msg = error?.message || t('filesV2.copyFilesFailed') || 'Failed to copy files';
            toast.error(msg, ToastOptions('error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            className="UploadFromMegaBox_backdrop"
            onClick={closeHandler}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className="UploadFromMegaBox_modal"
                onClick={PreventFunction}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.25 }}
            >
                <div className="UploadFromMegaBox_header">
                    <div className="UploadFromMegaBox_title_wrap">
                        <div className="UploadFromMegaBox_icon">
                            <HiCloud className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="UploadFromMegaBox_title">
                                {t('filesV2.copyFromMegaBoxTitle') || 'Copy from MegaBox'}
                            </h2>
                            <p className="UploadFromMegaBox_subtitle">
                                {t('filesV2.copyFromMegaBoxSubtitle') || 'Select files from your MegaBox drive to copy here'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="UploadFromMegaBox_close"
                        onClick={closeHandler}
                        aria-label={t('common.close') || 'Close'}
                    >
                        <HiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="UploadFromMegaBox_body">
                        <div className="UploadFromMegaBox_toolbar">
                            <div className="UploadFromMegaBox_search_wrap">
                                <LuSearch className="UploadFromMegaBox_search_icon w-4 h-4" />
                                <input
                                    type="text"
                                    className="UploadFromMegaBox_search_input"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('filesV2.searchFilesPlaceholder') || 'Search your files...'}
                                />
                            </div>
                            <span className="UploadFromMegaBox_count">
                                {selectedIds.length} / {MAX_COPY_FILES} {t('filesV2.selected') || 'selected'}
                            </span>
                        </div>

                        <div className="UploadFromMegaBox_list">
                            {isLoading ? (
                                <div className="UploadFromMegaBox_empty">
                                    {t('common.loading') || 'Loading...'}
                                </div>
                            ) : filteredFiles.length === 0 ? (
                                <div className="UploadFromMegaBox_empty">
                                    {t('filesV2.noFilesToCopy') || 'No completed files found in your drive'}
                                </div>
                            ) : (
                                filteredFiles.map((file) => {
                                    const fileId = String(file._id || file.id);
                                    const checked = selectedIds.includes(fileId);
                                    return (
                                        <label
                                            key={fileId}
                                            className={`UploadFromMegaBox_item ${checked ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleFile(fileId)}
                                                disabled={isSubmitting}
                                            />
                                            <span className="UploadFromMegaBox_item_icon">
                                                <LuFile className="w-4 h-4" />
                                            </span>
                                            <div className="UploadFromMegaBox_item_info">
                                                <div className="UploadFromMegaBox_item_name">
                                                    {file.fileName || file.name}
                                                </div>
                                                <div className="UploadFromMegaBox_item_meta">
                                                    {formatBytes(file.fileSize || file.size)}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="UploadFromMegaBox_footer">
                        <button
                            type="button"
                            className="UploadFromMegaBox_btn_cancel"
                            onClick={closeHandler}
                            disabled={isSubmitting}
                        >
                            {t('common.cancel') || 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            className="UploadFromMegaBox_btn_submit"
                            disabled={selectedIds.length === 0 || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {t('filesV2.copyingFiles') || 'Copying...'}
                                </>
                            ) : (
                                <>
                                    <LuCopy className="w-4 h-4" />
                                    {t('filesV2.copyFilesButton') || 'Copy Selected'}
                                    {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
