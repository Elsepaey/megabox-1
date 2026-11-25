import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import Pagination from '../../../components/Pagination/Pagination';
import { apiErrorMessage } from '../../../services/admin/adminApi';
import '../_shared-admin-styles.scss';
import './admin-ui.scss';

export function AdminPage({ icon: Icon, title, subtitle, actions, children }) {
    return (
        <div className="admin-page-container">
            <div className="admin-page-container__wrapper">
                <header className="admin-page-header">
                    <div className="admin-page-header__content">
                        {Icon && <Icon className="admin-page-header__icon" />}
                        <div className="admin-page-header__text">
                            <h1 className="admin-page-header__title">{title}</h1>
                            {subtitle && <p className="admin-page-header__subtitle">{subtitle}</p>}
                        </div>
                        {actions && <div className="admin-page-header__actions">{actions}</div>}
                    </div>
                </header>
                {children}
            </div>
        </div>
    );
}

export function AdminCard({ title, actions, children, className = '' }) {
    return (
        <section className={`admin-table-container admin-card ${className}`}>
            {(title || actions) && (
                <div className="admin-table-container__header">
                    {title && <h2 className="admin-table-container__title">{title}</h2>}
                    {actions && <div className="admin-card__actions">{actions}</div>}
                </div>
            )}
            {children}
        </section>
    );
}

export function LoadingState() {
    const { t } = useLanguage();
    return <div className="admin-state">{t('staffCommon.loading')}</div>;
}

export function ErrorState({ error, onRetry }) {
    const { t } = useLanguage();
    return (
        <div className="admin-state admin-state--error">
            <p>{apiErrorMessage(error, t('staffCommon.loadFailed'))}</p>
            {onRetry && (
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => onRetry()}>
                    {t('staffCommon.retry')}
                </button>
            )}
        </div>
    );
}

export function EmptyState({ message }) {
    const { t } = useLanguage();
    return (
        <div className="admin-empty-state">
            <p className="admin-empty-state__message">{message || t('staffCommon.empty')}</p>
        </div>
    );
}

/**
 * columns: [{ key, header, render?: (row) => node, className? }]
 * meta: backend pagination meta ({ total, page, totalPages, ... }).
 */
export function AdminTable({
    title,
    columns,
    rows,
    rowKey = '_id',
    loading,
    error,
    onRetry,
    emptyMessage,
    onRowClick,
    toolbar,
    meta,
    onPageChange,
}) {
    const { t } = useLanguage();
    const keyOf = typeof rowKey === 'function' ? rowKey : (row) => row?.[rowKey];

    let body;
    if (loading && !rows?.length) body = <LoadingState />;
    else if (error) body = <ErrorState error={error} onRetry={onRetry} />;
    else if (!rows?.length) body = <EmptyState message={emptyMessage} />;
    else {
        body = (
            <div className="admin-table-scroll">
                <table className="admin-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className={col.className}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr
                                key={keyOf(row, index) ?? index}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={onRowClick ? 'admin-table__row--clickable' : undefined}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className={col.className}>
                                        {col.render ? col.render(row) : (row?.[col.key] ?? '—')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <section className="admin-table-container">
            {(title || toolbar || meta) && (
                <div className="admin-table-container__header">
                    <div className="admin-table-container__heading">
                        {title && <h2 className="admin-table-container__title">{title}</h2>}
                        {meta && (
                            <span className="admin-table-container__count">
                                {t('staffCommon.totalCount', { count: meta.total ?? 0 })}
                            </span>
                        )}
                    </div>
                    {toolbar}
                </div>
            )}
            {body}
            {meta && onPageChange && (
                <Pagination currentPage={meta.page} totalPages={meta.totalPages} onPageChange={onPageChange} />
            )}
        </section>
    );
}

/**
 * fields: [{ key, label, type: 'text'|'select'|'date'|'number', options?: [{ value, label }], placeholder? }]
 * Select fields get an implicit "All" option with value ''.
 */
export function FilterBar({ fields, values, onChange, onReset }) {
    const { t } = useLanguage();
    return (
        <div className="admin-filter-bar">
            {fields.map((field) => (
                <label key={field.key} className="admin-field">
                    <span className="admin-field__label">{field.label}</span>
                    {field.type === 'select' ? (
                        <select
                            className="admin-input"
                            value={values[field.key] ?? ''}
                            onChange={(e) => onChange(field.key, e.target.value)}
                        >
                            {!field.required && <option value="">{field.allLabel || t('staffCommon.all')}</option>}
                            {field.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            className="admin-input"
                            type={field.type || 'text'}
                            value={values[field.key] ?? ''}
                            placeholder={field.placeholder}
                            onChange={(e) => onChange(field.key, e.target.value)}
                        />
                    )}
                </label>
            ))}
            {onReset && (
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm admin-filter-bar__reset" onClick={onReset}>
                    {t('staffCommon.reset')}
                </button>
            )}
        </div>
    );
}

export function AdminModal({ open, title, onClose, children, footer, size = 'md' }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="admin-modal-backdrop" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                className={`admin-modal admin-modal--${size}`}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="admin-modal__header">
                    <h3 className="admin-modal__title">{title}</h3>
                    <button type="button" className="admin-modal__close" onClick={onClose} aria-label="close">
                        <MdClose size={22} />
                    </button>
                </div>
                <div className="admin-modal__body">{children}</div>
                {footer && <div className="admin-modal__footer">{footer}</div>}
            </motion.div>
        </div>
    );
}

/**
 * Confirmation with a trimmed decision reason (backend: 1–maxLength chars).
 * onConfirm(reason) may be async; the modal stays open on failure.
 * children render above the reason field (e.g. a status select).
 */
export function ReasonModal({
    open,
    title,
    description,
    confirmLabel,
    tone = 'primary',
    maxLength = 500,
    reasonRequired = true,
    hideReason = false,
    reasonLabel,
    canConfirm = true,
    onConfirm,
    onClose,
    children,
}) {
    const { t } = useLanguage();
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) setReason('');
    }, [open]);

    const trimmed = reason.trim();
    const reasonOk = hideReason || !reasonRequired || (trimmed.length > 0 && trimmed.length <= maxLength);

    const submit = async (e) => {
        e.preventDefault();
        if (!reasonOk || !canConfirm || submitting) return;
        setSubmitting(true);
        try {
            await onConfirm(hideReason ? undefined : trimmed || undefined);
        } catch {
            // Caller/service already surfaced the error.
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminModal open={open} title={title} onClose={submitting ? undefined : onClose}>
            <form onSubmit={submit} className="admin-form">
                {description && <p className="admin-modal__description">{description}</p>}
                {children}
                {!hideReason && (
                    <label className="admin-field">
                        <span className="admin-field__label">
                            {reasonLabel || t('staffCommon.reason')}
                            {reasonRequired ? ' *' : ''}
                        </span>
                        <textarea
                            className="admin-input admin-input--textarea"
                            rows={3}
                            maxLength={maxLength}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('staffCommon.reasonPlaceholder')}
                        />
                        <span className="admin-field__hint">{trimmed.length}/{maxLength}</span>
                    </label>
                )}
                <div className="admin-modal__footer">
                    <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose} disabled={submitting}>
                        {t('staffCommon.cancel')}
                    </button>
                    <button
                        type="submit"
                        className={`admin-btn ${tone === 'danger' ? 'admin-btn--danger' : 'admin-btn--primary'}`}
                        disabled={!reasonOk || !canConfirm || submitting}
                    >
                        {submitting ? t('staffCommon.saving') : confirmLabel || t('staffCommon.confirm')}
                    </button>
                </div>
            </form>
        </AdminModal>
    );
}

const TONE_CLASS = {
    success: 'status-approved',
    warning: 'status-pending',
    danger: 'status-rejected',
    info: 'status-info',
    neutral: 'status-neutral',
};

export function StatusBadge({ tone = 'neutral', children }) {
    return <span className={`status-badge ${TONE_CLASS[tone] || TONE_CLASS.neutral}`}>{children}</span>;
}

// items: [{ label, value }]; falsy value renders an em dash.
export function DetailList({ items }) {
    return (
        <dl className="admin-detail-list">
            {items.map((item) => (
                <div key={item.label} className="admin-detail-list__row">
                    <dt className="admin-detail-list__label">{item.label}</dt>
                    <dd className="admin-detail-list__value">
                        {item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

// tabs: [{ key, label }]
export function AdminTabs({ tabs, active, onChange }) {
    return (
        <div className="admin-tabs" role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.key}
                    className={`admin-tabs__tab ${active === tab.key ? 'admin-tabs__tab--active' : ''}`}
                    onClick={() => onChange(tab.key)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export function StatTile({ label, value, hint }) {
    return (
        <div className="admin-stat-tile">
            <span className="admin-stat-tile__label">{label}</span>
            <span className="admin-stat-tile__value">{value}</span>
            {hint && <span className="admin-stat-tile__hint">{hint}</span>}
        </div>
    );
}
