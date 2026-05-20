import { api } from './apiConfig';

const langParams = () => {
  const language = document.cookie
    .split('; ')
    .find((row) => row.startsWith('language='))
    ?.split('=')[1] || 'en';
  return { params: { lang: language } };
};

export const privacyTermsService = {
  /**
   * Fetch privacy policy from backend
   * Returns: { policy: { version: number, sections: [...] } }
   * The version field is an integer (e.g., 1, 2, 3)
   */
  getPrivacyPolicy: async (lang = null) => {
    try {
      const params = lang ? { params: { lang } } : langParams();
      const { data } = await api.get('/privacy-policy', params);
      // Ensure version is a number
      if (data?.policy?.version) {
        data.policy.version = parseInt(data.policy.version, 10);
      }
      return data;
    } catch (error) {
      console.error('Error fetching privacy policy:', error);
      throw error;
    }
  },

  /**
   * Fetch terms of service from backend
   * Returns: { terms: { version: number, sections: [...] } }
   * The version field is an integer (e.g., 1, 2, 3)
   */
  getTermsOfService: async (lang = null) => {
    try {
      const params = lang ? { params: { lang } } : langParams();
      const { data } = await api.get('/terms', params);
      // Ensure version is a number
      if (data?.terms?.version) {
        data.terms.version = parseInt(data.terms.version, 10);
      }
      return data;
    } catch (error) {
      console.error('Error fetching terms of service:', error);
      throw error;
    }
  }
};
