import express from 'express';
import { getAllPaths, getPathById, enrollInPath, getMyPaths, completeNode } from '../controllers/learningPathController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getAllPaths);
router.get('/my', authenticateToken, getMyPaths);
router.get('/:id', authenticateToken, getPathById);
router.post('/:id/enroll', authenticateToken, enrollInPath);
router.post('/:id/nodes/:nodeId/complete', authenticateToken, completeNode);

export default router;
