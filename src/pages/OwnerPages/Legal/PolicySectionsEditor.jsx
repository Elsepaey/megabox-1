import React from 'react';
import { MdAdd, MdClose, MdDelete } from 'react-icons/md';
import { useLanguage } from '../../../context/LanguageContext';
import { createEmptyItem, createEmptyPoint, createEmptySection } from './validatePolicySections';

export default function PolicySectionsEditor({ sections, onChange }) {
    const { t } = useLanguage();

    const updateSection = (sIdx, updater) => {
        onChange(sections.map((sec, idx) => (idx === sIdx ? updater(sec) : sec)));
    };

    const addSection = () => {
        onChange([...sections, createEmptySection()]);
    };

    const removeSection = (sIdx) => {
        if (sections.length <= 1) return;
        onChange(sections.filter((_, idx) => idx !== sIdx));
    };

    const addItem = (sIdx, type) => {
        updateSection(sIdx, (sec) => ({
            ...sec,
            items: [...sec.items, createEmptyItem(type)],
        }));
    };

    const removeItem = (sIdx, iIdx) => {
        updateSection(sIdx, (sec) => {
            if (sec.items.length <= 1) return sec;
            return { ...sec, items: sec.items.filter((_, idx) => idx !== iIdx) };
        });
    };

    const updateItem = (sIdx, iIdx, updater) => {
        updateSection(sIdx, (sec) => ({
            ...sec,
            items: sec.items.map((item, idx) => (idx === iIdx ? updater(item) : item)),
        }));
    };

    const changeItemType = (sIdx, iIdx, nextType) => {
        updateItem(sIdx, iIdx, (item) => {
            if (item.type === nextType) return item;
            if (nextType === 'list') {
                return {
                    type: 'list',
                    heading: item.heading || { en: '', ar: '' },
                    points: [createEmptyPoint()],
                };
            }
            return {
                type: 'paragraph',
                heading: item.heading || { en: '', ar: '' },
                body: { en: '', ar: '' },
            };
        });
    };

    const addPoint = (sIdx, iIdx) => {
        updateItem(sIdx, iIdx, (item) => ({
            ...item,
            points: [...(item.points || []), createEmptyPoint()],
        }));
    };

    const removePoint = (sIdx, iIdx, pIdx) => {
        updateItem(sIdx, iIdx, (item) => {
            if ((item.points || []).length <= 1) return item;
            return { ...item, points: item.points.filter((_, idx) => idx !== pIdx) };
        });
    };

    const updatePoint = (sIdx, iIdx, pIdx, lang, value) => {
        updateItem(sIdx, iIdx, (item) => ({
            ...item,
            points: item.points.map((pt, idx) =>
                idx === pIdx ? { ...pt, text: { ...pt.text, [lang]: value } } : pt,
            ),
        }));
    };

    return (
        <div className="admin-form">
            {sections.map((section, sIdx) => (
                <div key={sIdx} className="admin-legal__section-card">
                    <div className="admin-legal__section-header">
                        <h4 className="admin-legal__section-title">
                            {t('staffLegal.section', { index: sIdx + 1 })}
                        </h4>
                        <button
                            type="button"
                            className="admin-btn admin-btn--danger admin-btn--sm"
                            disabled={sections.length <= 1}
                            onClick={() => removeSection(sIdx)}
                        >
                            <MdDelete size={15} />
                            {t('staffLegal.removeSection')}
                        </button>
                    </div>

                    <div className="admin-legal__bilingual">
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffLegal.sectionTitleEn')} *</span>
                            <input
                                type="text"
                                className="admin-input"
                                dir="ltr"
                                value={section.title.en}
                                onChange={(e) =>
                                    updateSection(sIdx, (sec) => ({
                                        ...sec,
                                        title: { ...sec.title, en: e.target.value },
                                    }))
                                }
                            />
                        </label>
                        <label className="admin-field">
                            <span className="admin-field__label">{t('staffLegal.sectionTitleAr')} *</span>
                            <input
                                type="text"
                                className="admin-input"
                                dir="rtl"
                                value={section.title.ar}
                                onChange={(e) =>
                                    updateSection(sIdx, (sec) => ({
                                        ...sec,
                                        title: { ...sec.title, ar: e.target.value },
                                    }))
                                }
                            />
                        </label>
                    </div>

                    {section.items.map((item, iIdx) => (
                        <div key={iIdx} className="admin-legal__item-card">
                            <div className="admin-legal__section-header">
                                <div className="admin-card__actions" style={{ alignItems: 'center' }}>
                                    <strong>{t('staffLegal.item', { index: iIdx + 1 })}</strong>
                                    <select
                                        className="admin-input"
                                        style={{ width: 'auto', minHeight: '2rem', paddingBlock: '0.25rem' }}
                                        value={item.type}
                                        onChange={(e) => changeItemType(sIdx, iIdx, e.target.value)}
                                        aria-label={t('staffLegal.itemType')}
                                    >
                                        <option value="paragraph">{t('staffLegal.typeParagraph')}</option>
                                        <option value="list">{t('staffLegal.typeList')}</option>
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--ghost admin-btn--sm"
                                    disabled={section.items.length <= 1}
                                    onClick={() => removeItem(sIdx, iIdx)}
                                >
                                    <MdClose size={16} />
                                    {t('staffLegal.removeItem')}
                                </button>
                            </div>

                            <div className="admin-legal__bilingual">
                                <label className="admin-field">
                                    <span className="admin-field__label">{t('staffLegal.headingEn')}</span>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        dir="ltr"
                                        value={item.heading?.en || ''}
                                        onChange={(e) =>
                                            updateItem(sIdx, iIdx, (cur) => ({
                                                ...cur,
                                                heading: { ...(cur.heading || { en: '', ar: '' }), en: e.target.value },
                                            }))
                                        }
                                    />
                                </label>
                                <label className="admin-field">
                                    <span className="admin-field__label">{t('staffLegal.headingAr')}</span>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        dir="rtl"
                                        value={item.heading?.ar || ''}
                                        onChange={(e) =>
                                            updateItem(sIdx, iIdx, (cur) => ({
                                                ...cur,
                                                heading: { ...(cur.heading || { en: '', ar: '' }), ar: e.target.value },
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            {item.type === 'paragraph' ? (
                                <div className="admin-legal__bilingual">
                                    <label className="admin-field">
                                        <span className="admin-field__label">{t('staffLegal.bodyEn')} *</span>
                                        <textarea
                                            className="admin-input admin-input--textarea"
                                            dir="ltr"
                                            rows={3}
                                            value={item.body?.en || ''}
                                            onChange={(e) =>
                                                updateItem(sIdx, iIdx, (cur) => ({
                                                    ...cur,
                                                    body: { ...(cur.body || { en: '', ar: '' }), en: e.target.value },
                                                }))
                                            }
                                        />
                                    </label>
                                    <label className="admin-field">
                                        <span className="admin-field__label">{t('staffLegal.bodyAr')} *</span>
                                        <textarea
                                            className="admin-input admin-input--textarea"
                                            dir="rtl"
                                            rows={3}
                                            value={item.body?.ar || ''}
                                            onChange={(e) =>
                                                updateItem(sIdx, iIdx, (cur) => ({
                                                    ...cur,
                                                    body: { ...(cur.body || { en: '', ar: '' }), ar: e.target.value },
                                                }))
                                            }
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="admin-form">
                                    <div className="admin-legal__section-header">
                                        <span className="admin-field__label">{t('staffLegal.points')} *</span>
                                        <button
                                            type="button"
                                            className="admin-btn admin-btn--secondary admin-btn--sm"
                                            onClick={() => addPoint(sIdx, iIdx)}
                                        >
                                            <MdAdd size={15} />
                                            {t('staffLegal.addPoint')}
                                        </button>
                                    </div>
                                    {(item.points || []).map((pt, pIdx) => (
                                        <div key={pIdx} className="admin-legal__point-row">
                                            <input
                                                type="text"
                                                className="admin-input"
                                                dir="ltr"
                                                placeholder={t('staffLegal.pointEn', { index: pIdx + 1 })}
                                                value={pt.text?.en || ''}
                                                onChange={(e) => updatePoint(sIdx, iIdx, pIdx, 'en', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="admin-input"
                                                dir="rtl"
                                                placeholder={t('staffLegal.pointAr', { index: pIdx + 1 })}
                                                value={pt.text?.ar || ''}
                                                onChange={(e) => updatePoint(sIdx, iIdx, pIdx, 'ar', e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                                disabled={(item.points || []).length <= 1}
                                                onClick={() => removePoint(sIdx, iIdx, pIdx)}
                                                aria-label={t('staffLegal.removePoint')}
                                            >
                                                <MdClose size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="admin-card__actions">
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                            onClick={() => addItem(sIdx, 'paragraph')}
                        >
                            <MdAdd size={15} />
                            {t('staffLegal.addParagraph')}
                        </button>
                        <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--sm"
                            onClick={() => addItem(sIdx, 'list')}
                        >
                            <MdAdd size={15} />
                            {t('staffLegal.addList')}
                        </button>
                    </div>
                </div>
            ))}

            <div>
                <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={addSection}
                >
                    <MdAdd size={18} />
                    {t('staffLegal.addSection')}
                </button>
            </div>
        </div>
    );
}
