import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { FaCrown, FaPlus, FaTimes } from 'react-icons/fa';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import financeAdmin from '../../../services/admin/financeAdmin';
import { apiErrorMessage, apiErrorStatus } from '../../../services/admin/adminApi';
import {
    AdminModal,
    AdminPage,
    AdminTable,
    ReasonModal,
    StatusBadge,
} from '../_shared/AdminUI';
import { formatMb, formatNumber } from '../_shared/formatters';

const TYPE_TONE = {
    free: 'neutral',
    monthly: 'info',
    yearly: 'success',
    lifetime: 'warning',
};

function emptyForm() {
    return {
        name: '',
        type: 'monthly',
        price: '',
        old_price: '',
        offer: '',
        days: '30',
        storage_limit_mb: '',
        is_active: true,
        features: [],
    };
}

function formFromPlan(plan) {
    return {
        name: plan.name ?? '',
        type: plan.type ?? 'monthly',
        price: plan.price !== undefined && plan.price !== null ? String(plan.price) : '',
        old_price:
            plan.old_price !== undefined && plan.old_price !== null
                ? String(plan.old_price)
                : '',
        offer: plan.offer ?? '',
        days: plan.days !== undefined && plan.days !== null ? String(plan.days) : '',
        storage_limit_mb:
            plan.storage_limit_mb !== undefined && plan.storage_limit_mb !== null
                ? String(plan.storage_limit_mb)
                : '',
        is_active: Boolean(plan.is_active),
        features: Array.isArray(plan.features) ? [...plan.features] : [],
    };
}

export default function Plans() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [editorState, setEditorState] = useState(null); // null | { mode: 'create' | 'edit', plan?: object }
    const [form, setForm] = useState(emptyForm);
    const [featureDraft, setFeatureDraft] = useState('');
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [retireTarget, setRetireTarget] = useState(null);

    const plansQuery = useQuery(['staff:plans'], financeAdmin.listPlans, {
        retry: false,
        refetchOnWindowFocus: false,
    });

    const plans = plansQuery.data?.plans ?? [];

    const typeLabel = (type) => {
        const map = {
            free: t('staffPlans.typeFree'),
            monthly: t('staffPlans.typeMonthly'),
            yearly: t('staffPlans.typeYearly'),
            lifetime: t('staffPlans.typeLifetime'),
        };
        return map[type] || type || '—';
    };

    const openCreate = () => {
        setForm(emptyForm());
        setFeatureDraft('');
        setFormError(null);
        setEditorState({ mode: 'create' });
    };

    const openEdit = (plan) => {
        setForm(formFromPlan(plan));
        setFeatureDraft('');
        setFormError(null);
        setEditorState({ mode: 'edit', plan });
    };

    const closeEditor = () => {
        if (submitting) return;
        setEditorState(null);
        setFormError(null);
    };

    const addFeature = () => {
        const trimmed = featureDraft.trim();
        if (!trimmed) return;
        setForm((prev) => ({ ...prev, features: [...prev.features, trimmed] }));
        setFeatureDraft('');
    };

    const removeFeature = (index) => {
        setForm((prev) => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index),
        }));
    };

    const handleSave = async (event) => {
        event.preventDefault();
        const name = form.name.trim();
        if (name.length < 1 || name.length > 100) {
            setFormError(t('staffPlans.validationName'));
            return;
        }
        const price = Number(form.price);
        if (form.price === '' || Number.isNaN(price) || price < 0) {
            setFormError(t('staffPlans.validationPrice'));
            return;
        }
        let oldPrice;
        if (form.old_price !== '') {
            oldPrice = Number(form.old_price);
            if (Number.isNaN(oldPrice) || oldPrice < 0) {
                setFormError(t('staffPlans.validationOldPrice'));
                return;
            }
        }
        const days = Number(form.days);
        if (form.days === '' || !Number.isInteger(days) || days < 1 || days > 36500) {
            setFormError(t('staffPlans.validationDays'));
            return;
        }
        const storageLimitMb = Number(form.storage_limit_mb);
        if (
            form.storage_limit_mb === '' ||
            Number.isNaN(storageLimitMb) ||
            storageLimitMb < 0
        ) {
            setFormError(t('staffPlans.validationStorage'));
            return;
        }
        const trimmedOffer = form.offer.trim();
        if (trimmedOffer.length > 200) {
            setFormError(t('staffPlans.validationOffer'));
            return;
        }

        const payload = {
            name,
            price,
            days,
            storage_limit_mb: storageLimitMb,
            features: form.features,
            is_active: form.is_active,
        };
        if (editorState?.mode === 'create') {
            payload.type = form.type;
            if (trimmedOffer) {
                payload.offer = trimmedOffer;
            }
        } else {
            payload.offer = trimmedOffer;
        }
        if (oldPrice !== undefined) {
            payload.old_price = oldPrice;
        }

        setFormError(null);
        setSubmitting(true);
        try {
            if (editorState?.mode === 'create') {
                await financeAdmin.createPlan(payload);
                toast.success(t('staffPlans.createdSuccess'), ToastOptions('success'));
            } else if (editorState?.plan?._id) {
                await financeAdmin.updatePlan(editorState.plan._id, payload);
                toast.success(t('staffPlans.updatedSuccess'), ToastOptions('success'));
            }
            setEditorState(null);
            queryClient.invalidateQueries('staff:plans');
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                setFormError(apiErrorMessage(error));
                queryClient.invalidateQueries('staff:plans');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetire = async () => {
        if (!retireTarget) return;
        try {
            await financeAdmin.retirePlan(retireTarget._id);
            toast.success(t('staffPlans.retiredSuccess'), ToastOptions('success'));
            setRetireTarget(null);
            queryClient.invalidateQueries('staff:plans');
        } catch (error) {
            if (apiErrorStatus(error) === 409) {
                setRetireTarget(null);
                queryClient.invalidateQueries('staff:plans');
            }
        }
    };

    const columns = [
        {
            key: 'name',
            header: t('staffPlans.name'),
            render: (row) => (
                <div>
                    <strong>{row.name}</strong>
                    {row.offer && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>{row.offer}</div>
                    )}
                </div>
            ),
        },
        {
            key: 'type',
            header: t('staffPlans.type'),
            render: (row) => (
                <StatusBadge tone={TYPE_TONE[row.type] || 'neutral'}>
                    {typeLabel(row.type)}
                </StatusBadge>
            ),
        },
        {
            key: 'price',
            header: t('staffPlans.price'),
            render: (row) => (
                <div>
                    <strong>{formatNumber(row.price, language)}</strong>
                    {row.old_price !== undefined && row.old_price !== null && (
                        <span
                            style={{
                                marginInlineStart: '0.5rem',
                                textDecoration: 'line-through',
                                opacity: 0.6,
                                fontSize: '0.8rem',
                            }}
                        >
                            {formatNumber(row.old_price, language)}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'days',
            header: t('staffPlans.days'),
            render: (row) =>
                row.days ? t('staffPlans.daysValue', { count: row.days }) : '—',
        },
        {
            key: 'storage_limit_mb',
            header: t('staffPlans.storageLimitMb'),
            render: (row) => formatMb(row.storage_limit_mb),
        },
        {
            key: 'features',
            header: t('staffPlans.features'),
            render: (row) =>
                t('staffPlans.featuresCount', {
                    count: Array.isArray(row.features) ? row.features.length : 0,
                }),
        },
        {
            key: 'is_active',
            header: t('staffCommon.status'),
            render: (row) => (
                <StatusBadge tone={row.is_active ? 'success' : 'neutral'}>
                    {row.is_active ? t('staffPlans.active') : t('staffPlans.retired')}
                </StatusBadge>
            ),
        },
        {
            key: 'actions',
            header: t('staffCommon.actions'),
            render: (row) => {
                if (row.type === 'free') {
                    return (
                        <StatusBadge tone="neutral">
                            {t('staffPlans.readOnlyFree')}
                        </StatusBadge>
                    );
                }
                return (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                            onClick={() => openEdit(row)}
                        >
                            {t('staffCommon.edit')}
                        </button>
                        {row.is_active && (
                            <button
                                type="button"
                                className="admin-btn admin-btn--danger admin-btn--sm"
                                onClick={() => setRetireTarget(row)}
                            >
                                {t('staffPlans.retirePlan')}
                            </button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <AdminPage
            icon={FaCrown}
            title={t('staffPlans.title')}
            subtitle={t('staffPlans.subtitle')}
            actions={
                <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={openCreate}
                >
                    <FaPlus /> {t('staffPlans.createPlan')}
                </button>
            }
        >
            <AdminTable
                title={t('staffPlans.title')}
                columns={columns}
                rows={plans}
                rowKey="_id"
                loading={plansQuery.isLoading}
                error={plansQuery.error}
                onRetry={plansQuery.refetch}
            />

            <AdminModal
                open={Boolean(editorState)}
                title={
                    editorState?.mode === 'edit'
                        ? t('staffPlans.editPlan')
                        : t('staffPlans.createPlan')
                }
                size="lg"
                onClose={closeEditor}
            >
                <form className="admin-form" onSubmit={handleSave}>
                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffPlans.name')}</span>
                            <input
                                type="text"
                                className="admin-input"
                                maxLength={100}
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                required
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffPlans.type')}</span>
                            <select
                                className="admin-input"
                                value={form.type}
                                disabled={editorState?.mode === 'edit'}
                                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                            >
                                <option value="monthly">{t('staffPlans.typeMonthly')}</option>
                                <option value="yearly">{t('staffPlans.typeYearly')}</option>
                                <option value="lifetime">{t('staffPlans.typeLifetime')}</option>
                            </select>
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffPlans.price')}</span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                className="admin-input"
                                value={form.price}
                                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                                required
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffPlans.oldPrice')}</span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                className="admin-input"
                                value={form.old_price}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, old_price: e.target.value }))
                                }
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffPlans.days')}</span>
                            <input
                                type="number"
                                min="1"
                                max="36500"
                                step="1"
                                className="admin-input"
                                value={form.days}
                                onChange={(e) => setForm((p) => ({ ...p, days: e.target.value }))}
                                required
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffPlans.storageLimitMb')}
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                className="admin-input"
                                value={form.storage_limit_mb}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, storage_limit_mb: e.target.value }))
                                }
                                required
                            />
                        </label>

                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffPlans.offer')}</span>
                            <input
                                type="text"
                                maxLength={200}
                                className="admin-input"
                                placeholder={t('staffPlans.offerPlaceholder')}
                                value={form.offer}
                                onChange={(e) => setForm((p) => ({ ...p, offer: e.target.value }))}
                            />
                        </label>
                    </div>

                    <label className="admin-field admin-field--checkbox">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, is_active: e.target.checked }))
                            }
                        />
                        <span>{t('staffPlans.isActiveLabel')}</span>
                    </label>

                    <div className="admin-field">
                        <span className="admin-field__label">{t('staffPlans.features')}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder={t('staffPlans.featurePlaceholder')}
                                value={featureDraft}
                                onChange={(e) => setFeatureDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addFeature();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="admin-btn admin-btn--secondary"
                                onClick={addFeature}
                            >
                                {t('staffPlans.addFeature')}
                            </button>
                        </div>

                        {form.features.length > 0 && (
                            <ul
                                style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: '0.5rem 0 0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.4rem',
                                }}
                            >
                                {form.features.map((item, idx) => (
                                    <li
                                        key={`${item}-${idx}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '0.5rem',
                                            padding: '0.4rem 0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(148, 163, 184, 0.35)',
                                        }}
                                    >
                                        <span>{item}</span>
                                        <button
                                            type="button"
                                            className="admin-btn admin-btn--ghost admin-btn--sm"
                                            onClick={() => removeFeature(idx)}
                                            aria-label={t('staffPlans.removeFeature')}
                                        >
                                            <FaTimes />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {formError && <p className="admin-field__error">{formError}</p>}

                    <div className="admin-modal__footer">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={closeEditor}
                            disabled={submitting}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--primary"
                            disabled={submitting}
                        >
                            {submitting ? t('staffCommon.saving') : t('staffCommon.save')}
                        </button>
                    </div>
                </form>
            </AdminModal>

            <ReasonModal
                open={Boolean(retireTarget)}
                title={t('staffPlans.retireTitle')}
                description={
                    retireTarget
                        ? t('staffPlans.retireDescription', { name: retireTarget.name })
                        : ''
                }
                confirmLabel={t('staffPlans.retirePlan')}
                tone="danger"
                hideReason
                onConfirm={handleRetire}
                onClose={() => setRetireTarget(null)}
            />
        </AdminPage>
    );
}
