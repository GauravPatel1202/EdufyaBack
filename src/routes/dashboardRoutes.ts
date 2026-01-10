import express from 'express';
import { getDashboardSummary } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/summary', authenticateToken, getDashboardSummary);

export default router;
