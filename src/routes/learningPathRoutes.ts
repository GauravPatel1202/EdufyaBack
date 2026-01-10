import express from 'express';
import { 
    getAllPaths, 
    getPathById, 
    enrollInPath, 
    getMyPaths, 
    completeNode,
    createLearningPath,
    updateLearningPath,
    deleteLearningPath
} from '../controllers/learningPathController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getAllPaths);
router.get('/my', authenticateToken, getMyPaths);
router.get('/:id', authenticateToken, getPathById);
router.post('/enroll', authenticateToken, enrollInPath);
router.post('/:id/nodes/:nodeId/complete', authenticateToken, completeNode);

// Admin Routes
router.post('/', authenticateToken, isAdmin, createLearningPath);
router.put('/:id', authenticateToken, isAdmin, updateLearningPath);
router.delete('/:id', authenticateToken, isAdmin, deleteLearningPath);

export default router;
