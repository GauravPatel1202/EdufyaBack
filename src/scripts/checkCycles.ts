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

const LearningPathSchema = new mongoose.Schema({
    nodes: Array,
    edges: Array
}, { strict: false });

const LearningPath = mongoose.model('LearningPath', LearningPathSchema);

const detectCycle = (edges: any[]) => {
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push(edge.target);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
        if (recStack.has(node)) return true;
        if (visited.has(node)) return false;

        visited.add(node);
        recStack.add(node);

        const neighbors = adj.get(node) || [];
        for (const neighbor of neighbors) {
            if (hasCycle(neighbor)) return true;
        }

        recStack.delete(node);
        return false;
    }

    for (const node of adj.keys()) {
        if (hasCycle(node)) return true;
    }
    return false;
};

const checkCycles = async () => {
    const targetId = '6968fa9050f13940ef7a6373';
    try {
        await mongoose.connect(MONGODB_URI!);
        const path: any = await LearningPath.findById(targetId);
        if (!path) {
            console.log('Path not found');
            return;
        }

        console.log(`Checking path: ${path.title}`);
        console.log(`Nodes: ${path.nodes?.length}, Edges: ${path.edges?.length}`);

        const cycle = detectCycle(path.edges || []);
        console.log(`HAS CYCLE: ${cycle}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
};

checkCycles();
