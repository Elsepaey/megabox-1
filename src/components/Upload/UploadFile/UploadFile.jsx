import React, { useRef, useState } from 'react'
import '../Upload.scss'
import { HiX } from "react-icons/hi";
import { PreventFunction } from '../../../helpers/Prevent';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { LuFolderOpen } from "react-icons/lu";
import { toast } from 'react-toastify';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { useCookies } from 'react-cookie';
import { fileService } from '../../../services/api';
import { uploadOrchestrator } from '../../../services/uploadOrchestrator';
import { HiArrowPath } from "react-icons/hi2";
import { HiTrash } from "react-icons/hi2";
import { HiCheckCircle } from "react-icons/hi2";
import { HiPlay, HiPause } from "react-icons/hi2";
import { useLanguage } from '../../../context/LanguageContext';

export default function UploadFile({ ToggleUploadFile, refetch, insideFile, id, isChannel }) {
    const { t } = useLanguage();
    const Active = "inline-block p-4 cursor-pointer text-white bg-white/30 backdrop-blur-sm border-2 border-white/40 rounded shadow-lg transition-all";
    const InActive = "inline-block p-4 rounded cursor-pointer text-white/80 hover:text-white hover:bg-white/20 hover:border-white/30 border-2 border-white/20 transition-all"

    const [FileType, setFileType] = useState("All");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [uploadDetails, setUploadDetails] = useState({});
    const [UploadLoading, setUploadLoading] = useState(false);

    const SelectFileType = (Type) => setFileType(Type);

    const [Token] = useCookies(['MegaBox']);

    const acceptedMimeTypes = {
        All: '*',
        Image: 'image/*',
        Video: 'video/*',
        Document: '.pdf',
        Zip: '.zip,.rar,.7z'
    };

    const getFileTypeIcon = (file) => {
        if (file.type.startsWith('image/')) return '🖼️';
        if (file.type.startsWith('video/')) return '🎥';
        if (file.type === 'application/pdf') return '📄';
        if (file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z')) return '📦';
        return '📎';
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const HandleUserFile = (event) => {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) return;

        // Add new files to existing ones
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            files.forEach(file => {
                // Check if file already exists (by name and size)
                const exists = newFiles.some(f => f.name === file.name && f.size === file.size);
                if (!exists) {
                    newFiles.push(file);
                }
            });
            return newFiles;
        });

        // Reset input to allow selecting same files again
        event.target.value = '';
    }

    const RemoveFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        // Also remove from upload progress
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[index];
            return newProgress;
        });
    }

    const ClearAllFiles = () => {
        setSelectedFiles([]);
        setUploadProgress({});
        setUploadDetails({});
        if (ref.current) {
            ref.current.value = '';
        }
    }

    const pauseUpload = (index) => {
        const detail = uploadDetails[index];
        if (!detail?.fileId) return;

        uploadOrchestrator.pauseUpload(detail.fileId, { isVideo: detail.isVideo });
        setUploadDetails(prev => ({
            ...prev,
            [index]: { ...prev[index], paused: true }
        }));
    };

    const resumeUpload = async (index) => {
        const file = selectedFiles[index];
        const detail = uploadDetails[index];
        if (!detail?.fileId) return;

        setUploadDetails(prev => ({
            ...prev,
            [index]: { ...prev[index], paused: false }
        }));

        try {
            const uploadOpts = {
                onProgress: (sent, total) => {
                    const progress = Math.round((sent / total) * 100);
                    setUploadDetails(prev => ({
                        ...prev,
                        [index]: { ...prev[index], progress, bytesUploaded: sent, totalBytes: total }
                    }));
                },
                onVideoDetected: (isVideo, fileId) => {
                    setUploadDetails(prev => ({
                        ...prev,
                        [index]: { ...prev[index], isVideo, fileId }
                    }));
                },
                onInit: (initData) => {
                    setUploadDetails(prev => ({
                        ...prev,
                        [index]: {
                            ...prev[index],
                            isVideo: initData.isVideo,
                            fileId: initData.fileId
                        }
                    }));
                }
            };

            if (isChannel && id) uploadOpts.channelId = id;
            else if (insideFile) uploadOpts.folderId = id;

            const data = await fileService.uploadFile(file, Token.MegaBox, uploadOpts);

            if (data === true) {
                setUploadProgress(prev => ({ ...prev, [index]: 'success' }));
                setUploadDetails(prev => ({ ...prev, [index]: { ...prev[index], progress: 100 } }));
            } else {
                setUploadProgress(prev => ({ ...prev, [index]: 'error' }));
            }
        } catch {
            setUploadProgress(prev => ({ ...prev, [index]: 'error' }));
        }
    };

    const cancelUpload = (index) => {
        const detail = uploadDetails[index];
        if (!detail?.fileId) return;

        uploadOrchestrator.cancelUpload(detail.fileId, { isVideo: detail.isVideo });
        RemoveFile(index);
    };

    const AddFiles = async () => {
        if (selectedFiles.length === 0) {
            toast.error(t('uploadFromMegaBox.selectFiles') || "Please select at least one file.", ToastOptions("error"));
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

                const uploadOpts = {
                    onProgress: (sent, total) => {
                        const progress = Math.round((sent / total) * 100);
                        setUploadDetails(prev => ({
                            ...prev,
                            [i]: { ...prev[i], progress, bytesUploaded: sent, totalBytes: total }
                        }));
                    },
                    onVideoDetected: (isVideo, fileId) => {
                        setUploadDetails(prev => ({
                            ...prev,
                            [i]: { ...prev[i], isVideo, fileId }
                        }));
                    },
                    onInit: (initData) => {
                        setUploadDetails(prev => ({
                            ...prev,
                            [i]: {
                                progress: 0,
                                paused: false,
                                isVideo: initData.isVideo,
                                fileId: initData.fileId,
                                bytesUploaded: 0,
                                totalBytes: file.size
                            }
                        }));
                    }
                };

                if (isChannel && id) uploadOpts.channelId = id;
                else if (insideFile) uploadOpts.folderId = id;

                const data = await fileService.uploadFile(file, Token.MegaBox, uploadOpts);

                if (data === true) {
                    setUploadProgress(prev => ({ ...prev, [i]: 'success' }));
                    setUploadDetails(prev => ({ ...prev, [i]: { ...prev[i], progress: 100 } }));
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
            const fileText = successCount === 1 ? t('uploadFromMegaBox.file') : t('uploadFromMegaBox.files');
            toast.success(`${successCount} ${fileText} ${t('uploadFromMegaBox.uploaded')}`, ToastOptions("success"));
            await refetch();
            setTimeout(() => {
                ToggleUploadFile();
            }, 1000);
        } else if (successCount > 0 && failCount > 0) {
            const fileText = successCount === 1 ? t('uploadFromMegaBox.file') : t('uploadFromMegaBox.files');
            const failedText = failCount === 1 ? t('uploadFromMegaBox.file') : t('uploadFromMegaBox.files');
            toast.warning(`${successCount} ${fileText} ${t('uploadFromMegaBox.uploaded')}, ${failCount} ${failedText} ${t('uploadFromMegaBox.failed')}`, ToastOptions("warning"));
            await refetch();
        } else {
            toast.error(t('uploadFromMegaBox.allFailed') || "All file uploads failed", ToastOptions("error"));
        }
    }

    const ref = useRef();


    return <motion.div className='UploadFile_backDrob' onClick={ToggleUploadFile} initial={{ opacity: 0 }}
        animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: 'linear' }} exit={{ opacity: 0 }} >

        <motion.div 
            className="UploadFile relative p-6 bg-gradient-to-br from-indigo-400 to-indigo-500"
            style={{ fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}
            onClick={PreventFunction} 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 20, opacity: 0 }} 
            transition={{ duration: 0.4, type: 'spring' }}
        >

            <HiX 
                className='Close !text-indigo-100 hover:!text-white transition-all duration-200 hover:scale-110 cursor-pointer' 
                onClick={ToggleUploadFile}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(255,255,255,0.3))', color: 'rgb(224, 231, 255) !important' }}
            />

            <div className="mb-4">
                <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(255,255,255,0.3)' }}>{t('uploadOptions.title') || 'Upload Files'}</h2>
                <p className="text-sm text-white/90" style={{ textShadow: '0 1px 5px rgba(255,255,255,0.2)' }}>{t('uploadOptions.subtitle') || 'Choose how you want to upload your files'}</p>
            </div>

            <ul className="flex flex-wrap mt-3 text-sm font-medium text-center">
                <li className="me-2" onClick={() => SelectFileType("All")}>
                    <p className={FileType === "All" ? Active : InActive}>{t('files.allFiles') || 'All Files'}</p>
                </li>
                <li className="me-2" onClick={() => SelectFileType("Image")}>
                    <p className={FileType === "Image" ? Active : InActive}>{t('files.image') || 'Image'}</p>
                </li>
                <li className="me-2" onClick={() => SelectFileType("Video")}>
                    <p className={FileType === "Video" ? Active : InActive}>{t('files.video') || 'Video'}</p>
                </li>
                <li className="me-2" onClick={() => SelectFileType("Document")}>
                    <p className={FileType === "Document" ? Active : InActive}>{t('files.document') || 'Document'}</p>
                </li>
                <li className="me-2" onClick={() => SelectFileType("Zip")}>
                    <p className={FileType === "Zip" ? Active : InActive}>{t('files.zip') || 'Zip Folder'}</p>
                </li>
            </ul>

            <div className="rounded-lg overflow-hidden w-full mt-4">

                <div className="md:flex">
                    <div className="w-full p-3 cursor-pointer">
                        <div className="relative border-solid w-full h-48 rounded-lg border-2 border-white/40 bg-white/10 backdrop-blur-sm flex justify-center items-center transition-all hover:border-white/60 hover:bg-white/15">

                            <div className="absolute">
                                <div className="flex flex-col items-center">
                                    <LuFolderOpen className="text-4xl text-white drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.3))' }} />
                                    <span className="block text-white/90 font-normal mt-2 drop-shadow-md text-center" style={{ textShadow: '0 1px 5px rgba(255,255,255,0.2)' }}>
                                        {t('uploadFromMegaBox.clickToSelect') || t('uploadFromMegaBox.selectFiles') || 'Click to select files'}<br />
                                        <span className="text-xs text-white/70">({t('uploadFromMegaBox.multipleFiles') || 'You can select multiple files'})</span>
                                    </span>
                                </div>
                            </div>

                            <input
                                type="file"
                                onChange={HandleUserFile}
                                className="h-full w-full opacity-0 cursor-pointer"
                                name="file"
                                accept={FileType ? acceptedMimeTypes[FileType] : '*'}
                                multiple
                                ref={ref}
                            />
                        </div>
                    </div>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-white font-medium drop-shadow-md" style={{ textShadow: '0 1px 5px rgba(255,255,255,0.2)' }}>
                                {selectedFiles.length} {selectedFiles.length === 1 ? t('uploadFromMegaBox.file') : t('uploadFromMegaBox.files')} {t('uploadFromMegaBox.selectedFiles') || 'selected'}
                            </p>
                            <button
                                onClick={ClearAllFiles}
                                className="text-white/80 hover:text-white text-sm underline transition-colors"
                            >
                                {t('uploadFromMegaBox.clearAll') || 'Clear All'}
                            </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="p-3 text-sm text-white relative rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-xl">{getFileTypeIcon(file)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate drop-shadow-md" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.2)' }}>
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-white/70">
                                                {formatFileSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {uploadProgress[index] === 'uploading' && (
                                            <>
                                                <div className="flex-1 min-w-[120px]">
                                                    <div className="bg-white/20 rounded-full h-2 mb-1">
                                                        <div
                                                            className="bg-white h-2 rounded-full transition-all"
                                                            style={{ width: `${uploadDetails[index]?.progress || 0}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-xs text-white/70">
                                                        <span>{uploadDetails[index]?.progress || 0}%</span>
                                                        <span>
                                                            {formatFileSize(uploadDetails[index]?.bytesUploaded || 0)} /
                                                            {formatFileSize(uploadDetails[index]?.totalBytes || file.size)}
                                                        </span>
                                                    </div>
                                                    {uploadDetails[index]?.isVideo && (
                                                        <span className="text-xs text-white/60">TUS</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => uploadDetails[index]?.paused ? resumeUpload(index) : pauseUpload(index)}
                                                    className="text-white hover:text-white/80"
                                                >
                                                    {uploadDetails[index]?.paused ? <HiPlay className="h-5 w-5" /> : <HiPause className="h-5 w-5" />}
                                                </button>
                                                <button
                                                    onClick={() => cancelUpload(index)}
                                                    className="text-white/80 hover:text-red-300"
                                                >
                                                    <HiX className="h-5 w-5" />
                                                </button>
                                            </>
                                        )}
                                        {uploadProgress[index] === 'success' && (
                                            <HiCheckCircle className='h-5 w-5 text-green-300' />
                                        )}
                                        {uploadProgress[index] === 'error' && (
                                            <span className="text-red-300 text-xs">{t('uploadFromMegaBox.failed') || 'Failed'}</span>
                                        )}
                                        {!uploadProgress[index] && (
                                            <HiTrash
                                                className='h-5 w-5 text-white cursor-pointer hover:text-white/80 transition-colors'
                                                onClick={() => RemoveFile(index)}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="w-full flex justify-center items-center mt-4">
                    <button
                        type="button"
                        onClick={AddFiles}
                        disabled={selectedFiles.length === 0 || UploadLoading}
                        className="w-[300px] bg-white/20 backdrop-blur-sm border-2 border-white/40 text-white h-[40px] rounded-md hover:bg-white/30 hover:border-white/60 transition-all flex justify-center items-center font-semibold drop-shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ textShadow: '0 2px 8px rgba(255,255,255,0.3)' }}
                    >
                        {UploadLoading ? (
                            <>
                                <HiArrowPath className='LoadingButton mr-2' />
                                {t('uploadFromMegaBox.uploading') || 'Uploading...'}
                            </>
                        ) : (
                            `${t('uploadFromMegaBox.upload') || 'Upload'} ${selectedFiles.length > 0 ? selectedFiles.length : ''} ${selectedFiles.length === 1 ? t('uploadFromMegaBox.file') : t('uploadFromMegaBox.files')}`
                        )}
                    </button>
                </div>

            </div>





        </motion.div>
    </motion.div>
}
