import mongoose, { Schema, Document } from 'mongoose';

export interface INode {
  id: string;
  type: string; // 'topic', 'root', 'subtopic'
  data: {
    label: string;
    description?: string;
    estimatedTime?: number; // in minutes
    videoUrl?: string; // YouTube video ID or URL
    isPremium?: boolean; // Whether this content requires premium access
    documentationLinks?: {
      title: string;
      url: string;
      type?: 'official' | 'tutorial' | 'article' | 'video';
    }[];
    codeSnippets?: {
      title: string;
      language: string;
      code: string;
      description?: string;
    }[];
    resources?: {
      title: string;
      url: string;
      type?: 'tool' | 'library' | 'framework' | 'other';
    }[];
    questions?: {
      id: string;
      text: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }[]; // Quiz questions
    interviewQuestions?: {
      question: string;
      difficulty: 'easy' | 'medium' | 'hard';
      expectedAnswer?: string;
    }[]; // Mock interview questions
    industrialStandards?: {
      title: string;
      description: string;
      isCompleted?: boolean;
    }[]; // Production-ready checklist
    keyPoints?: string[]; // Important takeaways
    pattern?: string; // Grouping pattern (e.g. "Arrays", "Two-Pointers")
    difficulty?: 'easy' | 'medium' | 'hard'; // Overall node difficulty
    problemUrl?: string; // Link to practice problem (LeetCode/GFG)
  };
  position: { x: number; y: number };
}

export interface IEdge {
  id: string;
  source: string;
  target: string;
}

export interface ILearningPath extends Document {
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  tags: string[];
  status: 'pending' | 'published' | 'rejected';
  rejectionReason?: string;
  createdBy: mongoose.Types.ObjectId;
  nodes: INode[];
  edges: IEdge[];
  createdAt: Date;
  updatedAt: Date;
}

const NodeSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, default: 'topic' },
  data: {
    label: { type: String, required: true },
    description: String,
    estimatedTime: Number,
    videoUrl: String, // YouTube video ID or URL
    isPremium: { type: Boolean, default: false },
    documentationLinks: [{
      title: String,
      url: String,
      type: { type: String, enum: ['official', 'tutorial', 'article', 'video'] }
    }],
    codeSnippets: [{
      title: String,
      language: String,
      code: String,
      description: String
    }],
    resources: [{
      title: String,
      url: String,
      type: { type: String, enum: ['tool', 'library', 'framework', 'other'] }
    }],
    questions: [{
      id: String,
      text: String,
      options: [String],
      correctAnswer: Number,
      explanation: String
    }], // Quiz questions
    interviewQuestions: [{
      question: String,
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
      expectedAnswer: String
    }], // Mock interview questions
    industrialStandards: [{
      title: String,
      description: String,
      isCompleted: { type: Boolean, default: false }
    }], // Production-ready checklist
    keyPoints: [String],
    pattern: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    problemUrl: String
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  }
}, { _id: false });

const EdgeSchema = new Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true }
}, { _id: false });

const LearningPathSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'Role Based' }, // Grouping: Role Based, Skill Based, Projects, Best Practices
  metadata: { type: Schema.Types.Mixed }, // Store extra info like tags, original ID, etc.
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  estimatedDuration: { type: Number, default: 0 }, // in hours
  tags: [String],
  status: { 
    type: String, 
    enum: ['pending', 'published', 'rejected'], 
    default: 'pending' 
  },
  rejectionReason: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  nodes: [NodeSchema],
  edges: [EdgeSchema]
}, { timestamps: true });

LearningPathSchema.index({ title: 'text' });
LearningPathSchema.index({ difficulty: 1 });

export default mongoose.model<ILearningPath>('LearningPath', LearningPathSchema);
