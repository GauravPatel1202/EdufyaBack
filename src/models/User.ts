import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  resetPasswordOtp?: string;
  resetPasswordExpires?: Date;
  role: string;
  targetRoleId: mongoose.Types.ObjectId;
  skillProficiency: Map<string, number>;
  title?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  experience?: any[];
  education?: any[];
  projects?: {
    title: string;
    description: string;
    link?: string;
    technologies?: string[];
    role?: string;
  }[];
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    portfolio?: string;
  };
  resumeUrl?: string;
  activityLog: { date: string; count: number }[];
  studyTime?: number;
  streak: number;
  dailyGoal: {
    title: string;
    progress: number;
    total: number;
  };
  jobApplications: {
    jobId: mongoose.Types.ObjectId | string;
    company: string;
    role: string;
    status: 'Applied' | 'Interview' | 'Offer' | 'Rejected';
    appliedDate: Date;
  }[];
  subscription: {
    status: 'active' | 'inactive';
    startDate?: Date;
    expiryDate?: Date;
  };
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  walletBalance: number;
  referralRewards: {
    referredUser: mongoose.Types.ObjectId | string;
    amount: number;
    date: Date;
    status: 'Pending' | 'Paid';
  }[];
}

const ExperienceSchema = new Schema({
  company: String,
  role: String,
  startDate: Date,
  endDate: Date,
  current: Boolean,
  description: String
});

const EducationSchema = new Schema({
  school: String,
  degree: String,
  fieldOfStudy: String,
  startYear: Number,
  endYear: Number
});

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetPasswordOtp: String,
  resetPasswordExpires: Date,
  role: { type: String, default: 'student' },
  targetRoleId: { type: Schema.Types.ObjectId, ref: 'JobRole' },
  skillProficiency: {
    type: Map,
    of: Number,
    default: {}
  },
  // Profile Fields
  title: String,
  bio: String,
  phoneNumber: String,
  location: String,
  socialLinks: {
    linkedin: String,
    github: String,
    twitter: String,
    portfolio: String
  },
  experience: [ExperienceSchema],
  education: [EducationSchema],
  projects: [{
    title: String,
    description: String,
    link: String,
    technologies: [String],
    role: String
  }],
  resumeUrl: String,
  activityLog: [{
    date: { type: String, required: true },
    count: { type: Number, default: 0 }
  }],
  // Gamification & Tracking
  studyTime: { type: Number, default: 0 }, // Total hours
  streak: { type: Number, default: 0 },
  dailyGoal: {
    title: { type: String, default: "Complete 1 Lesson" },
    progress: { type: Number, default: 0 },
    total: { type: Number, default: 1 }
  },
  jobApplications: [{
    jobId: { type: Schema.Types.ObjectId, ref: 'JobRole' },
    company: String,
    role: String,
    status: { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
    appliedDate: { type: Date, default: Date.now }
  }],
  subscription: {
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    startDate: Date,
    expiryDate: Date
  },
  // Referral System
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  walletBalance: { type: Number, default: 0 },
  referralRewards: [{
    referredUser: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Paid' } // 'Paid' means credited to wallet
  }]
}, { timestamps: true });

UserSchema.index({ role: 1 });
UserSchema.index({ 'subscription.status': 1 });

export default mongoose.model<IUser>('User', UserSchema);
