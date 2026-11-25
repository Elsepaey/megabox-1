import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { MdAddPhotoAlternate, MdCollections, MdDelete, MdEdit } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import { catalogsAdmin } from '../../../services/admin/catalogsAdmin';
import {
    AdminModal,
    AdminPage,
    AdminTable,
    AdminTabs,
    FilterBar,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate } from '../_shared/formatters';
import './AdminCatalogs.scss';

export default function AdminCatalogs() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('avatars');

    // Upload modal state
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadName, setUploadName] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreviewUrl, setUploadPreviewUrl] = useState('');
    const [uploadError, setUploadError] = useState('');

    // Edit modal state
    const [editingItem, setEditingItem] = useState(null);
    const [editName, setEditName] = useState('');
    const [editActive, setEditActive] = useState(true);
    const [editError, setEditError] = useState('');

    // Delete modal state
    const [deletingItem, setDeletingItem] = useState(null);
    const [deleteConflict, setDeleteConflict] = useState(false);

    useEffect(() => {
        if (!uploadFile) {
            setUploadPreviewUrl('');
            return undefined;
        }
        const objectUrl = URL.createObjectURL(uploadFile);
        setUploadPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [uploadFile]);

    const avatarsList = useAdminList(
        'staff:catalog-avatars',
        catalogsAdmin.listAvatars,
        { initialFilters: { name: '', isActive: '' }, enabled: activeTab === 'avatars' },
    );

    const iconsList = useAdminList(
        'staff:catalog-icons',
        catalogsAdmin.listChannelIcons,
        { initialFilters: { name: '', isActive: '' }, enabled: activeTab === 'icons' },
    );

    const currentList = activeTab === 'avatars' ? avatarsList : iconsList;
    const currentQueryKey = activeTab === 'avatars' ? 'staff:catalog-avatars' : 'staff:catalog-icons';

    const uploadMutation = useMutation(
        (formData) =>
            activeTab === 'avatars'
                ? catalogsAdmin.uploadAvatar(formData, t('staffCatalogs.uploadFailed'))
                : catalogsAdmin.uploadChannelIcon(formData, t('staffCatalogs.uploadFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffCatalogs.uploadSuccess'), ToastOptions('success'));
                setUploadOpen(false);
                setUploadName('');
                setUploadFile(null);
                setUploadError('');
                queryClient.invalidateQueries(currentQueryKey);
            },
        },
    );

    const updateMutation = useMutation(
        ({ id, payload }) =>
            activeTab === 'avatars'
                ? catalogsAdmin.updateAvatar(id, payload, t('staffCatalogs.updateFailed'))
                : catalogsAdmin.updateChannelIcon(id, payload, t('staffCatalogs.updateFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffCatalogs.updateSuccess'), ToastOptions('success'));
                setEditingItem(null);
                setDeletingItem(null);
                setDeleteConflict(false);
                queryClient.invalidateQueries(currentQueryKey);
            },
        },
    );

    const deleteMutation = useMutation(
        (id) =>
            activeTab === 'avatars'
                ? catalogsAdmin.deleteAvatar(id, t('staffCatalogs.deleteFailed'))
                : catalogsAdmin.deleteChannelIcon(id, t('staffCatalogs.deleteFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffCatalogs.deleteSuccess'), ToastOptions('success'));
                setDeletingItem(null);
                setDeleteConflict(false);
                queryClient.invalidateQueries(currentQueryKey);
            },
            onError: (error) => {
                if (apiErrorStatus(error) === 409) {
                    setDeleteConflict(true);
                }
            },
        },
    );

    const openUploadModal = () => {
        setUploadName('');
        setUploadFile(null);
        setUploadError('');
        setUploadOpen(true);
    };

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        const trimmed = uploadName.trim();
        if (!trimmed || trimmed.length > 100) {
            setUploadError(t('staffCatalogs.validationName'));
            return;
        }
        if (!uploadFile) {
            setUploadError(t('staffCatalogs.validationImage'));
            return;
        }
        setUploadError('');
        const formData = new FormData();
        formData.append('name', trimmed);
        formData.append('image', uploadFile);
        uploadMutation.mutate(formData);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setEditName(item.name || '');
        setEditActive(Boolean(item.isActive));
        setEditError('');
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const trimmed = editName.trim();
        if (!trimmed || trimmed.length > 100) {
            setEditError(t('staffCatalogs.validationName'));
            return;
        }
        setEditError('');
        updateMutation.mutate({
            id: editingItem._id,
            payload: { name: trimmed, isActive: editActive },
        });
    };

    const handleToggleActive = (item) => {
        updateMutation.mutate({
            id: item._id,
            payload: { isActive: !item.isActive },
        });
    };

    const openDeleteModal = (item) => {
        setDeletingItem(item);
        setDeleteConflict(false);
    };

    const filterFields = [
        {
            key: 'name',
            label: t('staffCatalogs.filterName'),
            type: 'text',
            placeholder: t('staffCatalogs.filterNamePlaceholder'),
        },
        {
            key: 'isActive',
            label: t('staffCatalogs.filterActive'),
            type: 'select',
            options: [
                { value: 'true', label: t('staffCatalogs.active') },
                { value: 'false', label: t('staffCatalogs.retired') },
            ],
        },
    ];

    const columns = [
        {
            key: 'image',
            header: t('staffCatalogs.colPreview'),
            render: (row) =>
                row.image?.secure_url ? (
                    <img
                        src={row.image.secure_url}
                        alt={row.name || ''}
                        className="admin-catalogs__thumb"
                    />
                ) : (
                    '—'
                ),
        },
        { key: 'name', header: t('staffCatalogs.colName') },
        {
            key: 'isActive',
            header: t('staffCatalogs.colStatus'),
            render: (row) => (
                <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive ? t('staffCatalogs.active') : t('staffCatalogs.retired')}
                </StatusBadge>
            ),
        },
        {
            key: 'createdAt',
            header: t('staffCatalogs.colCreated'),
            render: (row) => formatDate(row.createdAt, language),
        },
        {
            key: 'actions',
            header: t('staffCommon.actions'),
            render: (row) => (
                <div className="admin-card__actions">
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => openEditModal(row)}
                    >
                        <MdEdit size={15} />
                        {t('staffCatalogs.rename')}
                    </button>
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        disabled={updateMutation.isLoading}
                        onClick={() => handleToggleActive(row)}
                    >
                        {row.isActive ? t('staffCatalogs.retire') : t('staffCatalogs.activate')}
                    </button>
                    <button
                        type="button"
                        className="admin-btn admin-btn--danger admin-btn--sm"
                        onClick={() => openDeleteModal(row)}
                    >
                        <MdDelete size={15} />
                        {t('staffCommon.delete')}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminPage
            icon={MdCollections}
            title={t('staffCatalogs.title')}
            subtitle={t('staffCatalogs.subtitle')}
            actions={(
                <button type="button" className="admin-btn admin-btn--primary" onClick={openUploadModal}>
                    <MdAddPhotoAlternate size={18} />
                    {activeTab === 'avatars'
                        ? t('staffCatalogs.uploadAvatar')
                        : t('staffCatalogs.uploadIcon')}
                </button>
            )}
        >
            <AdminTabs
                active={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { key: 'avatars', label: t('staffCatalogs.tabAvatars') },
                    { key: 'icons', label: t('staffCatalogs.tabChannelIcons') },
                ]}
            />

            <FilterBar
                fields={filterFields}
                values={currentList.filters}
                onChange={currentList.setFilter}
                onReset={currentList.resetFilters}
            />

            <AdminTable
                title={
                    activeTab === 'avatars'
                        ? t('staffCatalogs.tabAvatars')
                        : t('staffCatalogs.tabChannelIcons')
                }
                columns={columns}
                rows={currentList.rows}
                loading={currentList.isLoading}
                error={currentList.error}
                onRetry={currentList.refetch}
                meta={currentList.meta}
                onPageChange={currentList.setPage}
            />

            <AdminModal
                open={uploadOpen}
                title={
                    activeTab === 'avatars'
                        ? t('staffCatalogs.uploadAvatar')
                        : t('staffCatalogs.uploadIcon')
                }
                onClose={uploadMutation.isLoading ? undefined : () => setUploadOpen(false)}
            >
                <form className="admin-form" onSubmit={handleUploadSubmit}>
                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffCatalogs.nameLabel')} *</span>
                        <input
                            type="text"
                            className="admin-input"
                            maxLength={100}
                            value={uploadName}
                            onChange={(e) => setUploadName(e.target.value)}
                            placeholder={t('staffCatalogs.namePlaceholder')}
                        />
                    </label>

                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffCatalogs.imageLabel')} *</span>
                        <input
                            type="file"
                            className="admin-input"
                            accept="image/*"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                        <span className="admin-field__hint">{t('staffCatalogs.imageHint')}</span>
                    </label>

                    {uploadPreviewUrl && (
                        <div className="admin-catalogs__preview-box">
                            <img
                                src={uploadPreviewUrl}
                                alt={uploadName || ''}
                                className="admin-catalogs__preview-img"
                            />
                        </div>
                    )}

                    {uploadError && <p className="admin-field__error">{uploadError}</p>}

                    <div className="admin-modal__footer">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => setUploadOpen(false)}
                            disabled={uploadMutation.isLoading}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={uploadMutation.isLoading}
                        >
                            {uploadMutation.isLoading ? t('staffCommon.saving') : t('staffCommon.create')}
                        </button>
                    </div>
                </form>
            </AdminModal>

            <AdminModal
                open={Boolean(editingItem)}
                title={t('staffCatalogs.editItem')}
                onClose={updateMutation.isLoading ? undefined : () => setEditingItem(null)}
            >
                <form className="admin-form" onSubmit={handleEditSubmit}>
                    {editingItem?.image?.secure_url && (
                        <div className="admin-catalogs__preview-box">
                            <img
                                src={editingItem.image.secure_url}
                                alt={editingItem.name || ''}
                                className="admin-catalogs__preview-img"
                            />
                        </div>
                    )}

                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffCatalogs.nameLabel')} *</span>
                        <input
                            type="text"
                            className="admin-input"
                            maxLength={100}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                        />
                    </label>

                    <label className="admin-field admin-field--checkbox">
                        <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                        />
                        <span>{t('staffCatalogs.isActiveLabel')}</span>
                    </label>

                    {editError && <p className="admin-field__error">{editError}</p>}

                    <div className="admin-modal__footer">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => setEditingItem(null)}
                            disabled={updateMutation.isLoading}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={updateMutation.isLoading}
                        >
                            {updateMutation.isLoading ? t('staffCommon.saving') : t('staffCommon.save')}
                        </button>
                    </div>
                </form>
            </AdminModal>

            <AdminModal
                open={Boolean(deletingItem)}
                title={t('staffCatalogs.deleteConfirmTitle')}
                onClose={deleteMutation.isLoading || updateMutation.isLoading ? undefined : () => setDeletingItem(null)}
                footer={(
                    <>
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => setDeletingItem(null)}
                            disabled={deleteMutation.isLoading || updateMutation.isLoading}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        {deleteConflict && deletingItem?.isActive && (
                            <button
                                type="button"
                                className="admin-btn admin-btn--primary"
                                disabled={updateMutation.isLoading}
                                onClick={() =>
                                    updateMutation.mutate({
                                        id: deletingItem._id,
                                        payload: { isActive: false },
                                    })
                                }
                            >
                                {updateMutation.isLoading ? t('staffCommon.saving') : t('staffCatalogs.retire')}
                            </button>
                        )}
                        <button
                            type="button"
                            className="admin-btn admin-btn--danger"
                            disabled={deleteMutation.isLoading || updateMutation.isLoading}
                            onClick={() => deleteMutation.mutate(deletingItem._id)}
                        >
                            {deleteMutation.isLoading ? t('staffCommon.saving') : t('staffCommon.delete')}
                        </button>
                    </>
                )}
            >
                <div className="admin-form">
                    <p className="admin-modal__description">
                        {deletingItem
                            ? t('staffCatalogs.deleteConfirmDesc', { name: deletingItem.name })
                            : ''}
                    </p>
                    {deleteConflict && (
                        <div className="admin-catalogs__conflict-box">
                            {t('staffCatalogs.deleteAssignedConflict')}
                        </div>
                    )}
                </div>
            </AdminModal>
        </AdminPage>
    );
}
