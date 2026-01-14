import express from 'express';
import * as adminController from '../controllers/adminController';
import * as analyticsController from '../controllers/analyticsController';
import * as settingsController from '../controllers/settingsController';
import * as contentLibraryController from '../controllers/contentLibraryController';
import { authMiddleware } from '../middleware/auth';


const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);
router.put('/users/:userId/subscription', adminController.updateUserSubscription);
router.delete('/users/bulk', adminController.bulkDeleteUsers);
router.post('/users/export', adminController.exportUsers);
router.post('/users/import', adminController.importUsers);


// Learning Path Content Management
router.put('/learning-paths/:pathId/nodes/:nodeId', adminController.updateNodeContent);
router.put('/learning-paths/:pathId/nodes/bulk', adminController.bulkUpdateNodes);

// Activity Logs
router.get('/activity-logs', adminController.getActivityLogs);

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

export default router;
