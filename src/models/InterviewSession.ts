import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewSession extends Document {
  userId: mongoose.Types.ObjectId;
  context: string; // Job Role
  history: {
    role: 'user' | 'model';
    parts: { text: string }[];
  }[];
  status: 'active' | 'completed';
  score?: number;
  feedback?: any;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  context: { type: String, required: true },
  history: [{
    role: { type: String, enum: ['user', 'model'], required: true },
    parts: [{
      text: { type: String, required: true }
    }]
  }],
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  score: { type: Number },
  feedback: { type: Schema.Types.Mixed }
}, { timestamps: true });

InterviewSessionSchema.index({ userId: 1, status: 1 });

export default mongoose.model<IInterviewSession>('InterviewSession', InterviewSessionSchema);
