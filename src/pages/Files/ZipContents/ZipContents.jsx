import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { useQuery } from 'react-query';
import { fileService } from '../../../services/api';
import { HiArrowLeft } from 'react-icons/hi2';
import { useLanguage } from '../../../context/LanguageContext';
import { toast } from 'react-toastify';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { LuFileArchive, LuFolder, LuFile } from 'react-icons/lu';

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** idx)).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function TreeNode({ node, depth = 0 }) {
    const [expanded, setExpanded] = useState(depth < 1);
    const hasChildren = node.isDirectory && Array.isArray(node.children) && node.children.length > 0;

    return (
        <div>
            <div
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                style={{ paddingLeft: `${depth * 20 + 12}px` }}
                onClick={() => hasChildren && setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {node.isDirectory ? (
                        <LuFolder className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    ) : (
                        <LuFile className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-indigo-900 truncate">{node.name}</span>
                </div>
                {!node.isDirectory && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-4">
                        {formatBytes(node.size)}
                    </span>
                )}
            </div>
            {hasChildren && expanded && (
                <div>
                    {node.children.map((child) => (
                        <TreeNode key={child.path} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ZipContents() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const { zipId, zipName } = useParams();
    const [Token] = useCookies(['MegaBox']);
    const [extracting, setExtracting] = useState(false);

    const getFilesRoute = () => {
        if (location.pathname.includes('/Promoter')) {
            return '/Promoter/files';
        } else if (location.pathname.includes('/Owner')) {
            return '/Owner/files';
        }
        return '/dashboard/files';
    };

    const { data: preview, isLoading, error } = useQuery(
        ['zipPreview', zipId],
        () => fileService.previewZip(zipId, Token.MegaBox),
        {
            enabled: !!zipId && !!Token.MegaBox,
            retry: false,
        }
    );

    const handleExtract = async () => {
        if (!zipId || !Token.MegaBox) return;
        setExtracting(true);
        try {
            const res = await fileService.extractZip(zipId, Token.MegaBox);
            toast.success(res?.message || t("filesV2.extractStarted") || "Extraction started", ToastOptions("success"));
        } catch {
            // Error toast handled in fileService.extractZip
        } finally {
            setExtracting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
                <div className="text-indigo-600 text-lg">{t("files.loadingZipContents")}</div>
            </div>
        );
    }

    const tree = Array.isArray(preview?.tree) ? preview.tree : [];

    return (
        <div className="min-h-screen bg-indigo-50" style={{ fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate(getFilesRoute())}
                            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 transition-colors"
                        >
                            <HiArrowLeft className="w-5 h-5" />
                            <span className="font-medium">{t("files.back")}</span>
                        </button>

                        <div className="flex items-center gap-3">
                            <LuFileArchive className="w-8 h-8 text-amber-600" />
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">
                                    {decodeURIComponent(zipName || preview?.fileName || t("files.zipFolders"))}
                                </h1>
                                {preview && (
                                    <p className="text-sm text-indigo-600 mt-1">
                                        {preview.totalEntries ?? 0} {t("files.itemsCount") || "items"} · {formatBytes(preview.fileSize)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {preview && (
                        <button
                            onClick={handleExtract}
                            disabled={extracting}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {extracting
                                ? (t("common.loading") || "Loading...")
                                : (t("filesV2.extractZip") || "Extract Archive")}
                        </button>
                    )}
                </div>

                {error ? (
                    <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
                        <p className="text-red-600">{error?.message || t("files.failedToLoadZip")}</p>
                    </div>
                ) : tree.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-4 divide-y divide-indigo-50">
                        {tree.map((node) => (
                            <TreeNode key={node.path} node={node} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-indigo-200">
                        <LuFileArchive className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                        <p className="text-indigo-600 text-lg">{t("files.emptyZip")}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
