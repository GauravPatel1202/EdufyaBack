import mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || '';

const createHR = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'hr@edufya.com';
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.role = 'HR';
      await existingUser.save();
      console.log(`Existing user ${email} promoted to HR.`);
    } else {
      const hashedPassword = await bcrypt.hash('hr123', 10);
      const hr = await User.create({
        firstName: 'Recruiter',
        lastName: 'One',
        email,
        password: hashedPassword,
        role: 'HR',
        activityLog: []
      });
      console.log(`New HR user created: ${hr.email}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

createHR();
