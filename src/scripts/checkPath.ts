import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
const backPath = '/Users/gaurav/Desktop/edufyaAi/EdufyaBack';
const envPath = path.join(backPath, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const MONGODB_URI = process.env.MONGODB_URI;

const LearningPathSchema = new mongoose.Schema({
    title: String,
    status: String,
    createdBy: mongoose.Schema.Types.ObjectId,
    nodes: Array,
    edges: Array
}, { strict: false });

const LearningPath = mongoose.model('LearningPath', LearningPathSchema);

const checkPath = async () => {
    const targetId = '6968fa9050f13940ef7a6373';
    try {
        await mongoose.connect(MONGODB_URI!);
        console.log('Connected to DB');

        const path = await LearningPath.findById(targetId);
        if (!path) {
            console.log('PATH NOT FOUND');
        } else {
            console.log('PATH FOUND:');
            console.log(JSON.stringify({
                id: path._id,
                title: path.title,
                status: path.status,
                nodeCount: path.nodes?.length,
                edgeCount: path.edges?.length,
                createdBy: path.createdBy
            }, null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
};

checkPath();
