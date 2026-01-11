import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.userId) {
       return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userPayload.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Admins bypass subscription checks
    if (user.role === 'admin') {
      return next();
    }

    const now = new Date();
    if (
      user.subscription && 
      user.subscription.status === 'active' && 
      user.subscription.expiryDate && 
      new Date(user.subscription.expiryDate) > now
    ) {
      return next();
    } 
    
    return res.status(403).json({ 
      error: 'Subscription required',
      message: 'This feature requires an active subscription. Please subscribe to access learning paths.',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ error: 'Internal server error during subscription verification' });
  }
};
