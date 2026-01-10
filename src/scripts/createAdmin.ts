import mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://edufyai:abcdefg@cluster0.fzjmokw.mongodb.net/edufya?retryWrites=true&w=majority&appName=Cluster0';

const createAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'admin@edufya.com';
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`Existing user ${email} promoted to admin.`);
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = await User.create({
        firstName: 'Super',
        lastName: 'Admin',
        email,
        password: hashedPassword,
        role: 'admin',
        activityLog: []
      });
      console.log(`New admin user created: ${admin.email}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

createAdmin();
