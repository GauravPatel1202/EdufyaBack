import mongoose, { Schema, Document } from 'mongoose';

export interface ISkill extends Document {
  name: string;
  category: string;
}

const SkillSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<ISkill>('Skill', SkillSchema);
