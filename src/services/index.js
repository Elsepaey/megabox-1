// Export API configuration
export { API_URL, API_ROOT, api } from './apiConfig';

// Export all services
export { authService } from './authService';
export { fileService } from './fileService';
export { userService } from './userService';
export { withdrawalService } from './withdrawalService';
export { notificationService } from './notificationService';
export { adminService } from './adminService';
export { privacyTermsService } from './privacyTermsService';

// Upload + fetch services for the new backend
export { uploadOrchestrator, uploadFile, pauseUpload, cancelUpload } from './uploadOrchestrator';
export { itemsService, getItems, getRecentFiles, getFileDetails, pollVideoStatus } from './itemsService';
export { downloadService } from './downloadService';

// Default export for backward compatibility
import { api } from './apiConfig';
export default api;

