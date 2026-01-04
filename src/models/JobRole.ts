import mongoose, { Schema, Document } from 'mongoose';

export interface IRequiredSkill {
  name: string;
  level: number;
}

export interface IJobRole extends Document {
  title: string;
  description: string;
  requiredSkills: IRequiredSkill[];
  marketDemand: 'High' | 'Medium' | 'Low';
}

const JobRoleSchema: Schema = new Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  requiredSkills: [{
    name: { type: String, required: true },
    level: { type: Number, required: true, min: 0, max: 100 }
  }],
  marketDemand: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' }
}, { timestamps: true });

export default mongoose.model<IJobRole>('JobRole', JobRoleSchema);
