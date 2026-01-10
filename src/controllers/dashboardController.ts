import { Request, Response } from 'express';
import User from '../models/User';
import LearningPath from '../models/LearningPath';
import Course from '../models/Course';
import JobRole from '../models/JobRole';
import UserLearningProgress from '../models/UserLearningProgress';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const [user, allPaths, allCourses, allJobs, userProgress] = await Promise.all([
      User.findById(userId).populate('targetRoleId'),
      LearningPath.find().limit(3),
      Course.find().limit(6),
      JobRole.find().limit(5),
      UserLearningProgress.find({ userId }).populate('learningPathId')
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate learning stats
    const totalPaths = userProgress.length;
    const avgCompletion = totalPaths > 0
      ? userProgress.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / totalPaths
      : 0;
    
    // In a real app, study time would be calculated from sessions. 
    // For now, we use a placeholder or derived value.
    const studyTime = Math.floor(Math.random() * 20) + 5; 

    // Prepare career stats
    const targetRole = user.targetRoleId as any;
    let careerStats = null;
    if (targetRole) {
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
      
      careerStats = {
        targetRole: targetRole.title,
        readinessScore,
        skillGaps,
        marketDemand: targetRole.marketDemand,
        recommendations: skillGaps.filter((g: any) => g.gap > 0).slice(0, 3).map((g: any) => ({
            id: `rec-${g.name}`,
            title: `Master ${g.name} with our targeted learning path`
        }))
      };
    }

    res.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        activityLog: user.activityLog || []
      },
      stats: {
        enrolledCourses: totalPaths, // Using paths as active learning
        completionRate: Math.round(avgCompletion),
        studyTime: studyTime
      },
      learningPaths: {
        mine: userProgress,
        recommended: allPaths
      },
      courses: allCourses,
      jobs: allJobs,
      careerStats
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
