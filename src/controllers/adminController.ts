import { Request, Response } from 'express';
import User from '../models/User';
import AdminActivity from '../models/AdminActivity';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['student', 'admin', 'HR'].includes(role)) {
       return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get activity logs
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      adminId, 
      action, 
      resource, 
      startDate, 
      endDate 
    } = req.query;

    const query: any = {};
    
    if (adminId) query.adminId = adminId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AdminActivity.find(query)
        .populate('adminId', 'firstName lastName email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AdminActivity.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk delete users
export const bulkDeleteUsers = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array required' });
    }

    const result = await User.deleteMany({ _id: { $in: userIds } });

    // Log activity
    await AdminActivity.create({
      adminId: req.user?.id,
      action: 'delete',
      resource: 'user',
      details: {
        description: `Bulk deleted ${result.deletedCount} users`,
        metadata: { userIds }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent')
    });

    res.json({ message: `Successfully deleted ${result.deletedCount} users` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Export users to CSV
export const exportUsers = async (req: Request, res: Response) => {
  try {
    const { role, startDate, endDate } = req.query;

    const query: any = {};
    if (role) query.role = role;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const users = await User.find(query).select('-password');

    // Log activity
    await AdminActivity.create({
      adminId: req.user?.id,
      action: 'export',
      resource: 'user',
      details: {
        description: `Exported ${users.length} users`,
        metadata: { filters: query }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent')
    });

    res.json({ users, count: users.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Import users from CSV
export const importUsers = async (req: Request, res: Response) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Users array required' });
    }

    const result = await User.insertMany(users, { ordered: false });

    // Log activity
    await AdminActivity.create({
      adminId: req.user?.id,
      action: 'import',
      resource: 'user',
      details: {
        description: `Imported ${result.length} users`
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ message: `Successfully imported ${result.length} users` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Learning Path Content Management
import LearningPath from '../models/LearningPath';

export const updateNodeContent = async (req: Request, res: Response) => {
  try {
    const { pathId, nodeId } = req.params;
    const { videoUrl, isPremium, questions, interviewQuestions, industrialStandards } = req.body;

    const path = await LearningPath.findById(pathId);
    if (!path) return res.status(404).json({ message: 'Learning path not found' });

    const node = path.nodes.find((n: any) => n.id === nodeId);
    if (!node) return res.status(404).json({ message: 'Node not found' });

    // Update node data
    if (videoUrl !== undefined) node.data.videoUrl = videoUrl;
    if (isPremium !== undefined) node.data.isPremium = isPremium;
    if (questions) node.data.questions = questions;
    if (interviewQuestions) node.data.interviewQuestions = interviewQuestions;
    if (industrialStandards) node.data.industrialStandards = industrialStandards;

    await path.save();
    res.json({ message: 'Node content updated successfully', node });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkUpdateNodes = async (req: Request, res: Response) => {
  try {
    const { pathId } = req.params;
    const { nodes } = req.body; // Array of { nodeId, updates }

    const path = await LearningPath.findById(pathId);
    if (!path) return res.status(404).json({ message: 'Learning path not found' });

    for (const { nodeId, updates } of nodes) {
      const node = path.nodes.find((n: any) => n.id === nodeId);
      if (node) {
        Object.assign(node.data, updates);
      }
    }

    await path.save();
    res.json({ message: 'Nodes updated successfully', path });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
