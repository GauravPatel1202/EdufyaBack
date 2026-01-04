import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: string;
  category: string;
  tags: string[];
  thumbnail: string;
  rating: number;
  studentsEnrolled: number;
}

const CourseSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor: { type: String, required: true },
  duration: { type: String, required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  category: { type: String, required: true },
  tags: [{ type: String }],
  thumbnail: { type: String, default: 'https://placehold.co/600x400' },
  rating: { type: Number, default: 0 },
  studentsEnrolled: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
