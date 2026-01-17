import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { emailService } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_for_dev';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Handle Referral Code lookup
    let referrer = null;
    let referredByUserId = undefined;

    if (req.body.referralCode) {
      referrer = await User.findOne({ referralCode: req.body.referralCode });
      if (referrer) {
        referredByUserId = referrer._id;
      }
    }

    // Generate Referral Code for New User
    // Pattern: First 4 chars of name + 4 random numbers
    const baseCode = (firstName || 'USER').substring(0, 4).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newReferralCode = `${baseCode}${randomNum}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'student',
      referralCode: newReferralCode,
      referredBy: referredByUserId,
      walletBalance: 200, // Signup Bonus (200 Coins)
      // Subscription will be inactive by default
    });

    await newUser.save();

    // Create Pending Reward for Referrer if one exists
    if (referrer) {
        try {
            // Add pending reward - wallet is NOT credited yet
            referrer.referralRewards.push({
                referredUser: newUser._id as any, 
                amount: 500,
                date: new Date(),
                status: 'Pending'
            });
            await referrer.save();
        } catch (rewardError) {
            console.error("Failed to create pending reward:", rewardError);
        }
    }

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(newUser.email, newUser.firstName).catch(err => 
      console.error('Failed to send welcome email:', err)
    );

    // Generate token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        subscription: newUser.subscription,
        walletBalance: newUser.walletBalance || 0,
        totalEarnings: newUser.referralRewards ? newUser.referralRewards.reduce((acc, curr) => acc + curr.amount, 0) : 0,
        referralCode: newUser.referralCode
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }


    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subscription: user.subscription,
        walletBalance: user.walletBalance || 0,
        totalEarnings: user.referralRewards ? user.referralRewards.reduce((acc: number, curr: any) => acc + curr.amount, 0) : 0,
        referralCode: user.referralCode
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      valid: true, 
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subscription: user.subscription,
        walletBalance: user.walletBalance || 0,
        totalEarnings: user.referralRewards ? user.referralRewards.reduce((acc: number, curr: any) => acc + curr.amount, 0) : 0,
        referralCode: user.referralCode
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 10 minutes
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = expiry;
    await user.save();

    // Send OTP via email service
    await emailService.sendOTP(email, otp);

    res.json({ message: 'OTP sent to your email' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ 
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: new Date() } // Check if expiry is in the future
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
