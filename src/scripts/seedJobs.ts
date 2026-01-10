import mongoose from 'mongoose';
import JobRole from '../models/JobRole';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = 'mongodb+srv://edufyai:abcdefg@cluster0.fzjmokw.mongodb.net/edufya?retryWrites=true&w=majority&appName=Cluster0';

const jobTitles = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Engineer', 'Data Scientist',
  'DevOps Engineer', 'Product Manager', 'UX Designer', 'Mobile Developer',
  'Cloud Architect', 'Cybersecurity Analyst', 'QA Engineer', 'Technical Writer',
  'Systems Administrator', 'Network Engineer', 'AI Research Scientist'
];

const companies = [
  'TechCorp', 'DataSys', 'CloudNet', 'InnovateAI', 'DesignHub', 'SoftSol',
  'CyberGuard', 'DevOpsPro', 'MobileMasters', 'WebWizards'
];

const skillsList = [
  'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'AWS', 'Docker',
  'Kubernetes', 'SQL', 'NoSQL', 'Figma', 'TensorFlow', 'Go', 'Rust',
  'C++', 'TypeScript', 'GraphQL'
];

const generateJobRole = (i: number) => {
  const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const uniqueTitle = `${title} at ${company} - ${i + 1}`;
  
  const numSkills = Math.floor(Math.random() * 5) + 3;
  const requiredSkills = [];
  const shuffledSkills = [...skillsList].sort(() => 0.5 - Math.random());
  
  for (let j = 0; j < numSkills; j++) {
    requiredSkills.push({
      name: shuffledSkills[j],
      level: Math.floor(Math.random() * 60) + 40 // Level 40-100
    });
  }

  return {
    title: uniqueTitle,
    description: `We are looking for a talented ${title} to join our team at ${company}. You will be working on cutting-edge technologies and solving complex problems. Great opportunity for career growth.`,
    requiredSkills: requiredSkills,
    marketDemand: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)]
  };
};

const seedJobs = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');
    await JobRole.deleteMany({});
    console.log('Cleared existing job roles');

    const jobs = Array.from({ length: 50 }, (_, i) => generateJobRole(i));

    console.log(`Inserting ${jobs.length} job roles...`);
    // Use insertMany with ordered: false to continue if some duplicates exist (though title is unique)
    try {
        await JobRole.insertMany(jobs, { ordered: false });
    } catch(e: any) {
        // Ignore duplicate key errors if some random titles clash (unlikely given the suffix)
        if (e.code === 11000) {
            console.warn('Some duplicates skipped');
        } else {
            throw e;
        }
    }
    
    console.log('✅ Job roles seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding job roles:', error);
    process.exit(1);
  }
};

seedJobs();
