import mongoose, { Schema, Document } from 'mongoose';

export interface IJobImportQueue extends Document {
  url: string;
  useAI: boolean;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  forceUpdate?: boolean;
  error?: string;
  jobId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobImportQueueSchema: Schema = new Schema({
  url: { type: String, required: true, unique: true },
  useAI: { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Processing', 'Completed', 'Failed'], 
    default: 'Pending' 
  },
  forceUpdate: { type: Boolean, default: false },
  error: { type: String },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobRole' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model<IJobImportQueue>('JobImportQueue', JobImportQueueSchema);
