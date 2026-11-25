import { api } from '../apiConfig';
import { adminMutation, adminQuery, cleanParams } from './adminApi';

export const wheelAdmin = {
    listCards() {
        return adminQuery(api.get('/wheel/cards'));
    },

    createCard(payload, fallback) {
        return adminMutation(api.post('/wheel/cards', payload), fallback);
    },

    updateCard(id, payload, fallback) {
        return adminMutation(api.patch(`/wheel/cards/${encodeURIComponent(id)}`, payload), fallback);
    },

    deleteCard(id, fallback) {
        return adminMutation(api.delete(`/wheel/cards/${encodeURIComponent(id)}`), fallback);
    },

    listSpins(params) {
        return adminQuery(api.get('/admin/wheel/spins', { params: cleanParams(params) }));
    },
};
