import { Request, Response } from 'express';
import LearningPath from '../models/LearningPath';
import UserLearningProgress from '../models/UserLearningProgress';
import User from '../models/User';

export const getAllPaths = async (req: Request, res: Response) => {
  try {
    const paths = await LearningPath.find().select('title description difficulty estimatedDuration tags difficulty nodes');
    res.json({ paths });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPathById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const path = await LearningPath.findById(id);
    if (!path) {
      return res.status(404).json({ error: 'Learning path not found' });
    }
    res.json(path);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const enrollInPath = async (req: Request, res: Response) => {
  try {
    const { learningPathId } = req.body;
    const userId = (req as any).user.userId;

    // Check if already enrolled
    let progress = await UserLearningProgress.findOne({ userId, learningPathId });
    if (progress) {
        return res.json({ message: 'Already enrolled', progress });
    }

    progress = await UserLearningProgress.create({
        userId,
        learningPathId,
        enrolledAt: new Date(),
        completedNodes: [],
        completionPercentage: 0
    });

    res.json({ message: 'Enrolled successfully', progress });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyPaths = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const progresses = await UserLearningProgress.find({ userId }).populate('learningPathId');
    
    // Transform to match frontend expected structure
    const paths = progresses
      .filter(p => p && p.learningPathId) // Ensure path doc exists
      .map(p => {
        try {
            const pathDoc = p.learningPathId as any;
            if (!pathDoc || !pathDoc._id) return null;
            
            return {
                ...p.toObject(),
                path: pathDoc,
                learningPathId: pathDoc._id
            };
        } catch (e) {
            return null;
        }
    })
    .filter(p => p !== null);

    res.json({ paths });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const completeNode = async (req: Request, res: Response) => {
    try {
        const { id: learningPathId, nodeId } = req.params;
        const userId = (req as any).user.userId;
        
        // Find progress
        let progress = await UserLearningProgress.findOne({ userId, learningPathId });
        if (!progress) {
             return res.status(404).json({ error: 'Not enrolled in this path' });
        }

        // Add node if not exists
        if (!progress.completedNodes.includes(nodeId)) {
            progress.completedNodes.push(nodeId);
            
            // Recalculate percentage
            const path = await LearningPath.findById(learningPathId);
            if (path && path.nodes && path.nodes.length > 0) {
                const total = path.nodes.length;
                const completed = progress.completedNodes.length;
                progress.completionPercentage = Math.round((completed / total) * 100);
            }
            
            progress.lastAccessedAt = new Date();
            await progress.save();

            // Update user activity log
            const dateStr = new Date().toISOString().split('T')[0];
            const user = await User.findById(userId);
            if (user) {
                const logEntry = user.activityLog.find((l: any) => l.date === dateStr);
                if (logEntry) {
                    logEntry.count += 1;
                } else {
                    user.activityLog.push({ date: dateStr, count: 1 });
                }
                await user.save();
            }
        }
        
        res.json({ message: 'Node marked as complete', nodeId, progress });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateProgress = async (req: Request, res: Response) => {
    try {
        const { learningPathId, courseId, timeSpent } = req.body;
        const userId = (req as any).user.userId;

        let progress = await UserLearningProgress.findOne({ userId, learningPathId });
        
        if (!progress) {
             return res.status(404).json({ error: 'Not enrolled in this path' });
        }

        if (timeSpent) {
            progress.totalTimeSpent = (progress.totalTimeSpent || 0) + timeSpent;
        }

        progress.lastAccessedAt = new Date();
        await progress.save();

        res.json({ message: 'Progress updated', progress });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Admin Controllers
export const createLearningPath = async (req: Request, res: Response) => {
  try {
    // Sanitize body: remove _id if it's an empty string
    if (req.body._id === '') {
      delete req.body._id;
    }
    const path = await LearningPath.create(req.body);
    res.status(201).json(path);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateLearningPath = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const path = await LearningPath.findByIdAndUpdate(id, req.body, { new: true });
    if (!path) return res.status(404).json({ error: 'Learning path not found' });
    res.json(path);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteLearningPath = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const path = await LearningPath.findByIdAndDelete(id);
    if (!path) return res.status(404).json({ error: 'Learning path not found' });
    res.json({ message: 'Learning path deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
