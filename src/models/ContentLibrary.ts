import mongoose, { Schema, Document } from 'mongoose';

export interface IContentLibrary extends Document {
  title: string;
  description?: string;
  type: 'video' | 'image' | 'document' | 'code' | 'audio';
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  category: string;
  uploadedBy: mongoose.Types.ObjectId;
  usageCount: number;
  metadata: {
    size: number; // in bytes
    duration?: number; // in seconds for video/audio
    format: string;
    width?: number;
    height?: number;
    resolution?: string;
  };
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContentLibrarySchema = new Schema<IContentLibrary>({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['video', 'image', 'document', 'code', 'audio'],
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  tags: {
    type: [String],
    default: [],
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  metadata: {
    size: { type: Number, required: true },
    duration: Number,
    format: { type: String, required: true },
    width: Number,
    height: Number,
    resolution: String
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ContentLibrarySchema.index({ type: 1, category: 1, createdAt: -1 });
ContentLibrarySchema.index({ tags: 1, isPublic: 1 });
ContentLibrarySchema.index({ uploadedBy: 1, createdAt: -1 });

// Text index for search
ContentLibrarySchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model<IContentLibrary>('ContentLibrary', ContentLibrarySchema);
