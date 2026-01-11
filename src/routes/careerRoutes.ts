import { Router } from 'express';
import * as careerController from '../controllers/careerController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/roles', careerController.getAllJobRoles);
router.get('/roles/:id', careerController.getJobRoleById);
router.post('/set-target', authMiddleware, careerController.setTargetRole);
router.get('/stats', authMiddleware, careerController.getCareerStats);
// HR Routes
router.post('/roles', authMiddleware, careerController.createJobRole);
router.delete('/roles/:id', authMiddleware, careerController.deleteJobRole);
router.get('/roles/:id/applicants', authMiddleware, careerController.getJobApplicants);

router.post('/apply', authMiddleware, careerController.applyForJob);

export default router;
