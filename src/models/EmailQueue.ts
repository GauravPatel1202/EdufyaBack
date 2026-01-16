import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailQueue extends Document {
  to: string;
  subject: string;
  html: string;
  text?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailQueueSchema: Schema = new Schema({
  to: { type: String, required: true },
  subject: { type: String, required: true },
  html: { type: String, required: true },
  text: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  attempts: { type: Number, default: 0 },
  lastAttempt: Date,
  error: String
}, { timestamps: true });

// Index for finding pending jobs
EmailQueueSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model<IEmailQueue>('EmailQueue', EmailQueueSchema);
