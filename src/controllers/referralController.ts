import { Request, Response } from 'express';
import User from '../models/User';

export const getReferralStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await User.findById(userId)
      .populate('referralRewards.referredUser', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = {
      referralCode: user.referralCode,
      walletBalance: user.walletBalance,
      referralRewards: user.referralRewards.map(reward => ({
        referredUser: reward.referredUser, // This will have details due to populate
        amount: reward.amount,
        date: reward.date,
        status: reward.status
      })),
      totalReferrals: user.referralRewards.length,
      totalEarnings: user.referralRewards.reduce((acc, curr) => acc + curr.amount, 0)
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
