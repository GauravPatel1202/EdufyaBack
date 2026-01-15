import { Router } from 'express';
import * as careerController from '../controllers/careerController';
import { authMiddleware } from '../middleware/auth';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/roles', careerController.getAllJobRoles);
router.get('/roles/:id', careerController.getJobRoleById);
router.post('/set-target', authMiddleware, careerController.setTargetRole);
router.get('/stats', authMiddleware, careerController.getCareerStats);
// HR Routes
router.post('/roles', authMiddleware, careerController.createJobRole);
router.delete('/roles/:id', authMiddleware, careerController.deleteJobRole);
router.get('/roles/:id/applicants', authMiddleware, careerController.getJobApplicants);

// Interview Routes
router.post('/interview/start', authMiddleware, careerController.startInterview);
router.post('/interview/chat', authMiddleware, careerController.chatInterview);
router.post('/interview/analyze', authMiddleware, careerController.analyzeInterviewResult);
router.post('/ats-score', authMiddleware, careerController.getATSScore);
router.post('/ats-score-file', authMiddleware, upload.single('resume'), careerController.getATSScoreFromFile);

router.post('/extract-job', authMiddleware, careerController.extractJobFromUrl);
router.post('/apply', authMiddleware, careerController.applyForJob);

export default router;
