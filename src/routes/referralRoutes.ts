import express from 'express';
import { getReferralStats } from '../controllers/referralController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/stats', authenticateToken, getReferralStats);

export default router;
