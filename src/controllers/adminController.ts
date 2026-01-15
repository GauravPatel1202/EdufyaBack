import { scraperService } from '../services/scraperService';
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

    if (!['student', 'admin', 'HR', 'suspended'].includes(role)) {
       return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete individual user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent deleting admin users (optional safety check)
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(userId);

    // Log activity (only if adminId is available)
    if (req.user?.id) {
      await AdminActivity.create({
        adminId: req.user.id,
        action: 'delete',
        resource: 'user',
        resourceId: userId,
        details: {
          description: `Deleted user: ${user.firstName} ${user.lastName} (${user.email})`,
          metadata: { userId, userEmail: user.email, userRole: user.role }
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent')
      });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update user subscription status
export const updateUserSubscription = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'cancelled', 'expired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid subscription status' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update subscription status
    if (!user.subscription) {
      user.subscription = {
        status: status as 'active' | 'inactive',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      };
    } else {
      user.subscription.status = status as 'active' | 'inactive';
      if (status === 'active' && !user.subscription.startDate) {
        user.subscription.startDate = new Date();
        user.subscription.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
    }

    await user.save();

    // Log activity (only if adminId is available)
    if (req.user?.id) {
      await AdminActivity.create({
        adminId: req.user.id,
        action: 'update',
        resource: 'user',
        resourceId: userId,
        details: {
          description: `Updated subscription status for ${user.firstName} ${user.lastName} to ${status}`,
          metadata: { userId, newStatus: status, previousStatus: user.subscription?.status }
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent')
      });
    }

    res.json({ 
      message: 'Subscription updated successfully', 
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        subscription: user.subscription
      }
    });
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

    // Log activity (only if adminId is available)
    if (req.user?.id) {
      await AdminActivity.create({
        adminId: req.user.id,
        action: 'delete',
        resource: 'user',
        details: {
          description: `Bulk deleted ${result.deletedCount} users`,
          metadata: { userIds }
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent')
      });
    }

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

    // Log activity (only if adminId is available)
    if (req.user?.id) {
      await AdminActivity.create({
        adminId: req.user.id,
        action: 'export',
        resource: 'user',
        details: {
          description: `Exported ${users.length} users`,
          metadata: { filters: query }
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent')
      });
    }

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

    // Log activity (only if adminId is available)
    if (req.user?.id) {
      await AdminActivity.create({
        adminId: req.user.id,
        action: 'import',
        resource: 'user',
        details: {
          description: `Imported ${result.length} users`
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent')
      });
    }

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

// Job Role Management
import JobRole from '../models/JobRole';
import PlatformSettings from '../models/PlatformSettings';

export const getAdminJobs = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (status && status !== 'All') filter.status = status;

    // RESTRICT HR TO OWN JOBS
    const user = (req as any).user;
    if (user && user.role === 'HR') {
        filter.postedBy = user.userId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [jobs, total] = await Promise.all([
      JobRole.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('postedBy', 'firstName lastName email'),
      JobRole.countDocuments(filter)
    ]);

    // Also fetch settings to return current auto-approve state
    const settings = await PlatformSettings.findOne();

    res.json({
      jobs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      settings: {
        autoApproveJobs: settings?.jobBoardSettings?.autoApproveJobs || false
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJobStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Open', 'Closed', 'Draft', 'Pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const job = await JobRole.findByIdAndUpdate(id, { status }, { new: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJobBoardSettings = async (req: Request, res: Response) => {
  try {
    const { autoApproveJobs } = req.body;
    
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings({ jobBoardSettings: { autoApproveJobs } });
    } else {
      if (!settings.jobBoardSettings) settings.jobBoardSettings = { autoApproveJobs: false };
      settings.jobBoardSettings.autoApproveJobs = autoApproveJobs;
    }
    
    await settings.save();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkImportJobs = async (req: Request, res: Response) => {
  try {
    const { urls, useAI = true } = req.body;
    const userId = (req as any).user.userId;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ message: 'URLs array is required' });
    }

    // Filter out empty strings
    const validUrls = urls.filter(u => u && u.trim().length > 0);

    const result = await scraperService.addToQueue(validUrls, userId, useAI);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getImportQueueStatus = async (req: Request, res: Response) => {
  try {
    const status = await scraperService.getQueueStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const runScraper = async (req: Request, res: Response) => {
  try {
    const result = await scraperService.processQueue();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const retryFailedImports = async (req: Request, res: Response) => {
    try {
        const result = await scraperService.retryFailed();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to retry imports" });
    }
};

export const reScrapeItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await scraperService.reScrapeItem(id);
        res.json({ message: "Item queued for re-scraping" });
    } catch (error) {
        res.status(500).json({ message: "Failed to re-scrape item" });
    }
};
