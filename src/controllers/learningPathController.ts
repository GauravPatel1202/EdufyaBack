import { Request, Response } from 'express';
import LearningPath from '../models/LearningPath';
import UserLearningProgress from '../models/UserLearningProgress';
import User from '../models/User';

export const getAllPaths = async (req: Request, res: Response) => {
  try {
    const { search, category, difficulty, sort, page = 1, limit = 10 } = req.query;
    const userRole = (req as any).user?.role;
    
    // Build Query
    const query: any = {};

    // Default: Only show published paths
    query.status = 'published';

    // Allow admins to override if they explicitly provide a status
    if ((userRole === 'admin' || userRole === 'superadmin') && req.query.status) {
      if (req.query.status === 'all') {
        delete query.status; // Admins can see everything if they ask for 'all'
      } else {
        query.status = req.query.status;
      }
    }
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }
    if (category && category !== 'All') query.category = category;
    
    // Difficulty Safeguard: ignore if "all" or literal "undefined"
    if (difficulty && difficulty !== 'all' && difficulty !== 'undefined') {
        query.difficulty = difficulty;
    }

    // Featured Filter
    if (req.query.isFeatured === 'true') {
        query.isFeatured = true;
    }

    // Sorting Logic
    let sortOptions: any = { createdAt: -1 }; // Default: Newest
    if (sort === 'oldest') sortOptions = { createdAt: 1 };
    else if (sort === 'popular') sortOptions = { 'studentCount': -1 }; // Assuming studentCount exists or similar
    else if (sort === 'duration_asc') sortOptions = { estimatedDuration: 1 };
    else if (sort === 'duration_desc') sortOptions = { estimatedDuration: -1 };
    else if (sort === 'alpha') sortOptions = { title: 1 };

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await LearningPath.countDocuments(query);
    const paths = await LearningPath.find(query)
        .select('title description difficulty estimatedDuration tags category nodes thumbnail status')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum);
        
    res.json({ 
        paths,
        pagination: {
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            hasMore: skip + paths.length < total
        }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPathById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    
    const path = await LearningPath.findById(id);
    if (!path) {
      return res.status(404).json({ error: 'Learning path not found' });
    }

    // Only allow access to non-published paths for admins or creators
    if (path.status !== 'published' && userRole !== 'admin' && userRole !== 'superadmin' && path.createdBy?.toString() !== userId) {
      return res.status(403).json({ error: 'This learning path is under review or not published.' });
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

export const unenrollFromPath = async (req: Request, res: Response) => {
  try {
    const { learningPathId } = req.body;
    const userId = (req as any).user.userId;

    const progress = await UserLearningProgress.findOneAndDelete({ userId, learningPathId });
    if (!progress) {
        return res.status(404).json({ message: 'Not enrolled in this path' });
    }

    res.json({ message: 'Unenrolled successfully' });
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
    
    const userId = (req as any).user.userId;
    const pathData = {
      ...req.body,
      createdBy: userId,
      status: 'pending' // Force pending status on creation
    };

    const path = await LearningPath.create(pathData);
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

export const reviewLearningPath = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['published', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use "published", "rejected", or "pending".' });
    }

    const updateData: any = { status };
    if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason || 'No reason provided';
    } else {
      updateData.rejectionReason = ''; // Clear reason if published or pending
    }

    const path = await LearningPath.findByIdAndUpdate(id, updateData, { new: true });
    if (!path) return res.status(404).json({ error: 'Learning path not found' });
    
    res.json({ message: `Learning path ${status} successfully`, path });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleFeatured = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const path = await LearningPath.findById(id);
    if (!path) return res.status(404).json({ error: 'Learning path not found' });

    path.isFeatured = !path.isFeatured;
    await path.save();

    res.json({ 
      message: `Path ${path.isFeatured ? 'added to' : 'removed from'} featured`, 
      isFeatured: path.isFeatured 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

