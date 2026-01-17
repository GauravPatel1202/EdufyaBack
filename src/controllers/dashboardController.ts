import { Request, Response } from 'express';
import User from '../models/User';
import LearningPath from '../models/LearningPath';
import Course from '../models/Course';
import JobRole from '../models/JobRole';
import UserLearningProgress from '../models/UserLearningProgress';
import InterviewSession from '../models/InterviewSession';
import * as careerService from '../services/CareerService';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const [user, allPaths, allCourses, allJobs, userProgress, interviewSessions] = await Promise.all([
      User.findById(userId).populate('targetRoleId').lean(),
      LearningPath.find().limit(3).lean(),
      Course.find().limit(6).lean(),
      JobRole.find().limit(5).lean(),
      UserLearningProgress.find({ userId }).populate('learningPathId').lean(),
      InterviewSession.find({ userId }).lean()
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
    const studyTime = user.studyTime || 0; 

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

    // Calculate Weekly Activity (Last 7 Days)
    const today = new Date();
    const last7Days = [];
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Find log for this day
        const log = user.activityLog?.find((l: any) => l.date === dateStr);
        const count = log ? log.count : 0;
        
        last7Days.push({
            day: days[d.getDay()],
            completed: count >= 1, // e.g. 1 task completed
            active: i === 0, // Today is active
            count: count,
            date: dateStr
        });
    }

    // Enhanced Career Stats calculation for Widget
    // Logic & DSA: Proxy via Learning Path completion (assuming tech paths cover this)
    const logicScore = Math.min(100, Math.round(avgCompletion)); 
    
    // Interview Prep: Based on number of sessions (e.g. 20 points per session, max 100)
    const interviewScore = Math.min(100, interviewSessions.length * 20);

    // Project Portfolio: Based on user projects
    const projectScore = user.projects?.length ? Math.min(100, user.projects.length * 30) : 0;

    let careerReadiness = null;
    if (careerStats) {
        careerReadiness = {
            score: careerStats.readinessScore,
            segments: [
                { label: 'Technical Skills', value: careerStats.readinessScore, color: '#6366f1' },
                { label: 'Logic & DSA', value: logicScore, color: '#8b5cf6' },
                { label: 'Project Portfolio', value: projectScore, color: '#10b981' },
                { label: 'Interview Prep', value: interviewScore, color: '#f59e0b' },
            ]
        };
    }

    // Gamification Logic
    const modulesCompleted = userProgress.reduce((sum, p) => sum + (p.completedNodes?.length || 0), 0);
    const totalXP = (modulesCompleted * 50) + (user.streak * 10) + ((user.projects?.length || 0) * 100);
    
    // Level Calculation: Level 1 = 0-499 XP, Level 2 = 500-999 XP, etc.
    const currentLevel = Math.floor(totalXP / 500) + 1;
    const nextLevelXP = currentLevel * 500;
    
    // Dynamic Percentile based on streak AND progress
    let percentile = 50;
    // Reward consistency (streak) OR volume (modules)
    if (user.streak > 3 || modulesCompleted > 5) percentile = 20;
    if (user.streak > 7 || modulesCompleted > 10) percentile = 10;
    if (user.streak > 14 || modulesCompleted > 20) percentile = 5;
    if (user.streak > 30 || modulesCompleted > 50) percentile = 1;

    res.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        displayName: user.firstName ? `${user.firstName}` : user.email.split('@')[0],
        activityLog: user.activityLog || [],
        streak: user.streak || 0,
        dailyGoal: user.dailyGoal || { title: "Start Learning", progress: 0, total: 1 }
      },
      stats: {
        enrolledCourses: totalPaths,
        completionRate: Math.round(avgCompletion),
        studyTime: studyTime,
        totalXP: totalXP,
        level: currentLevel,
        nextLevelXP: nextLevelXP,
        modulesCompleted: modulesCompleted,
        percentile: percentile
      },
      learningPaths: {
        mine: userProgress,
        recommended: allPaths
      },
      weeklyActivity: last7Days,
      courses: allCourses,
      jobs: allJobs,
      careerStats,
      careerReadiness,
      interviewReadiness: { score: interviewScore },
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
