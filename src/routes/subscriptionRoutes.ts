import express from 'express';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  getSubscriptionStatus,
  activateSubscription 
} from '../controllers/subscriptionController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/status', authenticateToken, getSubscriptionStatus);
router.post('/create-order', authenticateToken, createRazorpayOrder);
router.post('/verify-payment', authenticateToken, verifyRazorpayPayment);
router.post('/activate', authenticateToken, activateSubscription); // Keeping for simulation if needed

export default router;
