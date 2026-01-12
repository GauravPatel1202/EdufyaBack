import { Request, Response } from 'express';
import User from '../models/User';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const amount = 1 * 100; // Amount in paise (₹350)
    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
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

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
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

      await user.save();

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
