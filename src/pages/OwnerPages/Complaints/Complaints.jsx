import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { MdAdd, MdFeedback } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { moderationAdmin } from '../../../services/admin/moderationAdmin';
import {
    AdminModal,
    AdminPage,
    AdminTable,
    AdminTabs,
    FilterBar,
    ReasonModal,
    StatusBadge,
} from '../_shared/AdminUI';
import { formatDate, shortId } from '../_shared/formatters';
import useAdminList from '../_shared/useAdminList';
import '../Reports/moderation.scss';

const COMPLAINT_STATUS_TONES = {
    pending: 'warning',
    reviewed: 'info',
    resolved: 'success',
};

const VALID_STATUSES = new Set(['pending', 'reviewed', 'resolved']);
const DEFAULT_FILTERS = {
    typeId: '',
    status: '',
    userId: '',
    from: '',
    to: '',
};

function localizedTypeName(type, language) {
    if (!type) return null;
    return language === 'ar' ? type.name_ar || type.name_en : type.name_en || type.name_ar;
}

export default function Complaints() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = searchParams.get('tab') === 'types' ? 'types' : 'queue';

    const setActiveTab = (tab) => {
        const next = new URLSearchParams(searchParams);
        if (tab === 'types') next.set('tab', 'types');
        else next.delete('tab');
        setSearchParams(next, { replace: true });
    };

    const initialFilters = useMemo(() => {
        const statusParam = searchParams.get('status');
        return {
            typeId: searchParams.get('typeId') || '',
            status: VALID_STATUSES.has(statusParam) ? statusParam : '',
            userId: searchParams.get('userId') || '',
            from: searchParams.get('from') || '',
            to: searchParams.get('to') || '',
        };
    }, [searchParams]);

    const typesQuery = useQuery(
        ['staff:complaint-types'],
        () => moderationAdmin.listComplaintTypes(),
        { retry: false, refetchOnWindowFocus: false },
    );

    const complaintTypes = useMemo(() => typesQuery.data?.types ?? [], [typesQuery.data]);

    const typesById = useMemo(() => {
        const map = new Map();
        complaintTypes.forEach((type) => {
            if (type?._id) map.set(String(type._id), type);
        });
        return map;
    }, [complaintTypes]);

    const {
        rows,
        meta,
        setPage,
        filters,
        setFilter,
        resetFilters,
        isLoading,
        error,
        refetch,
    } = useAdminList('staff:complaints', moderationAdmin.listComplaints, {
        initialFilters,
        defaultFilters: DEFAULT_FILTERS,
        limit: 20,
    });

    const handleReset = () => {
        setSearchParams({}, { replace: true });
        resetFilters();
    };

    // Complaint type modal state (create or edit)
    const [typeModal, setTypeModal] = useState(null); // null | { mode: 'create' | 'edit', type?: obj }
    const [nameEn, setNameEn] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [formError, setFormError] = useState('');
    const [retireTarget, setRetireTarget] = useState(null);
    const [reactivatingId, setReactivatingId] = useState(null);

    const openCreateModal = () => {
        setTypeModal({ mode: 'create' });
        setNameEn('');
        setNameAr('');
        setIsActive(true);
        setFormError('');
    };

    const openEditModal = (type) => {
        setTypeModal({ mode: 'edit', type });
        setNameEn(type.name_en || '');
        setNameAr(type.name_ar || '');
        setIsActive(Boolean(type.isActive));
        setFormError('');
    };

    const closeTypeModal = () => {
        setTypeModal(null);
        setFormError('');
    };

    const createTypeMutation = useMutation(
        (payload) =>
            moderationAdmin.createComplaintType(payload, t('staffComplaints.typeCreateFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffComplaints.typeCreated'), ToastOptions('success'));
                closeTypeModal();
                queryClient.invalidateQueries(['staff:complaint-types']);
            },
        },
    );

    const updateTypeMutation = useMutation(
        ({ id, payload }) =>
            moderationAdmin.updateComplaintType(id, payload, t('staffComplaints.typeUpdateFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffComplaints.typeUpdated'), ToastOptions('success'));
                closeTypeModal();
                queryClient.invalidateQueries(['staff:complaint-types']);
            },
        },
    );

    const handleSaveType = (e) => {
        e.preventDefault();
        const trimmedEn = nameEn.trim();
        const trimmedAr = nameAr.trim();
        if (!trimmedEn || !trimmedAr) {
            setFormError(t('staffComplaints.validation.namesRequired'));
            return;
        }
        setFormError('');

        if (typeModal?.mode === 'create') {
            createTypeMutation.mutate({ name_en: trimmedEn, name_ar: trimmedAr });
        } else if (typeModal?.mode === 'edit' && typeModal.type?._id) {
            updateTypeMutation.mutate({
                id: typeModal.type._id,
                payload: {
                    name_en: trimmedEn,
                    name_ar: trimmedAr,
                    isActive: Boolean(isActive),
                },
            });
        }
    };

    const handleConfirmRetire = async () => {
        if (!retireTarget?._id) return;
        await moderationAdmin.retireComplaintType(
            retireTarget._id,
            t('staffComplaints.typeRetireFailed'),
        );
        toast.success(t('staffComplaints.typeRetired'), ToastOptions('success'));
        setRetireTarget(null);
        await queryClient.invalidateQueries(['staff:complaint-types']);
    };

    const handleReactivateType = async (type) => {
        setReactivatingId(type._id);
        try {
            await moderationAdmin.updateComplaintType(
                type._id,
                { isActive: true },
                t('staffComplaints.typeUpdateFailed'),
            );
            toast.success(t('staffComplaints.typeReactivated'), ToastOptions('success'));
            await queryClient.invalidateQueries(['staff:complaint-types']);
        } catch {
            // Error toast handled by adminMutation.
        } finally {
            setReactivatingId(null);
        }
    };

    const savingType = createTypeMutation.isLoading || updateTypeMutation.isLoading;

    const tabs = useMemo(
        () => [
            { key: 'queue', label: t('staffComplaints.tabs.queue') },
            { key: 'types', label: t('staffComplaints.tabs.types') },
        ],
        [t],
    );

    const filterFields = useMemo(
        () => [
            {
                key: 'typeId',
                label: t('staffComplaints.type'),
                type: 'select',
                options: complaintTypes.map((type) => {
                    const label = localizedTypeName(type, language) || shortId(type._id);
                    return {
                        value: String(type._id),
                        label: type.isActive
                            ? label
                            : `${label} (${t('staffComplaints.retiredTag')})`,
                    };
                }),
            },
            {
                key: 'status',
                label: t('staffCommon.status'),
                type: 'select',
                options: [
                    { value: 'pending', label: t('staffComplaints.statuses.pending') },
                    { value: 'reviewed', label: t('staffComplaints.statuses.reviewed') },
                    { value: 'resolved', label: t('staffComplaints.statuses.resolved') },
                ],
            },
            {
                key: 'userId',
                label: t('staffComplaints.userId'),
                type: 'text',
                placeholder: t('staffComplaints.userIdPlaceholder'),
            },
            {
                key: 'from',
                label: t('staffCommon.from'),
                type: 'date',
            },
            {
                key: 'to',
                label: t('staffCommon.to'),
                type: 'date',
            },
        ],
        [complaintTypes, language, t],
    );

    const queueColumns = useMemo(
        () => [
            {
                key: '_id',
                header: t('staffCommon.id'),
                render: (row) => (
                    <span className="moderation-mono" title={row._id}>
                        {shortId(row._id)}
                    </span>
                ),
            },
            {
                key: 'typeId',
                header: t('staffComplaints.type'),
                render: (row) => {
                    const type = row.typeId ? typesById.get(String(row.typeId)) : null;
                    if (!type) {
                        return (
                            <span className="moderation-mono" title={row.typeId}>
                                {shortId(row.typeId)}
                            </span>
                        );
                    }
                    return (
                        <span className="moderation-inline-meta">
                            <span>{localizedTypeName(type, language)}</span>
                            {!type.isActive && (
                                <StatusBadge tone="neutral">
                                    {t('staffComplaints.retiredTag')}
                                </StatusBadge>
                            )}
                        </span>
                    );
                },
            },
            {
                key: 'status',
                header: t('staffCommon.status'),
                render: (row) => (
                    <StatusBadge tone={COMPLAINT_STATUS_TONES[row.status] || 'neutral'}>
                        {t(`staffComplaints.statuses.${row.status}`)}
                    </StatusBadge>
                ),
            },
            {
                key: 'userId',
                header: t('staffComplaints.submitter'),
                render: (row) =>
                    row.userId ? (
                        <Link
                            to={`/Owner/Users/${row.userId}`}
                            className="moderation-link moderation-mono"
                            title={row.userId}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {shortId(row.userId)}
                        </Link>
                    ) : (
                        '—'
                    ),
            },
            {
                key: 'createdAt',
                header: t('staffCommon.createdAt'),
                render: (row) => formatDate(row.createdAt, language),
            },
            {
                key: 'reviewedAt',
                header: t('staffComplaints.reviewedAt'),
                render: (row) => formatDate(row.reviewedAt, language),
            },
            {
                key: 'actions',
                header: t('staffCommon.actions'),
                render: (row) => (
                    <Link
                        to={`/Owner/Complaints/${row._id}`}
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {t('staffCommon.view')}
                    </Link>
                ),
            },
        ],
        [t, language, typesById],
    );

    const typeColumns = useMemo(
        () => [
            {
                key: 'name_en',
                header: t('staffComplaints.nameEn'),
            },
            {
                key: 'name_ar',
                header: t('staffComplaints.nameAr'),
            },
            {
                key: 'isActive',
                header: t('staffCommon.status'),
                render: (row) => (
                    <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
                        {row.isActive
                            ? t('staffComplaints.activeStatus')
                            : t('staffComplaints.retiredStatus')}
                    </StatusBadge>
                ),
            },
            {
                key: 'createdAt',
                header: t('staffCommon.createdAt'),
                render: (row) => formatDate(row.createdAt, language),
            },
            {
                key: 'actions',
                header: t('staffCommon.actions'),
                render: (row) => (
                    <div className="moderation-actions-row">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                            onClick={() => openEditModal(row)}
                        >
                            {t('staffCommon.edit')}
                        </button>
                        {row.isActive ? (
                            <button
                                type="button"
                                className="admin-btn admin-btn--danger admin-btn--sm"
                                onClick={() => setRetireTarget(row)}
                            >
                                {t('staffComplaints.retire')}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="admin-btn admin-btn--primary admin-btn--sm"
                                disabled={reactivatingId === row._id}
                                onClick={() => handleReactivateType(row)}
                            >
                                {reactivatingId === row._id
                                    ? t('staffCommon.saving')
                                    : t('staffComplaints.reactivate')}
                            </button>
                        )}
                    </div>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [t, language, reactivatingId],
    );

    return (
        <AdminPage
            icon={MdFeedback}
            title={t('staffComplaints.title')}
            subtitle={t('staffComplaints.subtitle')}
            actions={
                activeTab === 'types' && (
                    <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        onClick={openCreateModal}
                    >
                        <MdAdd size={18} />
                        {t('staffComplaints.createType')}
                    </button>
                )
            }
        >
            <AdminTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

            {activeTab === 'queue' ? (
                <>
                    <FilterBar
                        fields={filterFields}
                        values={filters}
                        onChange={setFilter}
                        onReset={handleReset}
                    />
                    <AdminTable
                        title={t('staffComplaints.queueTitle')}
                        columns={queueColumns}
                        rows={rows}
                        loading={isLoading}
                        error={error}
                        onRetry={refetch}
                        emptyMessage={t('staffComplaints.empty')}
                        onRowClick={(row) => navigate(`/Owner/Complaints/${row._id}`)}
                        meta={meta}
                        onPageChange={setPage}
                    />
                </>
            ) : (
                <AdminTable
                    title={t('staffComplaints.typesTitle')}
                    columns={typeColumns}
                    rows={complaintTypes}
                    loading={typesQuery.isLoading}
                    error={typesQuery.error}
                    onRetry={typesQuery.refetch}
                    emptyMessage={t('staffComplaints.typesEmpty')}
                    toolbar={
                        <button
                            type="button"
                            className="admin-btn admin-btn--primary admin-btn--sm"
                            onClick={openCreateModal}
                        >
                            <MdAdd size={16} />
                            {t('staffComplaints.createType')}
                        </button>
                    }
                />
            )}

            <AdminModal
                open={Boolean(typeModal)}
                title={
                    typeModal?.mode === 'edit'
                        ? t('staffComplaints.editType')
                        : t('staffComplaints.createTypeTitle')
                }
                onClose={savingType ? undefined : closeTypeModal}
            >
                <form onSubmit={handleSaveType} className="admin-form">
                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffComplaints.nameEn')} *</span>
                        <input
                            type="text"
                            className="admin-input"
                            value={nameEn}
                            onChange={(e) => setNameEn(e.target.value)}
                            placeholder={t('staffComplaints.nameEnPlaceholder')}
                            required
                        />
                    </label>
                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffComplaints.nameAr')} *</span>
                        <input
                            type="text"
                            dir="rtl"
                            className="admin-input"
                            value={nameAr}
                            onChange={(e) => setNameAr(e.target.value)}
                            placeholder={t('staffComplaints.nameArPlaceholder')}
                            required
                        />
                    </label>
                    {typeModal?.mode === 'edit' && (
                        <label className="admin-field admin-field--checkbox">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                            />
                            <span>{t('staffComplaints.isActive')}</span>
                        </label>
                    )}
                    {formError && <span className="admin-field__error">{formError}</span>}
                    <div className="admin-modal__footer">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={closeTypeModal}
                            disabled={savingType}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={savingType || !nameEn.trim() || !nameAr.trim()}
                        >
                            {savingType ? t('staffCommon.saving') : t('staffCommon.save')}
                        </button>
                    </div>
                </form>
            </AdminModal>

            <ReasonModal
                open={Boolean(retireTarget)}
                title={t('staffComplaints.retireModalTitle')}
                description={t('staffComplaints.retireModalDescription', {
                    name: localizedTypeName(retireTarget, language) || '',
                })}
                confirmLabel={t('staffComplaints.retire')}
                tone="danger"
                hideReason
                onConfirm={handleConfirmRetire}
                onClose={() => setRetireTarget(null)}
            />
        </AdminPage>
    );
}
