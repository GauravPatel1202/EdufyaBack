import { Request, Response } from 'express';
import ContentLibrary from '../models/ContentLibrary';
import AdminActivity from '../models/AdminActivity';

// Get all content with pagination and filters
export const getAllContent = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      category, 
      tags, 
      search 
    } = req.query;

    const query: any = {};
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (tags) query.tags = { $in: (tags as string).split(',') };
    if (search) {
      query.$text = { $search: search as string };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [content, total] = await Promise.all([
      ContentLibrary.find(query)
        .populate('uploadedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ContentLibrary.countDocuments(query)
    ]);

    res.json({
      content,
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

// Upload new content
export const uploadContent = async (req: Request, res: Response) => {
  try {
    const contentData = {
      ...req.body,
      uploadedBy: req.user?.id
    };

    const content = await ContentLibrary.create(contentData);

    // Log activity
    await AdminActivity.create({
      adminId: req.user?.id,
      action: 'create',
      resource: 'content',
      resourceId: content._id.toString(),
      details: {
        description: `Uploaded ${content.type}: ${content.title}`
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ message: 'Content uploaded successfully', content });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update content
export const updateContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const content = await ContentLibrary.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Log activity
    await AdminActivity.create({
      adminId: req.user?.id,
      action: 'update',
      resource: 'content',
      resourceId: id,
      details: {
        description: `Updated ${content.type}: ${content.title}`,
        changes: updates
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'Content updated successfully', content });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete content
export const deleteContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const content = await ContentLibrary.findByIdAndDelete(id);

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Log activity
    await AdminActivity.create({
      adminId: req.user?.id,
      action: 'delete',
      resource: 'content',
      resourceId: id,
      details: {
        description: `Deleted ${content.type}: ${content.title}`
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'Content deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk upload content
export const bulkUpload = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array required' });
    }

    const contentItems = items.map(item => ({
      ...item,
      uploadedBy: req.user?.id
    }));

    const content = await ContentLibrary.insertMany(contentItems);

    // Log activity
    await AdminActivity.create({
      adminId: req.user?.id,
      action: 'create',
      resource: 'content',
      details: {
        description: `Bulk uploaded ${content.length} items`
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ 
      message: `Successfully uploaded ${content.length} items`, 
      content 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get content statistics
export const getContentStats = async (req: Request, res: Response) => {
  try {
    const [totalContent, byType, byCategory, topUsed] = await Promise.all([
      ContentLibrary.countDocuments(),
      ContentLibrary.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      ContentLibrary.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      ContentLibrary.find().sort({ usageCount: -1 }).limit(10)
    ]);

    res.json({
      totalContent,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topUsed
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
