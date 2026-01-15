import express from 'express';
import { 
    getAllPaths, 
    getPathById, 
    enrollInPath, 
    getMyPaths, 
    completeNode,
    updateProgress,
    createLearningPath,
    updateLearningPath,
    deleteLearningPath,
    unenrollFromPath,
    reviewLearningPath
} from '../controllers/learningPathController';
import { authenticateToken, isAdmin } from '../middleware/auth';
import { checkSubscription } from '../middleware/subscription';

const router = express.Router();

router.get('/', authenticateToken, getAllPaths);
router.get('/my', authenticateToken, getMyPaths);
router.get('/:id', authenticateToken, checkSubscription, getPathById);
router.post('/enroll', authenticateToken, checkSubscription, enrollInPath);
router.delete('/enroll', authenticateToken, checkSubscription, unenrollFromPath);
router.put('/progress', authenticateToken, checkSubscription, updateProgress);
router.post('/:id/nodes/:nodeId/complete', authenticateToken, checkSubscription, completeNode);

// Admin Routes
router.post('/', authenticateToken, isAdmin, createLearningPath);
router.put('/:id', authenticateToken, isAdmin, updateLearningPath);
router.delete('/:id', authenticateToken, isAdmin, deleteLearningPath);
router.put('/:id/review', authenticateToken, isAdmin, reviewLearningPath);

export default router;
