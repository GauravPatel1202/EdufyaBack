import mongoose from 'mongoose';
import Course from '../models/Course';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';

const categories = [
  'Web Development', 'Data Science', 'Mobile Development', 'UI/UX Design', 
  'Cloud Computing', 'Cybersecurity', 'Blockchain', 'Game Development',
  'DevOps', 'Machine Learning'
];

const levels = ['Beginner', 'Intermediate', 'Advanced'];

const generateCourse = (i: number) => {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const level = levels[Math.floor(Math.random() * levels.length)];
  
  return {
    title: `${category} Masterclass ${i + 1}: From Zero to Hero`,
    description: `A comprehensive guide to mastering ${category}. Learn the fundamental concepts and advanced techniques needed to succeed in the industry. This course covers everything from basic syntax to real-world application building.`,
    instructor: `Instructor ${i + 1}`,
    duration: `${Math.floor(Math.random() * 20 + 2)}h ${Math.floor(Math.random() * 60)}m`,
    level: level,
    category: category,
    tags: [category.toLowerCase().split(' ')[0], 'tech', 'programming', 'career'],
    thumbnail: `https://placehold.co/600x400?text=Course+${i + 1}`,
    rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
    studentsEnrolled: Math.floor(Math.random() * 5000)
  };
};

const seedCourses = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');
    await Course.deleteMany({});
    console.log('Cleared existing courses');

    const courses = Array.from({ length: 50 }, (_, i) => generateCourse(i));

    console.log(`Inserting ${courses.length} courses...`);
    await Course.insertMany(courses);
    
    console.log('✅ Courses seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
    process.exit(1);
  }
};

seedCourses();
