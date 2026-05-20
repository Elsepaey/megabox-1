import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { FiX, FiDownload, FiSettings } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { pollVideoStatus } from '../../services/itemsService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

/**
 * ProcessingOverlay - Shows video processing status
 */
function ProcessingOverlay({ status, processingPercent }) {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-black bg-opacity-90 rounded-lg p-8">
            <AiOutlineLoading3Quarters className="w-16 h-16 text-indigo-500 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
                {t("files.videoProcessing")}
            </h3>
            <p className="text-gray-300 text-center mb-4">
                {t("files.videoProcessingDesc")}
            </p>
            {processingPercent !== null && (
                <div className="w-full max-w-md">
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${processingPercent}%` }}
                        />
                    </div>
                    <p className="text-center text-gray-400 text-sm">{processingPercent}% complete</p>
                </div>
            )}
            {status && (
                <p className="text-gray-400 text-sm mt-4">
                    Status: {status.state || 'processing'}
                </p>
            )}
        </div>
    );
}

/**
 * QualitySelector - Dropdown for selecting video quality
 */
function QualitySelector({ options, selected, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useLanguage();

    if (!options || options.length === 0) {
        return null;
    }

    const selectedOption = selected || options[0];

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 bg-opacity-80 text-white rounded-lg hover:bg-opacity-100 transition-all"
            >
                <FiSettings className="w-4 h-4" />
                <span>{selectedOption?.quality || selectedOption?.label || 'Quality'}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="py-1">
                            <div className="px-4 py-2 text-gray-400 text-xs font-semibold uppercase">
                                {t("files.selectQuality")}
                            </div>
                            {options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                                        selectedOption === option ? 'bg-gray-700 text-indigo-400' : 'text-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{option?.quality || option?.label}</span>
                                        {option?.height && (
                                            <span className="text-gray-400 text-sm">{option.height}p</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * VideoPlayer - Advanced video player with HLS support
 *
 * @param {Object} props
 * @param {string} props.videoUrl - HLS stream URL
 * @param {string} props.title - Video title
 * @param {string} props.fileId - File ID for status polling
 * @param {Array} props.downloads - Quality options from file details
 * @param {boolean} props.readyToStream - Whether video is ready to play
 * @param {Function} props.onClose - Close handler
 */
function VideoPlayer({
    videoUrl,
    title = 'Video',
    fileId,
    downloads = [],
    readyToStream = true,
    onClose,
}) {
    const [selectedQuality, setSelectedQuality] = useState(null);
    const [processingStatus, setProcessingStatus] = useState(null);
    const [processingPercent, setProcessingPercent] = useState(null);
    const [isReady, setIsReady] = useState(readyToStream);
    const { token } = useAuth();
    const { t } = useLanguage();

    // Poll for processing status if not ready
    useEffect(() => {
        if (!isReady && fileId && token) {
            const stopPolling = pollVideoStatus(token, fileId, (status) => {
                setProcessingStatus(status?.status || null);

                // Extract processing percentage if available
                if (status?.status?.progress) {
                    setProcessingPercent(Math.round(status.status.progress));
                }

                // Check if ready
                if (status?.readyToStream || status?.status?.state === 'ready') {
                    setIsReady(true);
                }
            });

            return () => {
                if (stopPolling) stopPolling();
            };
        }
    }, [isReady, fileId, token]);

    // Initialize quality selector
    useEffect(() => {
        if (downloads && downloads.length > 0 && !selectedQuality) {
            // Default to highest quality or first option
            const defaultQuality = downloads.find(d => d.quality === 'auto') || downloads[0];
            setSelectedQuality(defaultQuality);
        }
    }, [downloads, selectedQuality]);

    // Show processing overlay if video not ready
    if (!isReady) {
        return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4">
                <div className="relative w-full max-w-6xl">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-gray-800 bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all text-white"
                    >
                        <FiX className="w-6 h-6" />
                    </button>
                    <ProcessingOverlay status={processingStatus} processingPercent={processingPercent} />
                </div>
            </div>
        );
    }

    const currentVideoUrl = selectedQuality?.url || videoUrl;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4">
            <div className="relative w-full max-w-6xl">
                {/* Header with title and controls */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black to-transparent">
                    <h2 className="text-white text-lg font-semibold truncate flex-1 mr-4">
                        {title}
                    </h2>
                    <div className="flex items-center gap-2">
                        {downloads && downloads.length > 1 && (
                            <QualitySelector
                                options={downloads}
                                selected={selectedQuality}
                                onChange={setSelectedQuality}
                            />
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-800 bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all text-white"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Video player */}
                <div className="relative" style={{ paddingTop: '56.25%' }}>
                    <div className="absolute inset-0">
                        <ReactPlayer
                            url={currentVideoUrl}
                            controls
                            playing
                            width="100%"
                            height="100%"
                            config={{
                                file: {
                                    forceHLS: true,
                                    attributes: {
                                        controlsList: 'nodownload',
                                        crossOrigin: 'anonymous',
                                    },
                                    hlsOptions: {
                                        enableWorker: true,
                                        lowLatencyMode: false,
                                        backBufferLength: 90,
                                    },
                                },
                            }}
                            onError={(error) => {
                                console.error('Video player error:', error);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VideoPlayer;
