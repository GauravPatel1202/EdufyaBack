import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  targetRoleId: mongoose.Types.ObjectId;
  skillProficiency: Map<string, number>;
  title?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  experience?: any[];
  education?: any[];
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    portfolio?: string;
  };
  resumeUrl?: string;
  activityLog: { date: string; count: number }[];
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
  experience: [ExperienceSchema],
  education: [EducationSchema],
  socialLinks: {
    linkedin: String,
    github: String,
    twitter: String,
    portfolio: String
  },
  resumeUrl: String,
  activityLog: [{
    date: { type: String, required: true },
    count: { type: Number, default: 0 }
  }]
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
