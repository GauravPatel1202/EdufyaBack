import { Request, Response } from 'express';
import PlatformSettings from '../models/PlatformSettings';
import AdminActivity from '../models/AdminActivity';

// Get all platform settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await PlatformSettings.findOne();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await PlatformSettings.create({
        siteName: 'Edufya',
        primaryColor: '#6366f1',
        secondaryColor: '#a855f7',
        updatedBy: req.user?.id,
        plans: [
            {
              id: '1',
              name: 'Basic Student',
              price: 0,
              interval: 'Free Forever',
              features: ['Access to Free Courses', 'Basic Community Support', 'Limited Practice Tests']
            },
            {
              id: '2',
              name: 'Pro Scholar',
              price: 350,
              interval: 'per year',
              features: ['Unlimited Learning Paths', 'AI Tutor Access', 'Certificate of Completion', 'Priority Support'],
              popular: true
            },
            {
              id: '3',
              name: 'Career Plus',
              price: 999,
              interval: 'lifetime',
              features: ['1-on-1 Mentorship', 'Job Placement Assist', 'Resume Review', 'All Pro Features']
            }
        ],
        announcement: {
            message: "Big update coming next week! Mastery scores are being recalibrated.",
            enabled: true
        }
      });
    }

    // Don't send sensitive data to frontend
    const settingsObj = settings.toObject();
    const sanitized: any = { ...settingsObj };
    
    if (sanitized.emailSettings) {
      const { smtpPassword, ...emailSettings } = sanitized.emailSettings;
      sanitized.emailSettings = emailSettings;
    }
    
    if (sanitized.paymentGateway) {
      const { secretKey, webhookSecret, ...paymentGateway } = sanitized.paymentGateway;
      sanitized.paymentGateway = paymentGateway;
    }

    res.json(sanitized);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update platform settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const adminId = req.user?.id;

    let settings = await PlatformSettings.findOne();
    
    if (!settings) {
      settings = new PlatformSettings(updates);
    } else {
      Object.assign(settings, updates);
    }

    if (adminId) settings.updatedBy = adminId as any;
    settings.updatedAt = new Date();
    
    await settings.save();

    // Log activity (only if adminId is available)
    if (adminId) {
      await AdminActivity.create({
        adminId,
        action: 'update',
        resource: 'settings',
        details: {
          description: 'Updated platform settings',
          changes: updates
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent')
      });
    }

    // Sanitize response
    const settingsObj = settings.toObject();
    const sanitized: any = { ...settingsObj };
    
    if (sanitized.emailSettings) {
      const { smtpPassword, ...emailSettings } = sanitized.emailSettings;
      sanitized.emailSettings = emailSettings;
    }
    
    if (sanitized.paymentGateway) {
      const { secretKey, webhookSecret, ...paymentGateway } = sanitized.paymentGateway;
      sanitized.paymentGateway = paymentGateway;
    }

    res.json({ message: 'Settings updated successfully', settings: sanitized });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Create backup of settings
export const createBackup = async (req: Request, res: Response) => {
  try {
    const settings = await PlatformSettings.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: 'No settings found' });
    }

    const backup = {
      timestamp: new Date().toISOString(),
      settings: settings.toObject()
    };

    // Log activity (only if adminId is available)
    if (req.user?.id) {
      await AdminActivity.create({
        adminId: req.user.id,
        action: 'export',
        resource: 'settings',
        details: {
          description: 'Created settings backup'
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent')
      });
    }

    res.json(backup);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Restore settings from backup
export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { settings: backupSettings } = req.body;
    
    if (!backupSettings) {
      return res.status(400).json({ message: 'Backup data required' });
    }

    const settings = await PlatformSettings.findOne();
    
    if (settings) {
      Object.assign(settings, backupSettings);
      if (req.user?.id) settings.updatedBy = req.user.id as any;
      settings.updatedAt = new Date();
      await settings.save();
    } else {
      await PlatformSettings.create({
        ...backupSettings,
        updatedBy: req.user?.id
      });
    }

    // Log activity (only if adminId is available)
    if (req.user?.id) {
      await AdminActivity.create({
        adminId: req.user.id,
        action: 'import',
        resource: 'settings',
        details: {
          description: 'Restored settings from backup'
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent')
      });
    }

    res.json({ message: 'Settings restored successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
