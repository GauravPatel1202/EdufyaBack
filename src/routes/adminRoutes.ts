import express from 'express';
import * as analyticsController from '../controllers/analyticsController';
import * as settingsController from '../controllers/settingsController';
import * as contentLibraryController from '../controllers/contentLibraryController';
import { authMiddleware, isAdmin as requireAdmin } from '../middleware/auth';
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
  updateUserSubscription,
  bulkDeleteUsers,
  exportUsers,
  importUsers,
  updateNodeContent,
  bulkUpdateNodes,
  getActivityLogs,
  getAdminJobs,
  updateJobBoardSettings,
  updateJobStatus,
  bulkImportJobs,
  getImportQueueStatus,
  runScraper,
  retryFailedImports,
  reScrapeItem,
  sendNotification,
  processEmailQueue,
  getReferralStats
} from '../controllers/adminController';


const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);
router.put('/users/:userId/subscription', updateUserSubscription);
router.delete('/users/bulk', bulkDeleteUsers);
router.post('/users/export', exportUsers);
router.post('/users/import', importUsers);


// Learning Path Content Management
router.put('/learning-paths/:pathId/nodes/:nodeId', updateNodeContent);
router.put('/learning-paths/:pathId/nodes/bulk', bulkUpdateNodes);

// Activity Logs
router.get('/activity-logs', getActivityLogs);

// Job Management
router.get('/jobs', getAdminJobs);
router.put('/jobs/settings', updateJobBoardSettings);
router.put('/jobs/:id/status', updateJobStatus);

// Analytics
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/users', analyticsController.getUserGrowth);
router.get('/analytics/engagement', analyticsController.getEngagement);
router.get('/analytics/revenue', analyticsController.getRevenue);
router.get('/analytics/health', analyticsController.getHealth);
router.get('/analytics/export', analyticsController.exportReport);

// Platform Settings
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);
router.post('/settings/backup', settingsController.createBackup);
router.post('/settings/restore', settingsController.restoreBackup);

// Content Library
router.get('/content', contentLibraryController.getAllContent);
router.post('/content', contentLibraryController.uploadContent);
router.put('/content/:id', contentLibraryController.updateContent);
router.delete('/content/:id', contentLibraryController.deleteContent);
router.post('/content/bulk-upload', contentLibraryController.bulkUpload);
router.get('/content/stats', contentLibraryController.getContentStats);

// Bulk Job Import Routes
router.post('/jobs/bulk-import', bulkImportJobs);
router.get('/jobs/bulk-import/status', getImportQueueStatus);
router.post('/jobs/bulk-import/run', runScraper);
router.post('/jobs/bulk-import/retry', retryFailedImports);
router.post('/jobs/bulk-import/:id/retry', reScrapeItem);

// Notifications
router.post('/notifications/send', requireAdmin, sendNotification);
router.post('/notifications/process-queue', requireAdmin, processEmailQueue);

// Referral Stats
router.get('/referrals/stats', requireAdmin, getReferralStats);

// Roadmap Import
import { importRoadmap, bulkImportRoadmaps, generateAIRoadmap } from '../controllers/roadmapController';
router.post('/learning-paths/import/roadmap', authMiddleware, requireAdmin, importRoadmap);
router.post('/learning-paths/import/all', authMiddleware, requireAdmin, bulkImportRoadmaps);
router.post('/learning-paths/generate/ai', authMiddleware, requireAdmin, generateAIRoadmap);

export default router;
