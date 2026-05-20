// This file is kept for backward compatibility
// All services have been moved to separate files in the services directory
// Please use: import { authService, fileService, etc. } from '../services' or '../services/index'

// Re-export everything from separate service files
export { API_URL, API_ROOT, api } from './apiConfig';
export { authService } from './authService';
export { fileService } from './fileService';
export { userService } from './userService';
export { withdrawalService } from './withdrawalService';
export { notificationService } from './notificationService';
export { adminService } from './adminService';
export { promoterService } from './promoterService';
export { channelService } from './channelService';
export { paymentService } from './paymentService';
export { uploadOrchestrator, uploadFile, pauseUpload, cancelUpload } from './uploadOrchestrator';
export { itemsService, getItems, getRecentFiles, getFileDetails, pollVideoStatus } from './itemsService';
export { downloadService } from './downloadService';

// Default export for backward compatibility
import { api as defaultApi } from './apiConfig';
export default defaultApi;
