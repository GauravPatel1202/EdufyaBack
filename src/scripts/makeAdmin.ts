import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://edufyai:abcdefg@cluster0.fzjmokw.mongodb.net/edufya?retryWrites=true&w=majority&appName=Cluster0';

const makeAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'admin@edufya.com'; // Or any specific email the user wants
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true, upsert: false }
    );

    if (user) {
      console.log(`User ${user.email} is now an admin.`);
    } else {
      console.log('User not found. Please create the user first or change the email in this script.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

makeAdmin();
