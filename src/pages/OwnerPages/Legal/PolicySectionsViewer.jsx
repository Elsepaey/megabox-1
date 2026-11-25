import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { EmptyState } from '../_shared/AdminUI';

function renderItems(items, lang) {
    if (!Array.isArray(items)) return null;
    return items.map((item, idx) => (
        <div key={idx}>
            {item?.heading?.[lang] && <h5>{item.heading[lang]}</h5>}
            {item?.type === 'list' ? (
                <ul>
                    {(item.points || []).map((pt, pIdx) => (
                        <li key={pIdx}>{pt?.text?.[lang] || '—'}</li>
                    ))}
                </ul>
            ) : (
                <p>{item?.body?.[lang] || '—'}</p>
            )}
        </div>
    ));
}

export default function PolicySectionsViewer({ sections }) {
    const { t } = useLanguage();

    if (!Array.isArray(sections) || sections.length === 0) {
        return <EmptyState message={t('staffLegal.noSections')} />;
    }

    return (
        <div>
            <div className="admin-legal__bilingual" style={{ marginBottom: '0.75rem' }}>
                <div className="admin-legal__col-header">{t('staffLegal.englishColumn')}</div>
                <div className="admin-legal__col-header">{t('staffLegal.arabicColumn')}</div>
            </div>

            {sections.map((section, sIdx) => (
                <div key={sIdx} className="admin-legal__viewer-section">
                    <div className="admin-legal__bilingual">
                        <div className="admin-legal__viewer-pane" dir="ltr">
                            <h4>{section?.title?.en || '—'}</h4>
                            {renderItems(section?.items, 'en')}
                        </div>
                        <div className="admin-legal__viewer-pane" dir="rtl">
                            <h4>{section?.title?.ar || '—'}</h4>
                            {renderItems(section?.items, 'ar')}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
