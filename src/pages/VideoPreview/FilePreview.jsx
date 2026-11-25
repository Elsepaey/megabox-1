import React from 'react';
import { FaFilePdf, FaFileWord, FaFileAlt, FaFile } from 'react-icons/fa';
import { getFileCategoryByExtension } from '../../helpers/MimeType';
import { FaPlay } from 'react-icons/fa';

export default function FilePreview({ fileType }) {
    const { fileType: type, url } = fileType || {};

    if (getFileCategoryByExtension(type) === 'image') {
        return (
            <div className="FilePreview p-4 flex justify-center items-center">
                <img
                    src={url}
                    alt="file preview"
                    className="max-h-[500px] object-contain rounded shadow-md border"
                />
            </div>
        );
    }


    if (getFileCategoryByExtension(type) === 'video') {
        return (
            <div className="FilePreview p-4 flex justify-center items-center relative">
                <video
                    className="max-h-[500px] rounded shadow-md border pointer-events-none opacity-60"
                    muted
                    preload="metadata"
                    playsInline={false}
                    autoPlay={false}
                >
                    <source src={url} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>

                {/* Overlay Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/60 p-4 rounded-full">
                        <FaPlay className="text-white text-xl" />
                    </div>
                </div>
            </div>
        );
    }



    if (getFileCategoryByExtension(type) === 'document') {
        const extension = (url || fileType?.fileName || fileType?.name || '').split('.').pop()?.toLowerCase();
        let DocIcon = FaFileAlt;
        if (extension?.toLowerCase() === 'pdf') DocIcon = FaFilePdf;
        else if (['doc', 'docx'].includes(extension)) DocIcon = FaFileWord;

        return <>
            <div className="FilePreview p-6 flex justify-center flex-col items-center gap-4 text-center bg-primary-50">
                <DocIcon className="text-6xl text-primary-700" />
                <p className="text-lg font-bold text-primary-900">Document</p>
            </div>
        </>
    }

    return (
        <div className="FilePreview p-6 text-center text-gray-500">
            <FaFile className="text-5xl mx-auto mb-3" />
            <p>Unsupported file type</p>
        </div>
    );
}

