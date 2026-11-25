export function createEmptyPoint() {
    return { text: { en: '', ar: '' } };
}

export function createEmptyItem(type = 'paragraph') {
    if (type === 'list') {
        return {
            type: 'list',
            heading: { en: '', ar: '' },
            points: [createEmptyPoint()],
        };
    }
    return {
        type: 'paragraph',
        heading: { en: '', ar: '' },
        body: { en: '', ar: '' },
    };
}

export function createEmptySection() {
    return {
        title: { en: '', ar: '' },
        items: [createEmptyItem('paragraph')],
    };
}

export function normalizeSectionsForEditor(sections) {
    if (!Array.isArray(sections) || sections.length === 0) {
        return [createEmptySection()];
    }
    return sections.map((section) => ({
        title: {
            en: section?.title?.en || '',
            ar: section?.title?.ar || '',
        },
        items:
            Array.isArray(section?.items) && section.items.length > 0
                ? section.items.map((item) => {
                    const type = item?.type === 'list' ? 'list' : 'paragraph';
                    const base = {
                        type,
                        heading: {
                            en: item?.heading?.en || '',
                            ar: item?.heading?.ar || '',
                        },
                    };
                    if (type === 'list') {
                        const pts = Array.isArray(item?.points) && item.points.length > 0
                            ? item.points.map((p) => ({
                                text: {
                                    en: p?.text?.en || '',
                                    ar: p?.text?.ar || '',
                                },
                            }))
                            : [createEmptyPoint()];
                        return { ...base, points: pts };
                    }
                    return {
                        ...base,
                        body: {
                            en: item?.body?.en || '',
                            ar: item?.body?.ar || '',
                        },
                    };
                })
                : [createEmptyItem('paragraph')],
    }));
}

/**
 * Mirrors Mega-Box-backend/src/modules/about-us/policies/policy-sections.dto.ts.
 * Returns { errors: string[], payload: { sections } | null }.
 */
export function validateAndBuildPolicyPayload(sections, t) {
    const errors = [];

    if (!Array.isArray(sections) || sections.length === 0) {
        errors.push(t('staffLegal.errNoSections'));
        return { errors, payload: null };
    }

    const sanitizedSections = sections.map((section, sIdx) => {
        const sNum = sIdx + 1;
        const titleEn = (section?.title?.en || '').trim();
        const titleAr = (section?.title?.ar || '').trim();
        if (!titleEn || !titleAr) {
            errors.push(t('staffLegal.errSectionTitle', { section: sNum }));
        }

        const rawItems = Array.isArray(section?.items) ? section.items : [];
        if (rawItems.length === 0) {
            errors.push(t('staffLegal.errNoItems', { section: sNum }));
        }

        const sanitizedItems = rawItems.map((item, iIdx) => {
            const iNum = iIdx + 1;
            const type = item?.type === 'list' ? 'list' : 'paragraph';
            const headingEn = (item?.heading?.en || '').trim();
            const headingAr = (item?.heading?.ar || '').trim();
            const hasHeadingEn = headingEn.length > 0;
            const hasHeadingAr = headingAr.length > 0;

            if (hasHeadingEn !== hasHeadingAr) {
                errors.push(t('staffLegal.errHeadingPartial', { section: sNum, item: iNum }));
            }

            const built = { type };
            if (hasHeadingEn && hasHeadingAr) {
                built.heading = { en: headingEn, ar: headingAr };
            }

            if (type === 'paragraph') {
                const bodyEn = (item?.body?.en || '').trim();
                const bodyAr = (item?.body?.ar || '').trim();
                if (!bodyEn || !bodyAr) {
                    errors.push(t('staffLegal.errParagraphBody', { section: sNum, item: iNum }));
                }
                built.body = { en: bodyEn, ar: bodyAr };
            } else {
                const rawPoints = Array.isArray(item?.points) ? item.points : [];
                if (rawPoints.length === 0) {
                    errors.push(t('staffLegal.errNoPoints', { section: sNum, item: iNum }));
                }
                built.points = rawPoints.map((pt, pIdx) => {
                    const pNum = pIdx + 1;
                    const textEn = (pt?.text?.en || '').trim();
                    const textAr = (pt?.text?.ar || '').trim();
                    if (!textEn || !textAr) {
                        errors.push(t('staffLegal.errPointText', { section: sNum, item: iNum, point: pNum }));
                    }
                    return { text: { en: textEn, ar: textAr } };
                });
            }

            return built;
        });

        return {
            title: { en: titleEn, ar: titleAr },
            items: sanitizedItems,
        };
    });

    if (errors.length > 0) {
        return { errors, payload: null };
    }

    return { errors: [], payload: { sections: sanitizedSections } };
}
