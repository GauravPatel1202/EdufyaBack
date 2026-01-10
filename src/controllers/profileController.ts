import { Request, Response } from 'express';
import User from '../models/User';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Explicitly select profile fields to ensure they are returned
    const profileData = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      title: user.title || '',
      bio: user.bio || '',
      phoneNumber: user.phoneNumber || '',
      location: user.location || '',
      skills: Array.from(user.skillProficiency?.keys() || []), // Convert map keys to array for frontend
      experience: user.experience || [],
      education: user.education || [],
      socialLinks: user.socialLinks || {},
      resumeUrl: user.resumeUrl || '',
      activityLog: user.activityLog || []
    };

    res.json(profileData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const updates = req.body;

    // Separate skills from other updates since it's a Map on backend
    const { skills, ...otherUpdates } = updates;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update basic text fields
    Object.keys(otherUpdates).forEach((key) => {
      // Allow updating top-level fields defined in schema
      if (['firstName', 'lastName', 'title', 'bio', 'phoneNumber', 'location', 'resumeUrl', 'socialLinks', 'experience', 'education'].includes(key)) {
        (user as any)[key] = otherUpdates[key];
      }
    });

    // Handle skills update (convert array to Map)
    if (skills && Array.isArray(skills)) {
        // Initialize if undefined
        if (!user.skillProficiency) {
            user.skillProficiency = new Map();
        }
        
        // This logic is a bit simple: it assumes existence = proficiency. 
        // For now, let's just ensure keys exist.
        // If we want to replace correctly, we might want to clear and re-add or merge.
        // Assuming 'skills' is the full list from frontend.
        
        // Clear existing map is tricky if we want to keep proficiency levels. 
        // But frontend sends simple string array. Let's assume default proficiency 1 for now.
        // Or if we want to be smarter: keep existing values for existing keys, add new ones, remove missing ones.
        
        const newMap = new Map<string, number>();
        skills.forEach(skill => {
            newMap.set(skill, user.skillProficiency.get(skill) || 1);
        });
        user.skillProficiency = newMap;
    }

    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        // Return updated profile data if needed, or just status
      }
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: error.message });
  }
};
