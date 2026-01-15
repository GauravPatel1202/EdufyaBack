import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const backPath = '/Users/gaurav/Desktop/edufyaAi/EdufyaBack';
const envPath = path.join(backPath, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const MONGODB_URI = process.env.MONGODB_URI;

const User = mongoose.model('User', new mongoose.Schema({ role: String }, { strict: false }));

const checkCreator = async () => {
    try {
        await mongoose.connect(MONGODB_URI!);
        const user = await User.findById('695d677cd1a329c63894e088');
        console.log('CREATOR STATUS:');
        console.log(JSON.stringify(user, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
};

checkCreator();
