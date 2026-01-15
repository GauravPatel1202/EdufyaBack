import { Request, Response } from 'express';
import User from '../models/User';
import LearningPath from '../models/LearningPath';
import Course from '../models/Course';
import JobRole from '../models/JobRole';
import UserLearningProgress from '../models/UserLearningProgress';
import * as careerService from '../services/CareerService';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const [user, allPaths, allCourses, allJobs, userProgress] = await Promise.all([
      User.findById(userId).populate('targetRoleId').lean(),
      LearningPath.find().limit(3).lean(),
      Course.find().limit(6).lean(),
      JobRole.find().limit(5).lean(),
      UserLearningProgress.find({ userId }).populate('learningPathId').lean()
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
    // Now we use the persisted value or a safe default.
    const studyTime = user.studyTime || 12; // 12h default seed 

    // Prepare career stats
    let careerStats = null;
    if (user.targetRoleId) {
      careerStats = careerService.analyzeSkillGaps(user, user.targetRoleId);
    }

    // Skill Verification Data
    const skillList = [];
    if (user.skillProficiency) {
        // Handle Map or Object
        let skills: any = {};
        if (user.skillProficiency instanceof Map) {
            skills = Object.fromEntries(user.skillProficiency);
        } else if (typeof user.skillProficiency === 'object') {
            skills = user.skillProficiency;
        }

        if (skills) {
            for (const [name, score] of Object.entries(skills)) {
                skillList.push({
                    name,
                    status: (score as number) >= 80 ? 'Verified' : 'Pending',
                    score: score as number
                });
            }
        }
    }

    res.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        activityLog: user.activityLog || [],
        streak: user.streak || 0,
        dailyGoal: user.dailyGoal || { title: "Complete 1 Lesson", progress: 0, total: 1 }
      },
      stats: {
        enrolledCourses: totalPaths,
        completionRate: Math.round(avgCompletion),
        studyTime: studyTime
      },
      learningPaths: {
        mine: userProgress,
        recommended: allPaths
      },
      courses: allCourses,
      jobs: allJobs,
      careerStats,
      skillVerification: skillList,
      applications: user.jobApplications || []
    });

  } catch (error: any) {
    console.error('Error in getDashboardSummary:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};
