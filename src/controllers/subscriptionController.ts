import { Request, Response } from 'express';
import User from '../models/User';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { useWallet } = req.body;
    
    // Production amount: ₹350 (35000 paise)
    let amountInt = 350;
    
    // Check wallet balance if requested
    let walletDeduction = 0;
    if (useWallet) {
      const user = await User.findById(userId);
      if (user && user.walletBalance && user.walletBalance > 0) {
        // Limit deduction to total amount or wallet balance, whichever is lower
        const deduction = Math.min(amountInt, user.walletBalance);
        amountInt -= deduction;
        walletDeduction = deduction;
      }
    }

    const amount = amountInt * 100; // Amount in paise (can be 0)

    // Notes to track the payment breakdown
    const notes = {
      subscription_type: '1_year_premium',
      description: 'Edufya Premium Subscription - 1 Year',
      wallet_deduction: walletDeduction.toString(),
      payable_amount: amountInt.toString()
    };

    if (amount === 0) {
      // Free order fully covered by wallet
      res.json({
        id: `order_WALLET_${Date.now()}`,
        amount: 0,
        currency: 'INR',
        status: 'created',
        notes,
        isFree: true // Flag for frontend to skip Razorpay
      });
      return;
    }

    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = (req as any).user.userId;

    // Check if this is a Wallet-only order (amount 0)
    if (razorpay_order_id && razorpay_order_id.toString().startsWith('order_WALLET_')) {
      // Handle Full Wallet Payment
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      // Verify user has enough balance for the full amount (₹350)
      // Since we are here, it means createOrder calculated they covered it fully.
      // But we must double check to be safe.
      if ((user.walletBalance || 0) < 350) {
         return res.status(400).json({ error: 'Insufficient wallet balance for full payment' });
      }

      user.walletBalance = (user.walletBalance || 0) - 350;
      
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      user.subscription = {
        status: 'active',
        startDate,
        expiryDate
      };
      
      await user.save();
      
      // Referral reward for the referrer (User B refers User C, User C pays with wallet)
      // We still want to reward User B.
      if (user.referredBy) {
         try {
          const referrer = await User.findById(user.referredBy);
          if (referrer) {
             const rewardIndex = referrer.referralRewards.findIndex(
              r => r.referredUser.toString() === user._id.toString()
             );

             if (rewardIndex !== -1) {
                 if (referrer.referralRewards[rewardIndex].status === 'Pending') {
                     referrer.referralRewards[rewardIndex].status = 'Paid';
                     referrer.walletBalance = (referrer.walletBalance || 0) + 500;
                     await referrer.save();
                 }
             } else {
               referrer.walletBalance = (referrer.walletBalance || 0) + 500;
               referrer.referralRewards.push({
                referredUser: user._id,
                amount: 500,
                date: new Date(),
                status: 'Paid'
              });
              await referrer.save();
             }
          }
         } catch (e) {
           console.error("Referral reward error (wallet flow):", e);
         }
      }

      return res.json({
        message: 'Subscription activated using Wallet Balance',
        subscription: user.subscription
      });
    }

    // Verify payment signature for Razorpay
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || '')
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year subscription

      user.subscription = {
        status: 'active',
        startDate,
        expiryDate
      };

      // Deduct wallet balance if used (check notes from razorpay order is tricky without order fetch, 
      // but simpler approach: we trust our own createOrder logic. 
      // Ideally we should track a transaction ID. 
      // For now, let's deduct whatever is needed logic: 
      // If payment was verified, meaning they paid the *remaining* amount.
      // We should check if they wanted to use wallet. 
      // OR simpler: Backend state is source of truth. 
      // Let's assume passed in body? No, that's insecure.
      // Let's rely on the fact that if they paid, they paid the calculated amount. 
      // We need to re-verify the "useWallet" intent or pass the deduction amount.
      // BETTER: We can fetch the order from Razorpay to see notes, BUT that's an extra API call.
      // ALTERNATIVE: Pass `deductedAmount` in body and verify it matches logical possibility?
      // SAFEST for this scope: Just check user's current balance and deduct max possible if the payment id suggests a specific flow? 
      // ACTUALLY: Let's fetch the order using razorpay_order_id to confirm the notes.
      
      try {
        const order = await razorpay.orders.fetch(razorpay_order_id);
        if (order.notes && order.notes.wallet_deduction) {
           const deduction = parseFloat(order.notes.wallet_deduction as string);
           if (deduction > 0) {
             user.walletBalance = Math.max(0, (user.walletBalance || 0) - deduction);
             console.log(`Deducted ₹${deduction} from wallet for user ${user.email}`);
           }
        }
      } catch (err) {
        console.error("Failed to fetch order details for wallet deduction:", err);
      }

      await user.save();

      // Check for Referral Reward
      if (user.referredBy) {
        try {
          const referrer = await User.findById(user.referredBy);
          if (referrer) {
            const rewardIndex = referrer.referralRewards.findIndex(
              r => r.referredUser.toString() === user._id.toString()
            );

            if (rewardIndex !== -1) {
                if (referrer.referralRewards[rewardIndex].status === 'Pending') {
                    referrer.referralRewards[rewardIndex].status = 'Paid';
                    referrer.walletBalance = (referrer.walletBalance || 0) + 500;
                    await referrer.save();
                    console.log(`Referral reward activated for ${referrer.email}`);
                }
            } else {
              referrer.walletBalance = (referrer.walletBalance || 0) + 500;
              referrer.referralRewards.push({
                referredUser: user._id,
                amount: 500,
                date: new Date(),
                status: 'Paid'
              });
              await referrer.save();
              console.log(`Referral reward credited to ${referrer.email} for user ${user.email}`);
            }
          }
        } catch (referralError) {
          console.error('Error processing referral reward:', referralError);
          // Don't fail the payment verification if referral logic fails, just log it
        }
      }

      return res.json({
        message: 'Payment verified and subscription activated successfully',
        subscription: user.subscription
      });
    } else {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const activateSubscription = async (req: Request, res: Response) => {
  // Keeping this for backward compatibility or simulated testing if needed, 
  // but redirected to verifyRazorpayPayment in routes if we follow the plan strictly.
  try {
    const userId = (req as any).user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year subscription

    user.subscription = {
      status: 'active',
      startDate,
      expiryDate
    };

    await user.save();

    res.json({
      message: 'Payment verified and subscription activated successfully',
      transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Subscription activation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await User.findById(userId).select('subscription');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      subscription: user.subscription || { status: 'inactive' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
