import { Request, Response } from 'express';
import mongoose from 'mongoose';
import JobRole from '../models/JobRole';
import User from '../models/User';
export const getAllJobRoles = async (req: Request, res: Response) => {
  try {
    const roles = await JobRole.find().lean();
    return res.json(roles);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobRoleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await JobRole.findById(id).lean();
    if (!role) return res.status(404).json({ message: 'Job role not found' });
    return res.json(role);
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
    const user = await User.findById(userId).populate('targetRoleId').lean() as any;
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
// HR: Create a new job role
export const createJobRole = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { title, company, description, requiredSkills, marketDemand, type, externalUrl } = req.body;

    const newJob = new JobRole({
      title,
      company,
      description,
      requiredSkills,
      marketDemand,
      type,
      externalUrl,
      postedBy: userId,
      applicants: []
    });

    await newJob.save();
    return res.status(201).json(newJob);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// HR: Delete a job role
export const deleteJobRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Optional: Add logic to check if user is the one who posted it
    const job = await JobRole.findById(id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // if (job.postedBy.toString() !== userId) return res.status(403).json({ message: 'Not authorized' });

    await JobRole.findByIdAndDelete(id);
    return res.json({ message: 'Job deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// HR: Get applicants for a job
export const getJobApplicants = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await JobRole.findById(id).populate('applicants.userId', 'firstName lastName email resumeUrl skillProficiency').lean() as any;
    
    if (!job) return res.status(404).json({ message: 'Job not found' });
    
    return res.json(job.applicants);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const applyForJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.body;
    const userId = (req as any).user.userId;

    const job = await JobRole.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.type !== 'internal') return res.status(400).json({ message: 'This job requires external application' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if already applied
    const alreadyApplied = user.jobApplications.some(app => app.jobId.toString() === jobId);
    if (alreadyApplied) return res.status(400).json({ message: 'Already applied for this role' });

    // Add to User's applications
    user.jobApplications.push({
      jobId: job._id as mongoose.Types.ObjectId,
      role: job.title,
      company: job.company,
      status: 'Applied',
      appliedDate: new Date()
    });
    await user.save();

    // Add to Job's applicants
    job.applicants.push({
      userId: user._id as mongoose.Types.ObjectId,
      status: 'Applied',
      appliedDate: new Date(),
      resumeUrl: user.resumeUrl
    });
    await job.save();

    return res.json({ message: 'Application successful', applications: user.jobApplications });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
