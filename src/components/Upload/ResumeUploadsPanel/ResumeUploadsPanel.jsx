import { useState, useEffect } from 'react';
import { HiArrowPath } from 'react-icons/hi2';
import { useLanguage } from '../../../context/LanguageContext';
import { fileService } from '../../../services/api';

export default function ResumeUploadsPanel({ token, onComplete }) {
    const { t } = useLanguage();
    const [pending, setPending] = useState([]);

    useEffect(() => {
        // Check localStorage for pending uploads
        const chunkedStr = localStorage.getItem('megabox.pendingChunkedUploads');
        const tusStr = localStorage.getItem('megabox.pendingTusUploads');

        const chunked = chunkedStr ? JSON.parse(chunkedStr) : [];
        const tus = tusStr ? JSON.parse(tusStr) : [];

        setPending([
            ...chunked.map(u => ({ ...u, type: 'chunked' })),
            ...tus.map(u => ({ ...u, type: 'tus' }))
        ]);
    }, []);

    const handleResume = (upload) => {
        // User must select file again (browsers can't persist File objects)
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async (e) => {
            const file = e.target.files[0];

            // Validate file size matches
            if (file.size !== upload.totalBytes) {
                alert(t('upload.fileSizeMismatch') || 'File size mismatch. Please select the original file.');
                return;
            }

            // Resume upload via fileService
            const opts = {
                folderId: upload.folderId,
                channelId: upload.channelId,
                onProgress: (sent, total) => {
                    console.log(`Resume progress: ${sent}/${total}`);
                }
            };

            await fileService.uploadFile(file, token, opts);
            onComplete();
        };
        input.click();
    };

    const handleDismiss = (upload) => {
        // Remove from pending lists
        if (upload.type === 'chunked') {
            const chunkedStr = localStorage.getItem('megabox.pendingChunkedUploads');
            const list = chunkedStr ? JSON.parse(chunkedStr) : [];
            const filtered = list.filter(u => u.fileId !== upload.fileId);
            localStorage.setItem('megabox.pendingChunkedUploads', JSON.stringify(filtered));
        } else {
            const tusStr = localStorage.getItem('megabox.pendingTusUploads');
            const list = tusStr ? JSON.parse(tusStr) : [];
            const filtered = list.filter(u => u.fileId !== upload.fileId);
            localStorage.setItem('megabox.pendingTusUploads', JSON.stringify(filtered));
        }
        setPending(pending.filter(u => u.fileId !== upload.fileId));
    };

    if (pending.length === 0) return null;

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
            <div className="flex">
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                        {t('upload.resumePending') || 'Resume Pending Uploads'}
                    </h3>
                    <div className="mt-2 space-y-2">
                        {pending.map(u => (
                            <div key={u.fileId} className="flex items-center justify-between bg-white/50 p-2 rounded">
                                <div>
                                    <span className="text-sm font-medium">{u.fileName}</span>
                                    <span className="text-xs text-gray-600 ml-2">
                                        {Math.round((u.uploadedBytes / u.totalBytes) * 100)}% ({u.type === 'tus' ? 'TUS' : 'R2'})
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleResume(u)}
                                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <HiArrowPath className="h-4 w-4" />
                                        {t('upload.resume') || 'Resume'}
                                    </button>
                                    <button
                                        onClick={() => handleDismiss(u)}
                                        className="text-sm text-gray-600 hover:text-gray-800"
                                    >
                                        {t('upload.dismiss') || 'Dismiss'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
