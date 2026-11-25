import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { FaCreditCard, FaPlus, FaArrowUp, FaArrowDown, FaTrash } from 'react-icons/fa';
import { useLanguage } from '../../../context/LanguageContext';
import { ToastOptions } from '../../../helpers/ToastOptions';
import paymentMethodsAdmin from '../../../services/admin/paymentMethodsAdmin';
import { apiErrorMessage } from '../../../services/admin/adminApi';
import {
    AdminModal,
    AdminPage,
    AdminTable,
    ReasonModal,
    StatusBadge,
} from '../_shared/AdminUI';

const METHOD_TYPES = ['paypal', 'bank', 'wallet', 'crypto', 'other'];
const FIELD_TYPES = ['text', 'email', 'phone'];
const FIELD_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/;

const TYPE_TONE = {
    paypal: 'info',
    bank: 'success',
    wallet: 'warning',
    crypto: 'neutral',
    other: 'neutral',
};

function emptyField() {
    return {
        key: '',
        label_en: '',
        label_ar: '',
        type: 'text',
        required: true,
        pattern: '',
    };
}

function emptyForm() {
    return {
        name_en: '',
        name_ar: '',
        type: 'wallet',
        sortOrder: '0',
        isActive: true,
        fields: [emptyField()],
    };
}

function formFromMethod(method) {
    return {
        name_en: method.name_en ?? '',
        name_ar: method.name_ar ?? '',
        type: method.type ?? 'other',
        sortOrder:
            method.sortOrder !== undefined && method.sortOrder !== null
                ? String(method.sortOrder)
                : '0',
        isActive: Boolean(method.isActive),
        fields:
            Array.isArray(method.fields) && method.fields.length > 0
                ? method.fields.map((f) => ({
                      key: f.key ?? '',
                      label_en: f.label_en ?? '',
                      label_ar: f.label_ar ?? '',
                      type: f.type ?? 'text',
                      required: f.required !== false,
                      pattern: f.pattern ?? '',
                  }))
                : [emptyField()],
    };
}

export default function AdminPaymentMethods() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();

    const [editorState, setEditorState] = useState(null); // null | { mode: 'create'|'edit', method? }
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [retireTarget, setRetireTarget] = useState(null);
    const [reactivatingId, setReactivatingId] = useState(null);

    const methodsQuery = useQuery(
        ['staff:payment-methods'],
        paymentMethodsAdmin.listPaymentMethods,
        {
            retry: false,
            refetchOnWindowFocus: false,
        },
    );

    const methods = methodsQuery.data?.paymentMethods ?? [];

    const typeLabel = (type) => {
        const map = {
            paypal: t('staffPaymentMethods.typePaypal'),
            bank: t('staffPaymentMethods.typeBank'),
            wallet: t('staffPaymentMethods.typeWallet'),
            crypto: t('staffPaymentMethods.typeCrypto'),
            other: t('staffPaymentMethods.typeOther'),
        };
        return map[type] || type || '—';
    };

    const fieldTypeLabel = (type) => {
        const map = {
            text: t('staffPaymentMethods.fieldTypeText'),
            email: t('staffPaymentMethods.fieldTypeEmail'),
            phone: t('staffPaymentMethods.fieldTypePhone'),
        };
        return map[type] || type;
    };

    const openCreate = () => {
        setForm(emptyForm());
        setFormError(null);
        setEditorState({ mode: 'create' });
    };

    const openEdit = (method) => {
        setForm(formFromMethod(method));
        setFormError(null);
        setEditorState({ mode: 'edit', method });
    };

    const closeEditor = () => {
        if (submitting) return;
        setEditorState(null);
        setFormError(null);
    };

    const updateField = (index, patch) => {
        setForm((prev) => ({
            ...prev,
            fields: prev.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
        }));
    };

    const addField = () => {
        if (form.fields.length >= 20) return;
        setForm((prev) => ({ ...prev, fields: [...prev.fields, emptyField()] }));
    };

    const removeField = (index) => {
        setForm((prev) => ({
            ...prev,
            fields: prev.fields.filter((_, i) => i !== index),
        }));
    };

    const moveField = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= form.fields.length) return;
        setForm((prev) => {
            const next = [...prev.fields];
            const [item] = next.splice(index, 1);
            next.splice(target, 0, item);
            return { ...prev, fields: next };
        });
    };

    const handleSave = async (event) => {
        event.preventDefault();
        const nameEn = form.name_en.trim();
        if (nameEn.length < 1 || nameEn.length > 100) {
            setFormError(t('staffPaymentMethods.validationNameEn'));
            return;
        }
        const nameAr = form.name_ar.trim();
        if (nameAr.length < 1 || nameAr.length > 100) {
            setFormError(t('staffPaymentMethods.validationNameAr'));
            return;
        }
        const sortOrder = Number(form.sortOrder === '' ? 0 : form.sortOrder);
        if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
            setFormError(t('staffPaymentMethods.validationSortOrder'));
            return;
        }
        if (!form.fields.length) {
            setFormError(t('staffPaymentMethods.validationFieldsMin'));
            return;
        }

        const seenKeys = new Set();
        const normalizedFields = [];
        for (let i = 0; i < form.fields.length; i += 1) {
            const raw = form.fields[i];
            const key = raw.key.trim();
            if (!FIELD_KEY_REGEX.test(key)) {
                setFormError(t('staffPaymentMethods.validationFieldKey', { index: i + 1 }));
                return;
            }
            const lower = key.toLowerCase();
            if (seenKeys.has(lower)) {
                setFormError(t('staffPaymentMethods.validationFieldKeyDuplicate', { key }));
                return;
            }
            seenKeys.add(lower);

            const labelEn = raw.label_en.trim();
            if (labelEn.length < 1 || labelEn.length > 100) {
                setFormError(t('staffPaymentMethods.validationFieldLabelEn', { index: i + 1 }));
                return;
            }
            const labelAr = raw.label_ar.trim();
            if (labelAr.length < 1 || labelAr.length > 100) {
                setFormError(t('staffPaymentMethods.validationFieldLabelAr', { index: i + 1 }));
                return;
            }
            const pattern = raw.pattern.trim();
            if (pattern) {
                try {
                    new RegExp(pattern);
                } catch {
                    setFormError(t('staffPaymentMethods.validationFieldPattern', { index: i + 1 }));
                    return;
                }
            }

            const fieldPayload = {
                key,
                label_en: labelEn,
                label_ar: labelAr,
                type: raw.type,
                required: Boolean(raw.required),
            };
            if (pattern) {
                fieldPayload.pattern = pattern;
            }
            normalizedFields.push(fieldPayload);
        }

        const payload = {
            name_en: nameEn,
            name_ar: nameAr,
            type: form.type,
            sortOrder,
            isActive: Boolean(form.isActive),
            fields: normalizedFields,
        };

        setFormError(null);
        setSubmitting(true);
        try {
            if (editorState.mode === 'create') {
                await paymentMethodsAdmin.createPaymentMethod(payload);
                toast.success(t('staffPaymentMethods.createdSuccess'), ToastOptions('success'));
            } else {
                await paymentMethodsAdmin.updatePaymentMethod(editorState.method._id, payload);
                toast.success(t('staffPaymentMethods.updatedSuccess'), ToastOptions('success'));
            }
            setEditorState(null);
            queryClient.invalidateQueries(['staff:payment-methods']);
        } catch (error) {
            setFormError(apiErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetire = async () => {
        if (!retireTarget) return;
        try {
            await paymentMethodsAdmin.retirePaymentMethod(retireTarget._id);
            toast.success(t('staffPaymentMethods.retiredSuccess'), ToastOptions('success'));
            setRetireTarget(null);
            queryClient.invalidateQueries(['staff:payment-methods']);
        } catch {
            // adminMutation already toasted backend message
        }
    };

    const handleReactivate = async (method) => {
        setReactivatingId(method._id);
        try {
            await paymentMethodsAdmin.updatePaymentMethod(method._id, { isActive: true });
            toast.success(t('staffPaymentMethods.reactivatedSuccess'), ToastOptions('success'));
            queryClient.invalidateQueries(['staff:payment-methods']);
        } catch {
            // adminMutation already toasted backend message
        } finally {
            setReactivatingId(null);
        }
    };

    const columns = [
        {
            key: 'name',
            header: t('staffPaymentMethods.name'),
            render: (row) => (
                <div>
                    <div style={{ fontWeight: 600 }}>
                        {language === 'ar' ? row.name_ar : row.name_en}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {language === 'ar' ? row.name_en : row.name_ar}
                    </div>
                </div>
            ),
        },
        {
            key: 'type',
            header: t('staffPaymentMethods.type'),
            render: (row) => (
                <StatusBadge tone={TYPE_TONE[row.type] || 'neutral'}>
                    {typeLabel(row.type)}
                </StatusBadge>
            ),
        },
        {
            key: 'fields',
            header: t('staffPaymentMethods.fields'),
            render: (row) => {
                const list = Array.isArray(row.fields) ? row.fields : [];
                return (
                    <div>
                        <div style={{ fontWeight: 600 }}>
                            {t('staffPaymentMethods.fieldsCount', { count: list.length })}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                            {list
                                .map((f) => (language === 'ar' ? f.label_ar : f.label_en))
                                .join(' · ') || '—'}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'sortOrder',
            header: t('staffPaymentMethods.sortOrder'),
            render: (row) => row.sortOrder ?? 0,
        },
        {
            key: 'isActive',
            header: t('staffCommon.status'),
            render: (row) => (
                <StatusBadge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive
                        ? t('staffPaymentMethods.active')
                        : t('staffPaymentMethods.retired')}
                </StatusBadge>
            ),
        },
        {
            key: 'actions',
            header: t('staffCommon.actions'),
            render: (row) => (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => openEdit(row)}
                    >
                        {t('staffCommon.edit')}
                    </button>
                    {row.isActive ? (
                        <button
                            type="button"
                            className="admin-btn admin-btn--danger admin-btn--sm"
                            onClick={() => setRetireTarget(row)}
                        >
                            {t('staffPaymentMethods.retireMethod')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="admin-btn admin-btn--primary admin-btn--sm"
                            disabled={reactivatingId === row._id}
                            onClick={() => handleReactivate(row)}
                        >
                            {t('staffPaymentMethods.reactivateMethod')}
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AdminPage
            icon={FaCreditCard}
            title={t('staffPaymentMethods.title')}
            subtitle={t('staffPaymentMethods.subtitle')}
            actions={
                <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={openCreate}
                >
                    <FaPlus /> {t('staffPaymentMethods.createMethod')}
                </button>
            }
        >
            <AdminTable
                title={t('staffPaymentMethods.title')}
                columns={columns}
                rows={methods}
                rowKey="_id"
                loading={methodsQuery.isLoading}
                error={methodsQuery.error}
                onRetry={methodsQuery.refetch}
                emptyMessage={t('staffPaymentMethods.empty')}
            />

            <AdminModal
                open={Boolean(editorState)}
                size="lg"
                title={
                    editorState?.mode === 'create'
                        ? t('staffPaymentMethods.createMethod')
                        : t('staffPaymentMethods.editMethod')
                }
                onClose={closeEditor}
                footer={
                    <>
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            disabled={submitting}
                            onClick={closeEditor}
                        >
                            {t('staffCommon.cancel')}
                        </button>
                        <button
                            type="submit"
                            form="payment-method-editor-form"
                            className="admin-btn admin-btn--primary"
                            disabled={submitting}
                        >
                            {submitting ? t('staffCommon.saving') : t('staffCommon.save')}
                        </button>
                    </>
                }
            >
                <form
                    id="payment-method-editor-form"
                    className="admin-form"
                    onSubmit={handleSave}
                >
                    <div className="admin-form-grid">
                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffPaymentMethods.nameEn')} *
                            </span>
                            <input
                                type="text"
                                className="admin-input"
                                value={form.name_en}
                                maxLength={100}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, name_en: e.target.value }))
                                }
                                required
                            />
                        </label>
                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffPaymentMethods.nameAr')} *
                            </span>
                            <input
                                type="text"
                                className="admin-input"
                                dir="rtl"
                                value={form.name_ar}
                                maxLength={100}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, name_ar: e.target.value }))
                                }
                                required
                            />
                        </label>
                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffPaymentMethods.type')} *
                            </span>
                            <select
                                className="admin-input"
                                value={form.type}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, type: e.target.value }))
                                }
                            >
                                {METHOD_TYPES.map((methodType) => (
                                    <option key={methodType} value={methodType}>
                                        {typeLabel(methodType)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="admin-field">
                            <span className="admin-field__label">
                                {t('staffPaymentMethods.sortOrder')}
                            </span>
                            <input
                                type="number"
                                className="admin-input"
                                min={0}
                                max={10000}
                                step={1}
                                value={form.sortOrder}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                                }
                            />
                        </label>
                    </div>

                    <label className="admin-field admin-field--checkbox">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                            }
                        />
                        <span>{t('staffPaymentMethods.isActiveLabel')}</span>
                    </label>

                    <div style={{ marginTop: '0.5rem' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.5rem',
                            }}
                        >
                            <div>
                                <div className="admin-field__label">
                                    {t('staffPaymentMethods.fieldsTitle')} *
                                </div>
                                <div className="admin-field__hint">
                                    {t('staffPaymentMethods.fieldsHint')}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="admin-btn admin-btn--secondary admin-btn--sm"
                                disabled={form.fields.length >= 20}
                                onClick={addField}
                            >
                                <FaPlus /> {t('staffPaymentMethods.addField')}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {form.fields.map((field, index) => (
                                <div
                                    key={index}
                                    style={{
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.6rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <strong style={{ fontSize: '0.85rem' }}>
                                            #{index + 1}{' '}
                                            {field.key ? `(${field.key})` : ''}
                                        </strong>
                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                            <button
                                                type="button"
                                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                                disabled={index === 0}
                                                title={t('staffPaymentMethods.moveUp')}
                                                onClick={() => moveField(index, -1)}
                                            >
                                                <FaArrowUp />
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                                disabled={index === form.fields.length - 1}
                                                title={t('staffPaymentMethods.moveDown')}
                                                onClick={() => moveField(index, 1)}
                                            >
                                                <FaArrowDown />
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-btn admin-btn--danger admin-btn--sm"
                                                disabled={form.fields.length <= 1}
                                                title={t('staffPaymentMethods.removeField')}
                                                onClick={() => removeField(index)}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="admin-form-grid">
                                        <label className="admin-field">
                                            <span className="admin-field__label">
                                                {t('staffPaymentMethods.fieldKey')} *
                                            </span>
                                            <input
                                                type="text"
                                                className="admin-input"
                                                placeholder={t('staffPaymentMethods.fieldKeyPlaceholder')}
                                                maxLength={50}
                                                value={field.key}
                                                onChange={(e) =>
                                                    updateField(index, { key: e.target.value })
                                                }
                                                required
                                            />
                                        </label>
                                        <label className="admin-field">
                                            <span className="admin-field__label">
                                                {t('staffPaymentMethods.fieldType')} *
                                            </span>
                                            <select
                                                className="admin-input"
                                                value={field.type}
                                                onChange={(e) =>
                                                    updateField(index, { type: e.target.value })
                                                }
                                            >
                                                {FIELD_TYPES.map((ft) => (
                                                    <option key={ft} value={ft}>
                                                        {fieldTypeLabel(ft)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="admin-field">
                                            <span className="admin-field__label">
                                                {t('staffPaymentMethods.fieldLabelEn')} *
                                            </span>
                                            <input
                                                type="text"
                                                className="admin-input"
                                                maxLength={100}
                                                value={field.label_en}
                                                onChange={(e) =>
                                                    updateField(index, { label_en: e.target.value })
                                                }
                                                required
                                            />
                                        </label>
                                        <label className="admin-field">
                                            <span className="admin-field__label">
                                                {t('staffPaymentMethods.fieldLabelAr')} *
                                            </span>
                                            <input
                                                type="text"
                                                className="admin-input"
                                                dir="rtl"
                                                maxLength={100}
                                                value={field.label_ar}
                                                onChange={(e) =>
                                                    updateField(index, { label_ar: e.target.value })
                                                }
                                                required
                                            />
                                        </label>
                                        <label className="admin-field">
                                            <span className="admin-field__label">
                                                {t('staffPaymentMethods.fieldPattern')}
                                            </span>
                                            <input
                                                type="text"
                                                className="admin-input"
                                                placeholder={t(
                                                    'staffPaymentMethods.fieldPatternPlaceholder',
                                                )}
                                                maxLength={200}
                                                value={field.pattern}
                                                onChange={(e) =>
                                                    updateField(index, { pattern: e.target.value })
                                                }
                                            />
                                        </label>
                                        <label
                                            className="admin-field admin-field--checkbox"
                                            style={{ alignSelf: 'end', paddingBottom: '0.45rem' }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) =>
                                                    updateField(index, {
                                                        required: e.target.checked,
                                                    })
                                                }
                                            />
                                            <span>{t('staffPaymentMethods.fieldRequired')}</span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {formError && <p className="admin-field__error">{formError}</p>}
                </form>
            </AdminModal>

            <ReasonModal
                open={Boolean(retireTarget)}
                title={t('staffPaymentMethods.retireMethod')}
                description={
                    retireTarget
                        ? t('staffPaymentMethods.retireDescription', {
                              name:
                                  language === 'ar'
                                      ? retireTarget.name_ar
                                      : retireTarget.name_en,
                          })
                        : ''
                }
                confirmLabel={t('staffPaymentMethods.retireMethod')}
                tone="danger"
                hideReason
                onConfirm={handleRetire}
                onClose={() => setRetireTarget(null)}
            />
        </AdminPage>
    );
}
