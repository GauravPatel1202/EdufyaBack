import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import LearningPath from '../models/LearningPath';
import User from '../models/User';
import connectDB from '../config/db';

dotenv.config({ path: path.join(__dirname, '../../.env') });

if (!process.env.MONGODB_URI) {
    const fs = require('fs');
    const envFile = path.join(__dirname, '../../.env');
    if (fs.existsSync(envFile)) {
        const lines = fs.readFileSync(envFile, 'utf8').split('\n');
        for (const line of lines) {
            const [key, value] = line.split('=');
            if (key && value) process.env[key.trim()] = value.trim();
        }
    }
}

console.log('Testing ENV:', process.env.MONGODB_URI ? 'LOADED' : 'MISSING');

const migrate = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to Database');

        // 1. Find an admin user to assign as default creator
        let admin = await User.findOne({ role: { $in: ['admin', 'superadmin'] } });
        
        if (!admin) {
            console.log('⚠️ No admin user found. Searching for any user...');
            admin = await User.findOne();
        }

        if (!admin) {
            console.error('❌ No users found in database. Please create a user first.');
            process.exit(1);
        }

        console.log(`👤 Using user ${admin.email} (${admin._id}) as default creator`);

        // 2. Update all learning paths that don't have a status or createdBy
        const result = await LearningPath.updateMany(
            { $or: [{ status: { $exists: false } }, { createdBy: { $exists: false } }] },
            { 
                $set: { 
                    status: 'published',
                    createdBy: admin._id 
                } 
            }
        );

        console.log(`✅ Migration complete! Updated ${result.modifiedCount} learning paths.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
