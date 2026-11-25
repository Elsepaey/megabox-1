import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { MdGavel, MdPublish, MdVisibility } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import { legalAdmin } from '../../../services/admin/legalAdmin';
import {
    AdminModal,
    AdminPage,
    AdminTable,
    AdminTabs,
    ErrorState,
    LoadingState,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate } from '../_shared/formatters';
import PolicySectionsEditor from './PolicySectionsEditor';
import PolicySectionsViewer from './PolicySectionsViewer';
import {
    createEmptySection,
    normalizeSectionsForEditor,
    validateAndBuildPolicyPayload,
} from './validatePolicySections';
import './AdminLegal.scss';

const DOC_CONFIGS = {
    terms: {
        queryKey: 'staff:legal-terms',
        latestKey: 'staff:legal-terms-latest',
        detailKey: 'staff:legal-terms-version',
        list: legalAdmin.listTerms,
        getVersion: legalAdmin.getTermsVersion,
        publish: legalAdmin.publishTerms,
        labelKey: 'staffLegal.tabTerms',
    },
    privacy: {
        queryKey: 'staff:legal-privacy',
        latestKey: 'staff:legal-privacy-latest',
        detailKey: 'staff:legal-privacy-version',
        list: legalAdmin.listPrivacyPolicies,
        getVersion: legalAdmin.getPrivacyPolicyVersion,
        publish: legalAdmin.publishPrivacyPolicy,
        labelKey: 'staffLegal.tabPrivacy',
    },
    promoter: {
        queryKey: 'staff:legal-promoter-privacy',
        latestKey: 'staff:legal-promoter-privacy-latest',
        detailKey: 'staff:legal-promoter-privacy-version',
        list: legalAdmin.listPromoterPrivacyPolicies,
        getVersion: legalAdmin.getPromoterPrivacyPolicyVersion,
        publish: legalAdmin.publishPromoterPrivacyPolicy,
        labelKey: 'staffLegal.tabPromoterPrivacy',
    },
};

export default function AdminLegal() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('terms');
    const [viewingVersion, setViewingVersion] = useState(null);

    // Publish modal state
    const [publishOpen, setPublishOpen] = useState(false);
    const [editorSections, setEditorSections] = useState([createEmptySection()]);
    const [prefillLoading, setPrefillLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);

    const termsList = useAdminList(DOC_CONFIGS.terms.queryKey, DOC_CONFIGS.terms.list, {
        enabled: activeTab === 'terms',
    });
    const privacyList = useAdminList(DOC_CONFIGS.privacy.queryKey, DOC_CONFIGS.privacy.list, {
        enabled: activeTab === 'privacy',
    });
    const promoterList = useAdminList(DOC_CONFIGS.promoter.queryKey, DOC_CONFIGS.promoter.list, {
        enabled: activeTab === 'promoter',
    });

    const currentConfig = DOC_CONFIGS[activeTab];
    const currentList = useMemo(() => {
        if (activeTab === 'privacy') return privacyList;
        if (activeTab === 'promoter') return promoterList;
        return termsList;
    }, [activeTab, termsList, privacyList, promoterList]);

    const latestQuery = useQuery(
        [currentConfig.latestKey],
        () => currentConfig.list({ page: 1, limit: 1 }),
        {
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const latestVersion =
        latestQuery.data?.data?.[0]?.version ??
        (currentList.page === 1
            ? (currentList.rows.find((r) => r.isActive)?.version ?? currentList.rows[0]?.version ?? null)
            : null);
    const docLabel = t(currentConfig.labelKey);

    const viewQuery = useQuery(
        [currentConfig.detailKey, viewingVersion],
        () => currentConfig.getVersion(viewingVersion),
        {
            enabled: viewingVersion !== null,
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const publishMutation = useMutation(
        (payload) => currentConfig.publish(payload, t('staffLegal.publishFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffLegal.publishSuccess', { doc: docLabel }), ToastOptions('success'));
                setPublishOpen(false);
                setValidationErrors([]);
                queryClient.invalidateQueries(currentConfig.queryKey);
                queryClient.invalidateQueries(currentConfig.latestKey);
                queryClient.invalidateQueries(currentConfig.detailKey);
            },
            onError: (error) => {
                if (apiErrorStatus(error) === 409) {
                    toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
                    queryClient.invalidateQueries(currentConfig.queryKey);
                    queryClient.invalidateQueries(currentConfig.latestKey);
                    queryClient.invalidateQueries(currentConfig.detailKey);
                }
            },
        },
    );

    const loadLatestIntoEditor = async (versionToLoad) => {
        setPrefillLoading(true);
        try {
            let targetVersion = versionToLoad;
            if (!targetVersion) {
                const pageOne = await currentConfig.list({ page: 1, limit: 1 });
                targetVersion = pageOne?.data?.[0]?.version ?? null;
            }
            if (!targetVersion) {
                setEditorSections([createEmptySection()]);
                return;
            }
            const detail = await currentConfig.getVersion(targetVersion);
            setEditorSections(normalizeSectionsForEditor(detail?.sections));
            toast.info(t('staffLegal.prefillLoaded', { version: targetVersion }), ToastOptions('info'));
        } catch {
            setEditorSections([createEmptySection()]);
        } finally {
            setPrefillLoading(false);
        }
    };

    const openPublishModal = () => {
        setValidationErrors([]);
        setPublishOpen(true);
        loadLatestIntoEditor(latestVersion);
    };

    const handlePublishSubmit = (e) => {
        e.preventDefault();
        const { errors, payload } = validateAndBuildPolicyPayload(editorSections, t);
        if (errors.length > 0 || !payload) {
            setValidationErrors(errors);
            return;
        }
        setValidationErrors([]);
        publishMutation.mutate(payload);
    };

    const columns = [
        {
            key: 'version',
            header: t('staffLegal.colVersion'),
            render: (row) => `v${row.version}`,
        },
        {
            key: 'isActive',
            header: t('staffLegal.colActive'),
            render: (row) => (
                <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive ? t('staffLegal.active') : t('staffLegal.archived')}
                </StatusBadge>
            ),
        },
        {
            key: 'publishedAt',
            header: t('staffLegal.colPublishedAt'),
            render: (row) => formatDate(row.publishedAt, language),
        },
        {
            key: 'actions',
            header: t('staffCommon.actions'),
            render: (row) => (
                <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => setViewingVersion(row.version)}
                >
                    <MdVisibility size={15} />
                    {t('staffLegal.viewVersion')}
                </button>
            ),
        },
    ];

    return (
        <AdminPage
            icon={MdGavel}
            title={t('staffLegal.title')}
            subtitle={t('staffLegal.subtitle')}
            actions={(
                <button type="button" className="admin-btn admin-btn--primary" onClick={openPublishModal}>
                    <MdPublish size={18} />
                    {t('staffLegal.publishNew')}
                </button>
            )}
        >
            <AdminTabs
                active={activeTab}
                onChange={(tab) => {
                    setActiveTab(tab);
                    setViewingVersion(null);
                }}
                tabs={[
                    { key: 'terms', label: t('staffLegal.tabTerms') },
                    { key: 'privacy', label: t('staffLegal.tabPrivacy') },
                    { key: 'promoter', label: t('staffLegal.tabPromoterPrivacy') },
                ]}
            />

            <AdminTable
                title={`${docLabel} — ${t('staffLegal.historyTitle')}`}
                columns={columns}
                rows={currentList.rows}
                rowKey="version"
                loading={currentList.isLoading}
                error={currentList.error}
                onRetry={currentList.refetch}
                meta={currentList.meta}
                onPageChange={currentList.setPage}
            />

            <AdminModal
                open={viewingVersion !== null}
                title={t('staffLegal.viewTitle', { doc: docLabel, version: viewingVersion })}
                onClose={() => setViewingVersion(null)}
                size="lg"
                footer={(
                    <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        onClick={() => setViewingVersion(null)}
                    >
                        {t('staffCommon.close')}
                    </button>
                )}
            >
                {viewQuery.isLoading ? (
                    <LoadingState />
                ) : viewQuery.error ? (
                    <ErrorState error={viewQuery.error} onRetry={viewQuery.refetch} />
                ) : (
                    <PolicySectionsViewer sections={viewQuery.data?.sections} />
                )}
            </AdminModal>

            <AdminModal
                open={publishOpen}
                title={t('staffLegal.publishTitle', { doc: docLabel })}
                onClose={publishMutation.isLoading ? undefined : () => setPublishOpen(false)}
                size="lg"
            >
                {prefillLoading ? (
                    <LoadingState />
                ) : (
                    <form className="admin-form" onSubmit={handlePublishSubmit}>
                        <div className="admin-card__actions">
                            {latestVersion && (
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--secondary admin-btn--sm"
                                    onClick={() => loadLatestIntoEditor(latestVersion)}
                                >
                                    {t('staffLegal.prefillFromLatest', { version: latestVersion })}
                                </button>
                            )}
                            <button
                                type="button"
                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                onClick={() => {
                                    setEditorSections([createEmptySection()]);
                                    setValidationErrors([]);
                                }}
                            >
                                {t('staffLegal.prefillEmpty')}
                            </button>
                        </div>

                        <PolicySectionsEditor
                            sections={editorSections}
                            onChange={setEditorSections}
                        />

                        {validationErrors.length > 0 && (
                            <div className="admin-legal__error-box">
                                <strong>{t('staffLegal.validationErrorsTitle')}</strong>
                                <ul>
                                    {validationErrors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="admin-modal__footer">
                            <button
                                type="button"
                                className="admin-btn admin-btn--secondary"
                                onClick={() => setPublishOpen(false)}
                                disabled={publishMutation.isLoading}
                            >
                                {t('staffCommon.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="admin-btn admin-btn--primary"
                                disabled={publishMutation.isLoading}
                            >
                                <MdPublish size={18} />
                                {publishMutation.isLoading
                                    ? t('staffCommon.saving')
                                    : t('staffLegal.publishConfirm')}
                            </button>
                        </div>
                    </form>
                )}
            </AdminModal>
        </AdminPage>
    );
}
