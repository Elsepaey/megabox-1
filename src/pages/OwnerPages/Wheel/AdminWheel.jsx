import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { MdAdd, MdCasino, MdDelete, MdEdit } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import { apiErrorStatus } from '../../../services/admin/adminApi';
import { wheelAdmin } from '../../../services/admin/wheelAdmin';
import {
    AdminModal,
    AdminPage,
    AdminTable,
    AdminTabs,
    FilterBar,
    ReasonModal,
    StatTile,
    StatusBadge,
} from '../_shared/AdminUI';
import useAdminList from '../_shared/useAdminList';
import { formatDate, formatNumber, shortId } from '../_shared/formatters';

const CARD_TYPES = ['premium', 'no_ads', 'free_storage', 'no_prize'];
const MAX_ACTIVE_CARDS = 7;

const EMPTY_CARD_FORM = {
    type: 'premium',
    label_en: '',
    label_ar: '',
    weight: '10',
    durationDays: '7',
    storageMb: '1024',
    isActive: true,
};

function isTimedType(type) {
    return type === 'premium' || type === 'no_ads';
}

export default function AdminWheel() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('cards');
    const [cardModalOpen, setCardModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [form, setForm] = useState(EMPTY_CARD_FORM);
    const [formError, setFormError] = useState('');
    const [deletingCard, setDeletingCard] = useState(null);

    const cardsQuery = useQuery(
        'staff:wheel-cards',
        wheelAdmin.listCards,
        { retry: false, refetchOnWindowFocus: false },
    );

    const spins = useAdminList(
        'staff:wheel-spins',
        wheelAdmin.listSpins,
        {
            initialFilters: { userId: '', cardId: '', prizeType: '', from: '', to: '' },
            enabled: activeTab === 'spins',
        },
    );

    const cards = useMemo(() => cardsQuery.data?.cards ?? [], [cardsQuery.data]);
    const activeCount = useMemo(() => cards.filter((c) => c.isActive).length, [cards]);

    const handleConflictReload = (error) => {
        if (apiErrorStatus(error) === 409) {
            toast.info(t('staffCommon.conflictReload'), ToastOptions('info'));
            queryClient.invalidateQueries('staff:wheel-cards');
        }
    };

    const createMutation = useMutation(
        (payload) => wheelAdmin.createCard(payload, t('staffWheel.saveFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffWheel.cardCreated'), ToastOptions('success'));
                setCardModalOpen(false);
                queryClient.invalidateQueries('staff:wheel-cards');
            },
            onError: handleConflictReload,
        },
    );

    const updateMutation = useMutation(
        ({ id, payload }) => wheelAdmin.updateCard(id, payload, t('staffWheel.saveFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffWheel.cardUpdated'), ToastOptions('success'));
                setCardModalOpen(false);
                setEditingCard(null);
                queryClient.invalidateQueries('staff:wheel-cards');
            },
            onError: handleConflictReload,
        },
    );

    const deleteMutation = useMutation(
        (id) => wheelAdmin.deleteCard(id, t('staffWheel.deleteFailed')),
        {
            onSuccess: () => {
                toast.success(t('staffWheel.cardDeleted'), ToastOptions('success'));
                setDeletingCard(null);
                queryClient.invalidateQueries('staff:wheel-cards');
            },
            onError: handleConflictReload,
        },
    );

    const openCreateModal = () => {
        setEditingCard(null);
        setForm({
            ...EMPTY_CARD_FORM,
            isActive: activeCount < MAX_ACTIVE_CARDS,
        });
        setFormError('');
        setCardModalOpen(true);
    };

    const openEditModal = (card) => {
        setEditingCard(card);
        setForm({
            type: card.type || 'premium',
            label_en: card.label_en || '',
            label_ar: card.label_ar || '',
            weight: String(card.weight ?? 10),
            durationDays: card.durationDays !== undefined && card.durationDays !== null ? String(card.durationDays) : '7',
            storageMb: card.storageMb !== undefined && card.storageMb !== null ? String(card.storageMb) : '1024',
            isActive: Boolean(card.isActive),
        });
        setFormError('');
        setCardModalOpen(true);
    };

    const validateAndBuildPayload = () => {
        const labelEn = form.label_en.trim();
        const labelAr = form.label_ar.trim();
        const weight = Number(form.weight);

        if (!labelEn) {
            setFormError(t('staffWheel.validationLabelEn'));
            return null;
        }
        if (!labelAr) {
            setFormError(t('staffWheel.validationLabelAr'));
            return null;
        }
        if (!Number.isFinite(weight) || weight < 1 || weight > 100) {
            setFormError(t('staffWheel.validationWeight'));
            return null;
        }

        const payload = {
            type: form.type,
            label_en: labelEn,
            label_ar: labelAr,
            weight,
            isActive: Boolean(form.isActive),
        };

        if (isTimedType(form.type)) {
            const days = Number(form.durationDays);
            if (!Number.isSafeInteger(days) || days < 1 || days > 36500) {
                setFormError(t('staffWheel.validationDuration'));
                return null;
            }
            payload.durationDays = days;
        } else if (form.type === 'free_storage') {
            const mb = Number(form.storageMb);
            if (!Number.isFinite(mb) || mb < 1 || mb > Number.MAX_SAFE_INTEGER) {
                setFormError(t('staffWheel.validationStorage'));
                return null;
            }
            payload.storageMb = mb;
        }

        setFormError('');
        return payload;
    };

    const handleCardSubmit = (e) => {
        e.preventDefault();
        const payload = validateAndBuildPayload();
        if (!payload) return;
        if (editingCard) {
            updateMutation.mutate({ id: editingCard._id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const renderRewardValue = (row) => {
        if (isTimedType(row.type)) {
            return t('staffWheel.daysValue', { days: formatNumber(row.durationDays, language) });
        }
        if (row.type === 'free_storage') {
            return t('staffWheel.storageValue', { mb: formatNumber(row.storageMb, language) });
        }
        return t('staffWheel.noPrizeValue');
    };

    const cardColumns = [
        { key: 'label_en', header: t('staffWheel.colLabelEn') },
        { key: 'label_ar', header: t('staffWheel.colLabelAr') },
        {
            key: 'type',
            header: t('staffWheel.colType'),
            render: (row) => t(`staffWheel.types.${row.type}`) || row.type,
        },
        {
            key: 'reward',
            header: t('staffWheel.colReward'),
            render: renderRewardValue,
        },
        {
            key: 'weight',
            header: t('staffWheel.colWeight'),
            render: (row) => formatNumber(row.weight, language),
        },
        {
            key: 'isActive',
            header: t('staffWheel.colActive'),
            render: (row) => (
                <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive ? t('staffWheel.active') : t('staffWheel.inactive')}
                </StatusBadge>
            ),
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
                        {t('staffCommon.edit')}
                    </button>
                    <button
                        type="button"
                        className="admin-btn admin-btn--danger admin-btn--sm"
                        onClick={() => setDeletingCard(row)}
                    >
                        <MdDelete size={15} />
                        {t('staffCommon.delete')}
                    </button>
                </div>
            ),
        },
    ];

    const spinFilterFields = [
        { key: 'userId', label: t('staffWheel.filterUserId'), type: 'text' },
        { key: 'cardId', label: t('staffWheel.filterCardId'), type: 'text' },
        {
            key: 'prizeType',
            label: t('staffWheel.filterPrizeType'),
            type: 'select',
            options: CARD_TYPES.map((ct) => ({
                value: ct,
                label: t(`staffWheel.types.${ct}`),
            })),
        },
        { key: 'from', label: t('staffCommon.from'), type: 'date' },
        { key: 'to', label: t('staffCommon.to'), type: 'date' },
    ];

    const spinColumns = [
        {
            key: 'createdAt',
            header: t('staffWheel.colSpunAt'),
            render: (row) => formatDate(row.createdAt, language),
        },
        {
            key: 'userId',
            header: t('staffWheel.colUser'),
            render: (row) =>
                row.userId ? (
                    <Link to={`/Owner/Users/${row.userId}`}>{shortId(row.userId)}</Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'cardId',
            header: t('staffWheel.colCard'),
            render: (row) => shortId(row.cardId),
        },
        {
            key: 'prizeType',
            header: t('staffWheel.colType'),
            render: (row) => t(`staffWheel.types.${row.prizeType}`) || row.prizeType,
        },
        {
            key: 'prizeValue',
            header: t('staffWheel.colPrizeValue'),
            render: (row) =>
                row.prizeValue !== null && row.prizeValue !== undefined
                    ? formatNumber(row.prizeValue, language)
                    : '—',
        },
    ];

    const savingCard = createMutation.isLoading || updateMutation.isLoading;
    const activatingBlocked =
        form.isActive &&
        activeCount >= MAX_ACTIVE_CARDS &&
        !(editingCard && editingCard.isActive);

    return (
        <AdminPage
            icon={MdCasino}
            title={t('staffWheel.title')}
            subtitle={t('staffWheel.subtitle')}
            actions={
                activeTab === 'cards' ? (
                    <button type="button" className="admin-btn admin-btn--primary" onClick={openCreateModal}>
                        <MdAdd size={18} />
                        {t('staffWheel.createCard')}
                    </button>
                ) : null
            }
        >
            <AdminTabs
                active={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { key: 'cards', label: t('staffWheel.tabCards') },
                    { key: 'spins', label: t('staffWheel.tabSpins') },
                ]}
            />

            {activeTab === 'cards' ? (
                <>
                    <div className="admin-stat-grid" style={{ marginBottom: '1.25rem' }}>
                        <StatTile
                            label={t('staffWheel.tabCards')}
                            value={`${activeCount} / ${MAX_ACTIVE_CARDS}`}
                            hint={
                                activeCount >= MAX_ACTIVE_CARDS
                                    ? t('staffWheel.activeLimitReached')
                                    : t('staffWheel.activeCounter', { active: activeCount, max: MAX_ACTIVE_CARDS })
                            }
                        />
                    </div>

                    <AdminTable
                        title={t('staffWheel.tabCards')}
                        columns={cardColumns}
                        rows={cards}
                        loading={cardsQuery.isLoading}
                        error={cardsQuery.error}
                        onRetry={cardsQuery.refetch}
                    />
                </>
            ) : (
                <>
                    <FilterBar
                        fields={spinFilterFields}
                        values={spins.filters}
                        onChange={spins.setFilter}
                        onReset={spins.resetFilters}
                    />
                    <AdminTable
                        title={t('staffWheel.spinsTitle')}
                        columns={spinColumns}
                        rows={spins.rows}
                        loading={spins.isLoading}
                        error={spins.error}
                        onRetry={spins.refetch}
                        meta={spins.meta}
                        onPageChange={spins.setPage}
                    />
                </>
            )}

            <AdminModal
                open={cardModalOpen}
                title={editingCard ? t('staffWheel.editCard') : t('staffWheel.createCard')}
                onClose={savingCard ? undefined : () => setCardModalOpen(false)}
            >
                <form className="admin-form" onSubmit={handleCardSubmit}>
                    <label className="admin-field">
                        <span className="admin-field__label">{t('staffWheel.fieldType')}</span>
                        <select
                            className="admin-input"
                            value={form.type}
                            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                        >
                            {CARD_TYPES.map((ct) => (
                                <option key={ct} value={ct}>
                                    {t(`staffWheel.types.${ct}`)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffWheel.fieldLabelEn')} *</span>
                            <input
                                type="text"
                                className="admin-input"
                                value={form.label_en}
                                onChange={(e) => setForm((prev) => ({ ...prev, label_en: e.target.value }))}
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffWheel.fieldLabelAr')} *</span>
                            <input
                                type="text"
                                className="admin-input"
                                dir="rtl"
                                value={form.label_ar}
                                onChange={(e) => setForm((prev) => ({ ...prev, label_ar: e.target.value }))}
                            />
                        </label>
                    </div>

                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffWheel.fieldWeight')} *</span>
                            <input
                                type="number"
                                className="admin-input"
                                min={1}
                                max={100}
                                step="any"
                                value={form.weight}
                                onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                            />
                        </label>

                        {isTimedType(form.type) && (
                            <label className="admin-field">
                                <span className="admin-field__label">{t('staffWheel.fieldDurationDays')} *</span>
                                <input
                                    type="number"
                                    className="admin-input"
                                    min={1}
                                    max={36500}
                                    step={1}
                                    value={form.durationDays}
                                    onChange={(e) => setForm((prev) => ({ ...prev, durationDays: e.target.value }))}
                                />
                            </label>
                        )}

                        {form.type === 'free_storage' && (
                            <label className="admin-field">
                                <span className="admin-field__label">{t('staffWheel.fieldStorageMb')} *</span>
                                <input
                                    type="number"
                                    className="admin-input"
                                    min={1}
                                    step="any"
                                    value={form.storageMb}
                                    onChange={(e) => setForm((prev) => ({ ...prev, storageMb: e.target.value }))}
                                />
                            </label>
                        )}
                    </div>

                    <label className="admin-field admin-field--checkbox">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                        />
                        <span>{t('staffWheel.fieldIsActive')}</span>
                    </label>

                    {activatingBlocked && (
                        <p className="admin-field__error">{t('staffWheel.activeLimitReached')}</p>
                    )}
                    {formError && <p className="admin-field__error">{formError}</p>}

                    <div className="admin-modal__footer">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => setCardModalOpen(false)}
                            disabled={savingCard}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={savingCard || activatingBlocked}
                        >
                            {savingCard ? t('staffCommon.saving') : t('staffCommon.save')}
                        </button>
                    </div>
                </form>
            </AdminModal>

            <ReasonModal
                open={Boolean(deletingCard)}
                title={t('staffWheel.deleteConfirmTitle')}
                description={
                    deletingCard
                        ? t('staffWheel.deleteConfirmDesc', {
                            label: language === 'ar' ? deletingCard.label_ar : deletingCard.label_en,
                        })
                        : ''
                }
                confirmLabel={t('staffCommon.delete')}
                tone="danger"
                hideReason
                onClose={() => setDeletingCard(null)}
                onConfirm={() => deleteMutation.mutateAsync(deletingCard._id)}
            />
        </AdminPage>
    );
}
