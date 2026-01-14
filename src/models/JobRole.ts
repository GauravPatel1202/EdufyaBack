import mongoose, { Schema, Document } from 'mongoose';

export interface IRequiredSkill {
  name: string;
  level: number;
}

export interface IJobRole extends Document {
  title: string;
  company: string;
  description: string;
  location?: string;
  salary?: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  aboutCompany?: string;
  experienceLevel?: string;
  jobFunction?: string;
  industry?: string;
  companySize?: string;
  foundedYear?: number;
  requiredSkills: IRequiredSkill[];
  marketDemand: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Closed' | 'Draft';
  type: 'internal' | 'external';
  externalUrl?: string;
  postedBy?: mongoose.Types.ObjectId;
  applicants: {
    userId: mongoose.Types.ObjectId;
    status: 'Applied' | 'Interview' | 'Offer' | 'Rejected';
    appliedDate: Date;
    resumeUrl?: string;
  }[];
}

const JobRoleSchema: Schema = new Schema({
  title: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, default: 'Remote' },
  salary: { type: String, default: 'Competitive' },
  responsibilities: [{ type: String }],
  requirements: [{ type: String }],
  benefits: [{ type: String }],
  aboutCompany: { type: String },
  experienceLevel: { type: String, default: 'Mid Level' },
  jobFunction: { type: String },
  industry: { type: String },
  companySize: { type: String },
  foundedYear: { type: Number },
  requiredSkills: [{
    name: { type: String, required: true },
    level: { type: Number, required: true, min: 0, max: 100 }
  }],
  marketDemand: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'Closed', 'Draft'], default: 'Open' },
  type: { type: String, enum: ['internal', 'external'], default: 'internal' },
  externalUrl: { type: String },
  postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  applicants: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
    appliedDate: { type: Date, default: Date.now },
    resumeUrl: String
  }]
}, { timestamps: true });

export default mongoose.model<IJobRole>('JobRole', JobRoleSchema);
