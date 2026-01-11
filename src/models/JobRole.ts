import mongoose, { Schema, Document } from 'mongoose';

export interface IRequiredSkill {
  name: string;
  level: number;
}

export interface IJobRole extends Document {
  title: string;
  company: string;
  description: string;
  requiredSkills: IRequiredSkill[];
  marketDemand: 'High' | 'Medium' | 'Low';
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
  requiredSkills: [{
    name: { type: String, required: true },
    level: { type: Number, required: true, min: 0, max: 100 }
  }],
  marketDemand: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
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
