import React, { useState, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import * as pdfjsLib from 'pdfjs-dist';
import Zoom from 'react-medium-image-zoom';
import { HiX } from "react-icons/hi";
import { HiArrowDownTray } from "react-icons/hi2";
import { FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt } from 'react-icons/fa';
import VideoPlayer from '../VideoPlayer/VideoPlayer';

import './Represents.scss';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Represents({ type, path, ToggleUploadFile, videoData }) {
    console.log('Represents mounted with type:', type, 'path:', path);

    const NeededType = type?.split("/")[1];
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(NeededType);
    const isPdf = type === 'application/pdf' || NeededType === 'pdf' || type?.toLowerCase().includes('pdf');
    const isVideo = ["mp4", "webm", "ogg"].includes(NeededType);
    
    // Document types that can be previewed - check MIME types
    const wordMimeTypes = [
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    const excelMimeTypes = [
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ];
    const powerpointMimeTypes = [
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ];
    const odfMimeTypes = [
        'application/vnd.oasis.opendocument.text', // .odt
        'application/vnd.oasis.opendocument.spreadsheet', // .ods
        'application/vnd.oasis.opendocument.presentation', // .odp
        'application/vnd.oasis.opendocument.graphics', // .odg
        'application/odf' // .odf
    ];
    
    const isWordDoc = wordMimeTypes.includes(type);
    const isExcelDoc = excelMimeTypes.includes(type);
    const isPowerPointDoc = powerpointMimeTypes.includes(type);
    const isOdfDoc = odfMimeTypes.includes(type);
    const isDocument = isWordDoc || isExcelDoc || isPowerPointDoc || isOdfDoc;

    console.log('File type detection:', { isImage, isPdf, isVideo, isDocument, isWordDoc, isExcelDoc, isPowerPointDoc });

    const defaultLayout = defaultLayoutPlugin();
    const [pdfUrl, setPdfUrl] = useState(path);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState(false);
    const blobUrlRef = useRef(null);
    const hasDownloadedRef = useRef(false); // Prevent multiple downloads

    // Helper function to get document icon based on MIME type
    const getDocumentIcon = () => {
        const iconStyle = { width: '128px', height: '128px' };
        if (isWordDoc) return <FaFileWord className='text-blue-600' style={iconStyle} />;
        if (isExcelDoc) return <FaFileExcel className='text-green-600' style={iconStyle} />;
        if (isPowerPointDoc) return <FaFilePowerpoint className='text-orange-600' style={iconStyle} />;
        if (isOdfDoc) return <FaFileAlt className='text-purple-600' style={iconStyle} />;
        return <FaFileAlt className='text-indigo-600' style={iconStyle} />;
    };

    const getDocumentName = () => {
        if (isWordDoc) return 'Word Document';
        if (isExcelDoc) return 'Excel Spreadsheet';
        if (isPowerPointDoc) return 'PowerPoint Presentation';
        if (isOdfDoc) return 'ODF Document';
        return 'Document';
    };

    // Fetch PDF as blob to handle CORS issues
    useEffect(() => {
        console.log('PDF useEffect triggered');
        // Reset error states when path changes
        setPdfError(false);
        
        // Cleanup previous blob URL if it exists
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
        
        if (isPdf && path) {
            setPdfLoading(true);
            setPdfError(false);
            console.log('Fetching PDF...');
            
            // Use a timeout to prevent hanging
            const fetchTimeout = setTimeout(() => {
                console.log('PDF fetch timeout');
                setPdfError(true);
                setPdfLoading(false);
            }, 10000); // 10 second timeout
            
            fetch(path, { mode: 'cors' })
                .then(response => {
                    clearTimeout(fetchTimeout);
                    if (!response.ok) {
                        throw new Error('Failed to fetch PDF');
                    }
                    return response.blob();
                })
                .then(blob => {
                    console.log('PDF blob received');
                    const blobUrl = URL.createObjectURL(blob);
                    blobUrlRef.current = blobUrl;
                    setPdfUrl(blobUrl);
                    setPdfLoading(false);
                    setPdfError(false);
                })
                .catch(error => {
                    clearTimeout(fetchTimeout);
                    console.error('Error fetching PDF:', error);
                    setPdfError(true);
                    setPdfLoading(false);
                });
        } else {
            setPdfUrl(path);
        }

        // Cleanup blob URL on unmount or when path changes
        return () => {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, [isPdf, path]);

    // Download function - only called when user clicks download button
    const downloadCloudinaryFile = (fileUrl, fileName = 'downloaded-file') => {
        if (hasDownloadedRef.current) {
            console.log('Download already in progress, skipping');
            return;
        }
        
        hasDownloadedRef.current = true;
        console.log('Starting download for:', fileUrl);
        
        fetch(fileUrl, {
            mode: 'cors',
        })
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch file');
                return response.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                console.log('Download completed');
                
                // Reset after a delay
                setTimeout(() => {
                    hasDownloadedRef.current = false;
                }, 1000);
            })
            .catch(error => {
                console.error('Download error:', error);
                hasDownloadedRef.current = false;
            });
    };

    const handleDownloadClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('Download button clicked');
        downloadCloudinaryFile(path);
    };

    return (
        <motion.div
            className="Represents_backDrob"
            onClick={ToggleUploadFile}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'linear' }}
        >
            <div 
                className={`viewer-container flex justify-center items-center ${isImage ? 'no-scroll' : ''}`} 
                onClick={(e) => e.stopPropagation()}
            >

                {(isImage || isVideo || isDocument || isPdf) && (
                    <div className="toolbar flex justify-end gap-2 p-2 absolute top-2 right-2 z-10">
                        <button 
                            onClick={handleDownloadClick}
                            className="toolbar-btn flex items-center gap-2"
                            type="button"
                        >
                            <HiArrowDownTray className="h-4 w-4" />
                            Download
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                ToggleUploadFile();
                            }} 
                            className="toolbar-btn flex items-center gap-2"
                            type="button"
                        >
                            <HiX className="h-4 w-4" />
                            Close
                        </button>
                    </div>
                )}

                {isImage ? (
                    <Zoom>
                        <img
                            src={path}
                            alt="file preview"
                            className="max-h-[90vh] object-contain cursor-zoom-in rounded-lg shadow-lg"
                        />
                    </Zoom>
                ) : isPdf ? (
                    <div className="w-full h-[90vh] bg-gray-100 rounded-lg shadow-lg overflow-hidden">
                        {pdfLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Loading PDF...</p>
                                </div>
                            </div>
                        ) : pdfError ? (
                            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-red-50 to-red-100 p-8">
                                <FaFilePdf className='text-red-600 mb-4' style={{ width: '128px', height: '128px' }} />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">PDF Preview Unavailable</h3>
                                <p className="text-gray-600 text-center mb-6 max-w-md">
                                    Unable to preview this PDF file. You can download it to view it on your device.
                                </p>
                                <button
                                    onClick={handleDownloadClick}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    type="button"
                                >
                                    <HiArrowDownTray className="h-5 w-5" />
                                    Download PDF
                                </button>
                            </div>
                        ) : (
                            <div className="w-full h-full">
                                <Worker workerUrl={`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`}>
                                    <Viewer 
                                        fileUrl={pdfUrl} 
                                        plugins={[defaultLayout]}
                                        onLoadError={(error) => {
                                            console.error('PDF viewer error:', error);
                                            setPdfError(true);
                                        }}
                                        renderError={(error) => {
                                            console.error('PDF render error:', error);
                                            return (
                                                <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-red-50 to-red-100 p-8">
                                                    <FaFilePdf className='text-red-600 mb-4' style={{ width: '128px', height: '128px' }} />
                                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">PDF Preview Unavailable</h3>
                                                    <p className="text-gray-600 text-center mb-6 max-w-md">
                                                        Unable to preview this PDF file. You can download it to view it on your device.
                                                    </p>
                                                    <button
                                                        onClick={handleDownloadClick}
                                                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                                        type="button"
                                                    >
                                                        <HiArrowDownTray className="h-5 w-5" />
                                                        Download PDF
                                                    </button>
                                                </div>
                                            );
                                        }}
                                    />
                                </Worker>
                            </div>
                        )}
                    </div>
                ) : isVideo ? (
                    videoData ? (
                        <VideoPlayer
                            videoUrl={path}
                            title={videoData.fileName || videoData.name || 'Video'}
                            fileId={videoData._id || videoData.id}
                            downloads={videoData.downloads || []}
                            readyToStream={videoData.readyToStream !== false}
                            onClose={ToggleUploadFile}
                        />
                    ) : (
                        <video
                            src={path}
                            controls
                            className="max-h-[90vh] w-full rounded-lg shadow-lg"
                            style={{ maxWidth: '100%', backgroundColor: '#000' }}
                        >
                            Your browser does not support the video tag.
                        </video>
                    )
                ) : isDocument ? (
                    <div className="w-full h-[90vh] bg-gray-100 rounded-lg shadow-lg overflow-hidden">
                        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                            <div className="mb-6">
                                {getDocumentIcon()}
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-800 mb-3">{getDocumentName()}</h3>
                            <p className="text-gray-600 text-center mb-8 max-w-md text-lg">
                                Preview is not available for this document. You can download it to view it on your device.
                            </p>
                            <button
                                onClick={handleDownloadClick}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md"
                                type="button"
                            >
                                <HiArrowDownTray className="h-5 w-5" />
                                Download {getDocumentName()}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-600 p-8">
                        <p>File type not supported for preview</p>
                        <p className="text-sm mt-2">Type: {type || 'unknown'}</p>
                        <button 
                            onClick={handleDownloadClick}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            type="button"
                        >
                            Download File
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}


export function PdfPreview({ path, ToggleUploadFile }) {
    const defaultLayout = defaultLayoutPlugin();

    return (
        <motion.div
            className="Represents_backDrob"
            onClick={ToggleUploadFile}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'linear' }}
        >
            <div
                className="viewer-container flex justify-center items-center"
                onClick={(e) => e.stopPropagation()}
            >
                <Worker workerUrl={`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`}>
                    <Viewer fileUrl={path} plugins={[defaultLayout]} />
                </Worker>
            </div>
        </motion.div>
    );
}