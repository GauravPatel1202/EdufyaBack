import { Request, Response } from 'express';
import JobRole from '../models/JobRole';
import User from '../models/User';
export const getAllJobRoles = async (req: Request, res: Response) => {
  try {
    const roles = await JobRole.find();
    return res.json(roles);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const setTargetRole = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.body;
    const userId = (req as any).user.userId;

    const user = await User.findByIdAndUpdate(userId, { targetRoleId: roleId }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    return res.json({ message: 'Target role updated successfully', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCareerStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await User.findById(userId).populate('targetRoleId') as any;
    const targetRole = user?.targetRoleId;
    if (!targetRole) return res.json({ readinessScore: 0, skillGaps: [], message: 'No target role set' });

    // Calculate skill gaps
    const userProficiency = user.skillProficiency || new Map();
    const skillGaps = targetRole.requiredSkills.map((reqSkill: any) => {
      const currentLevel = userProficiency instanceof Map 
        ? (userProficiency.get(reqSkill.name) || 0)
        : (userProficiency[reqSkill.name] || 0);
      
      return {
        name: reqSkill.name,
        requiredLevel: reqSkill.level,
        currentLevel,
        gap: Math.max(0, reqSkill.level - currentLevel)
      };
    });

    const totalRequired = targetRole.requiredSkills.reduce((sum: number, s: any) => sum + s.level, 0);
    const totalCurrent = targetRole.requiredSkills.reduce((sum: number, s: any) => {
      const currentLevel = userProficiency instanceof Map 
        ? (userProficiency.get(s.name) || 0)
        : (userProficiency[s.name] || 0);
      return sum + Math.min(s.level, currentLevel);
    }, 0);

    const readinessScore = Math.round((totalCurrent / totalRequired) * 100);

    // Dynamic job recommendations (simplified logic)
    const recommendations = skillGaps
      .filter((gap: any) => gap.gap > 0)
      .slice(0, 3)
      .map((gap: any) => ({ 
        id: `rec-${gap.name}`, 
        title: `Master ${gap.name} with our targeted learning path`, 
        location: 'Online', 
        salary: 'Career Growth' 
      }));

    if (recommendations.length === 0) {
        recommendations.push({ id: 'top', title: 'You are ready for this role! Explore advanced specializations.', location: 'Global', salary: 'Top Tier' });
    }

    return res.json({
      targetRole: targetRole.title,
      readinessScore,
      skillGaps,
      recommendations,
      marketDemand: targetRole.marketDemand
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
