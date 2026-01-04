import { Router } from 'express';
import * as careerController from '../controllers/careerController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/roles', careerController.getAllJobRoles);
router.post('/set-target', authMiddleware, careerController.setTargetRole);
router.get('/stats', authMiddleware, careerController.getCareerStats);

export default router;
