import express from 'express';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  getSubscriptionStatus
} from '../controllers/subscriptionController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/status', authenticateToken, getSubscriptionStatus);
router.post('/create-order', authenticateToken, createRazorpayOrder);
router.post('/verify-payment', authenticateToken, verifyRazorpayPayment);
// REMOVED: /activate endpoint - subscriptions can only be activated through payment verification

export default router;
