import mongoose, { Schema, Document } from 'mongoose';

export interface IUserLearningProgress extends Document {
  userId: mongoose.Types.ObjectId;
  learningPathId: mongoose.Types.ObjectId;
  enrolledAt: Date;
  lastAccessedAt: Date;
  completionPercentage: number;
  completedNodes: string[]; // Array of node IDs
  totalTimeSpent: number; // in minutes
}

const UserLearningProgressSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  learningPathId: { type: Schema.Types.ObjectId, ref: 'LearningPath', required: true },
  enrolledAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now },
  completionPercentage: { type: Number, default: 0 },
  completedNodes: [{ type: String }],
  totalTimeSpent: { type: Number, default: 0 }
}, { timestamps: true });

// index for quick lookup
UserLearningProgressSchema.index({ userId: 1, learningPathId: 1 }, { unique: true });

export default mongoose.model<IUserLearningProgress>('UserLearningProgress', UserLearningProgressSchema);
