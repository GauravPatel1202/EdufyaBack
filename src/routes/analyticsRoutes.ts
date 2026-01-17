import express from 'express';
import * as analyticsController from '../controllers/analyticsController';

const router = express.Router();

// Public route for tracking visitors
router.post('/track-visitor', analyticsController.trackVisitor);

export default router;
