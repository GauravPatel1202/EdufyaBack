import mongoose, { Schema, Document } from 'mongoose';

export interface INode {
  id: string;
  type: string; // 'topic', 'root', 'subtopic'
  data: {
    label: string;
    description?: string;
    questions?: {
      title: string;
      difficulty: 'easy' | 'medium' | 'hard';
      link?: string;
    }[];
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
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  tags: string[];
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
    questions: [{
      title: String,
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
      link: String
    }]
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
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  estimatedDuration: { type: Number, default: 0 }, // in hours
  tags: [String],
  nodes: [NodeSchema],
  edges: [EdgeSchema]
}, { timestamps: true });

export default mongoose.model<ILearningPath>('LearningPath', LearningPathSchema);
