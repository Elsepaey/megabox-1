import React, { useState } from 'react';
import { HiX } from "react-icons/hi";
import { HiCheckCircle, HiTrash, HiArrowPath } from "react-icons/hi2";
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { PreventFunction } from '../../../helpers/Prevent';
import { useLanguage } from '../../../context/LanguageContext';
import { useCookies } from 'react-cookie';
import { useQuery } from 'react-query';
import { fileService } from '../../../services/api';
import { getAllUnifiedItems } from '../../../services/itemsService';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../../helpers/ToastOptions';
import axios from 'axios';
import { API_URL } from '../../../services/api';
import './UploadFromMegaBox.scss';

export default function UploadFromMegaBox({ ToggleUploadFile, refetch, insideFile, id }) {
    const { t } = useLanguage();
    const [Token] = useCookies(['MegaBox']);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [, setUploadProgress] = useState({});
    const [UploadLoading, setUploadLoading] = useState(false);

    // Get all files from MegaBox
    const GetFiles = async () => {
        if (!Token.MegaBox) return { files: [] };
        try {
            const items = await getAllUnifiedItems(Token.MegaBox);
            // Filter to get only files (exclude folders)
            const files = items.filter(item => !item.isFolder && item.itemType !== 'folder');
            return { files };
        } catch {
            return { files: [] };
        }
    };

    const { data: filesData, isLoading } = useQuery(
        ['userFilesForUpload'],
        GetFiles,
        {
            enabled: !!Token.MegaBox,
            retry: false
        }
    );

    const getFileTypeIcon = (fileType) => {
        if (fileType?.startsWith('image/')) return '🖼️';
        if (fileType?.startsWith('video/')) return '🎥';
        if (fileType === 'application/pdf') return '📄';
        if (fileType?.includes('zip') || fileType?.includes('rar') || fileType?.includes('7z')) return '📦';
        return '📎';
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const toggleFileSelection = (file) => {
        setSelectedFiles(prev => {
            const exists = prev.some(f => (f._id || f.id) === (file._id || file.id));
            if (exists) {
                return prev.filter(f => (f._id || f.id) !== (file._id || file.id));
            } else {
                return [...prev, file];
            }
        });
    };

    const ClearAllFiles = () => {
        setSelectedFiles([]);
        setUploadProgress({});
    };

    const AddFiles = async () => {
        if (selectedFiles.length === 0) {
            toast.error(t("uploadFromMegaBox.selectFiles"), ToastOptions("error"));
            return;
        }

        setUploadLoading(true);
        let successCount = 0;
        let failCount = 0;

        // Upload files sequentially
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            
            try {
                setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));

                // Copy file by creating a new file entry with the same URL
                let data;
                if (insideFile) {
                    // Upload file to folder - Note: This endpoint might need file object, check API
                    // For now, using axios as the endpoint might expect different format
                    const response = await axios.post(
                        `${API_URL}/user/createFile/${id}`,
                        {
                            fileName: file.fileName || file.name,
                            fileType: file.fileType,
                            url: file.url || file.fileUrl,
                            size: file.size
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${Token.MegaBox}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    data = response.data;
                } else {
                    // Upload file to root - Note: This endpoint might need file object, check API
                    const response = await axios.post(
                        `${API_URL}/auth/createFile`,
                        {
                            fileName: file.fileName || file.name,
                            fileType: file.fileType,
                            url: file.url || file.fileUrl,
                            size: file.size
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${Token.MegaBox}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    data = response.data;
                }

                if (data?.message === "✅ تم رفع الملف بنجاح" || data?.success) {
                    setUploadProgress(prev => ({ ...prev, [i]: 'success' }));
                    successCount++;
                } else {
                    setUploadProgress(prev => ({ ...prev, [i]: 'error' }));
                    failCount++;
                }
            } catch {
                setUploadProgress(prev => ({ ...prev, [i]: 'error' }));
                failCount++;
            }
        }

        setUploadLoading(false);

        // Show results
        if (successCount > 0 && failCount === 0) {
            toast.success(`${successCount} ${successCount === 1 ? t("uploadFromMegaBox.file") : t("uploadFromMegaBox.files")} ${t("uploadFromMegaBox.uploaded")}`, ToastOptions("success"));
            await refetch();
            setTimeout(() => {
                ToggleUploadFile();
            }, 1000);
        } else if (successCount > 0 && failCount > 0) {
            toast.warning(`${successCount} ${successCount === 1 ? t("uploadFromMegaBox.file") : t("uploadFromMegaBox.files")} ${t("uploadFromMegaBox.uploaded")}, ${failCount} ${t("uploadFromMegaBox.failed")}`, ToastOptions("warning"));
            await refetch();
        } else {
            toast.error(t("uploadFromMegaBox.allFailed"), ToastOptions("error"));
        }
    };

    const files = filesData?.files || [];

    return (
        <motion.div 
            className='UploadFromMegaBox_backdrop' 
            onClick={ToggleUploadFile} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.3, ease: 'linear' }} 
            exit={{ opacity: 0 }}
        >
            <motion.div 
                className="UploadFromMegaBox_modal"
                onClick={PreventFunction} 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: 20, opacity: 0 }} 
                transition={{ duration: 0.4, type: 'spring' }}
            >
                <HiX 
                    className='UploadFromMegaBox_close' 
                    onClick={ToggleUploadFile}
                />

                <div className="UploadFromMegaBox_header">
                    <h2 className="UploadFromMegaBox_title">{t("uploadFromMegaBox.title")}</h2>
                    <p className="UploadFromMegaBox_subtitle">{t("uploadFromMegaBox.subtitle")}</p>
                </div>

                {isLoading ? (
                    <div className="UploadFromMegaBox_loading">
                        <HiArrowPath className="animate-spin" />
                        <p>{t("files.loadingFiles")}</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="UploadFromMegaBox_empty">
                        <p className="UploadFromMegaBox_empty_title">{t("uploadFromMegaBox.noFiles")}</p>
                        <p className="UploadFromMegaBox_empty_desc">{t("uploadFromMegaBox.noFilesDesc")}</p>
                    </div>
                ) : (
                    <>
                        <div className="UploadFromMegaBox_files">
                            {files.map((file) => {
                                const fileId = file._id || file.id;
                                const isSelected = selectedFiles.some(f => (f._id || f.id) === fileId);
                                
                                return (
                                    <div
                                        key={fileId}
                                        className={`UploadFromMegaBox_file ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleFileSelection(file)}
                                    >
                                        <div className="UploadFromMegaBox_file_icon">
                                            {getFileTypeIcon(file.fileType)}
                                        </div>
                                        <div className="UploadFromMegaBox_file_info">
                                            <p className="UploadFromMegaBox_file_name">{file.fileName || file.name}</p>
                                            <p className="UploadFromMegaBox_file_size">{formatFileSize(file.size)}</p>
                                        </div>
                                        {isSelected && (
                                            <HiCheckCircle className="UploadFromMegaBox_file_check" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="UploadFromMegaBox_selected">
                                <div className="UploadFromMegaBox_selected_header">
                                    <p className="UploadFromMegaBox_selected_title">
                                        {t("uploadFromMegaBox.selectedFiles")} ({selectedFiles.length})
                                    </p>
                                    <button
                                        onClick={ClearAllFiles}
                                        className="UploadFromMegaBox_clear"
                                    >
                                        {t("uploadFromMegaBox.clearAll")}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="UploadFromMegaBox_actions">
                            <button
                                type="button"
                                onClick={AddFiles}
                                disabled={selectedFiles.length === 0 || UploadLoading}
                                className="UploadFromMegaBox_upload_btn"
                            >
                                {UploadLoading ? (
                                    <>
                                        <HiArrowPath className='LoadingButton' />
                                        {t("uploadFromMegaBox.uploading")}
                                    </>
                                ) : (
                                    `${t("uploadFromMegaBox.upload")} ${selectedFiles.length > 0 ? selectedFiles.length : ''} ${selectedFiles.length === 1 ? t("uploadFromMegaBox.file") : t("uploadFromMegaBox.files")}`
                                )}
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}

