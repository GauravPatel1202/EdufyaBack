import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminActivity extends Document {
  adminId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout';
  resource: 'user' | 'learning-path' | 'settings' | 'content' | 'system';
  resourceId?: string;
  details: {
    description: string;
    changes?: any;
    metadata?: any;
  };
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
}

const AdminActivitySchema = new Schema<IAdminActivity>({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'export', 'import', 'login', 'logout'],
    required: true,
    index: true
  },
  resource: {
    type: String,
    enum: ['user', 'learning-path', 'settings', 'content', 'system'],
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  details: {
    description: { type: String, required: true },
    changes: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for common queries
AdminActivitySchema.index({ adminId: 1, timestamp: -1 });
AdminActivitySchema.index({ resource: 1, action: 1, timestamp: -1 });
AdminActivitySchema.index({ timestamp: -1 });

export default mongoose.model<IAdminActivity>('AdminActivity', AdminActivitySchema);
