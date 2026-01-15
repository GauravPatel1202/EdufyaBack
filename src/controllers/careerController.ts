import { Request, Response } from 'express';
import mongoose from 'mongoose';
import JobRole from '../models/JobRole';
import User from '../models/User';
import PlatformSettings from '../models/PlatformSettings';
import InterviewSession from '../models/InterviewSession';
import mammoth from 'mammoth';
import * as careerService from '../services/CareerService';
import { extractTextFromBuffer } from '../utils/DocumentUtils';
export const getAllJobRoles = async (req: Request, res: Response) => {
  try {
    const { location, type, marketDemand, industry, companySize, search, skills, jobFunction, company } = req.query;
    const filter: any = { status: 'Open' };

    if (location) filter.location = { $regex: location as string, $options: 'i' };
    if (type) filter.type = type;
    if (marketDemand) filter.marketDemand = marketDemand;
    if (industry) filter.industry = { $regex: industry as string, $options: 'i' };
    if (companySize && companySize !== 'All') filter.companySize = companySize;
    if (jobFunction) {
      const funcArray = (jobFunction as string).split(',').map(s => s.trim());
      if (funcArray.length > 0) {
        filter.jobFunction = { $in: funcArray.map(s => new RegExp(s, 'i')) };
      }
    }
    if (company) filter.company = { $regex: company as string, $options: 'i' };
    
    if (skills) {
      const skillsArray = (skills as string).split(',').map(s => s.trim());
      if (skillsArray.length > 0) {
        filter['requiredSkills.name'] = { $in: skillsArray.map(s => new RegExp(s, 'i')) };
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { company: { $regex: search as string, $options: 'i' } }
      ];
    }

    const roles = await JobRole.find(filter).lean();
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
    const user = await User.findById(userId).populate('targetRoleId').lean();
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const analysis = careerService.analyzeSkillGaps(user, user.targetRoleId);
    return res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
// HR: Create a new job role
export const createJobRole = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { 
      title, company, description, requiredSkills, marketDemand, type, externalUrl,
      location, salary, responsibilities, requirements, benefits, aboutCompany,

      experienceLevel, jobFunction, industry, companySize, foundedYear,
      techStack, officePhotos
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let initialStatus = 'Pending';
    if (user.role === 'admin') {
      initialStatus = 'Open';
    } else {
      const settings = await PlatformSettings.findOne();
      if (settings?.jobBoardSettings?.autoApproveJobs) {
        initialStatus = 'Open';
      }
    }

    const newJob = new JobRole({
      title,
      status: initialStatus,
      company,
      description,
      requiredSkills,
      marketDemand,
      type,
      externalUrl,
      postedBy: userId,
      applicants: [],
      location, salary, responsibilities, requirements, benefits, aboutCompany,
      experienceLevel, jobFunction, industry, companySize, foundedYear,
      techStack, officePhotos
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
import * as aiService from '../services/aiService';

export const startInterview = async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    const userId = (req as any).user.userId;

    const initialHistory = [
      {
        role: "user",
        parts: [{ text: `I want to start a mock interview for the role of ${context}. Please start by introducing yourself and asking the first question.` }]
      }
    ];

    const response = await aiService.generateInterviewQuestion(context, initialHistory);
    
    // Create new session in DB
    const session = new InterviewSession({
      userId,
      context,
      history: [
        ...initialHistory,
        { role: 'model', parts: [{ text: response }] }
      ]
    });
    await session.save();

    res.json({ message: response, sessionId: session._id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const chatInterview = async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;
    
    const session = await InterviewSession.findById(sessionId);
    if (!session || session.status === 'completed') {
      return res.status(404).json({ message: 'Active interview session not found' });
    }

    // Add user message to history
    session.history.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await aiService.generateInterviewQuestion(session.context, session.history);
    
    // Add model response to history
    session.history.push({
      role: "model",
      parts: [{ text: response }]
    });

    if (response.includes("INTERVIEW_COMPLETE")) {
      session.status = 'completed';
    }

    await session.save();
    res.json({ message: response });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const analyzeInterviewResult = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const analysis = await aiService.analyzeInterview(session.context, session.history);
    
    session.score = analysis.score;
    session.feedback = analysis;
    session.status = 'completed';
    await session.save();

    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getATSScore = async (req: Request, res: Response) => {
  try {
    const { resume, jobDescription } = req.body;
    if (!resume || !jobDescription) {
      return res.status(400).json({ message: 'Resume and Job Description are required' });
    }
    const analysis = await aiService.analyzeATS(resume, jobDescription);
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getATSScoreFromFile = async (req: Request, res: Response) => {
  try {
    const { jobDescription } = req.body;
    const file = req.file;

    if (!file || !jobDescription) {
      return res.status(400).json({ message: 'File and Job Description are required' });
    }

    const resumeText = await extractTextFromBuffer(file.buffer, file.mimetype);

    if (!resumeText.trim()) {
      return res.status(400).json({ message: 'Could not extract text from the file.' });
    }

    const analysis = await aiService.analyzeATS(resumeText, jobDescription);
    res.json(analysis);
  } catch (error: any) {
    console.error("ATS File Analysis Error:", error);
    res.status(500).json({ message: error.message || 'Analysis failed' });
  }
};


export const extractJobFromUrl = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'URL is required' });

    // 1. Fetch content (simple implementation)
    // Note: Production-ready scrapers need headers/proxies to avoid blocking
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
        return res.status(400).json({ message: `Failed to fetch URL: ${response.statusText}` });
    }

    const html = await response.text();
    console.log("Fetched HTML Length:", html.length);

    // 2. AI Extraction
    const jobData = await aiService.extractJobDetails(html);

    if (jobData.error) {
        console.error("AI Extraction Logic Failed:", jobData.error);
        return res.status(500).json({ message: 'Failed to extract job details via AI' });
    }

    // Add source URL
    jobData.externalUrl = url;
    
    res.json(jobData);
  } catch (error: any) {
    console.error("Extraction Controller Error:", error);
    res.status(500).json({ message: error.message });
  }
};
