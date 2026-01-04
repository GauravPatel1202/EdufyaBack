import { Request, Response } from 'express';
import JobRole from '../models/JobRole';
import User from '../models/User';
import Skill from '../models/Skill';
import mongoose from 'mongoose';

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

    // Mock job recommendations
    const recommendations = [
      { id: 'job1', title: `${targetRole.title} at TechCorp`, location: 'Remote', salary: '$95k' },
      { id: 'job2', title: `Junior ${targetRole.title} at StartupInc`, location: 'San Francisco', salary: '$85k' }
    ];

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
