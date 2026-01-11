import express from 'express';
import { activateSubscription, getSubscriptionStatus } from '../controllers/subscriptionController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/status', authenticateToken, getSubscriptionStatus);
router.post('/activate', authenticateToken, activateSubscription);

export default router;
