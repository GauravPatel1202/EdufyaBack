import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LearningPath from './models/LearningPath';

dotenv.config();

const MONGODB_URI = 'mongodb+srv://edufyai:abcdefg@cluster0.fzjmokw.mongodb.net/edufya?retryWrites=true&w=majority&appName=Cluster0';

const dsAlgoPath = {
  title: "Data Structures & Algorithms",
  description: "Master the foundations of computer science with this interactive roadmap.",
  difficulty: "intermediate",
  estimatedDuration: 60,
  tags: ["CS", "Interview Prep", "Backend"],
  nodes: [
    {
      id: "root",
      type: "root",
      data: { label: "DS & Algo" },
      position: { x: 250, y: 0 }
    },
    {
      id: "arrays",
      type: "topic",
      data: { 
        label: "Arrays",
        description: "The fundamental collection type.",
        questions: [
            { title: "Two Sum", difficulty: "easy" },
            { title: "Best Time to Buy and Sell Stock", difficulty: "easy" },
            { title: "Product of Array Except Self", difficulty: "medium" }
        ]
      },
      position: { x: 100, y: 100 }
    },
    {
      id: "hashing",
      type: "topic",
      data: { 
        label: "Hashing",
        questions: [
            { title: "Contains Duplicate", difficulty: "easy" },
            { title: "Valid Anagram", difficulty: "easy" }
        ]
      },
      position: { x: 400, y: 100 }
    },
    {
      id: "pointers",
      type: "topic",
      data: { label: "Two Pointers" },
      position: { x: 100, y: 200 }
    },
    {
      id: "stack",
      type: "topic",
      data: { label: "Stack" },
      position: { x: 250, y: 200 }
    },
    {
      id: "binary_search",
      type: "topic",
      data: { label: "Binary Search" },
      position: { x: 400, y: 200 }
    },
    {
      id: "trees",
      type: "topic",
      data: { 
        label: "Trees",
        questions: [
            { title: "Invert Binary Tree", difficulty: "easy" },
            { title: "Maximum Depth of Binary Tree", difficulty: "easy" },
            { title: "Level Order Traversal", difficulty: "medium" }
        ]
      },
      position: { x: 250, y: 300 }
    },
    {
      id: "bst",
      type: "subtopic",
      data: { label: "BST" },
      position: { x: 150, y: 400 }
    },
    {
      id: "heap",
      type: "subtopic",
      data: { label: "Heap" },
      position: { x: 350, y: 400 }
    }
  ],
  edges: [
    { id: "e1", source: "root", target: "arrays" },
    { id: "e2", source: "root", target: "hashing" },
    { id: "e3", source: "arrays", target: "pointers" },
    { id: "e4", source: "arrays", target: "stack" },
    { id: "e5", source: "arrays", target: "binary_search" },
    { id: "e6", source: "stock", target: "trees" }, // 'stock' typo? let's fix. source 'arrays' -> 'stack'? No 'stack' -> 'trees' maybe?
    // Let's make a logical flow
    { id: "e-stack-tree", source: "stack", target: "trees" },
    { id: "e-tree-bst", source: "trees", target: "bst" },
    { id: "e-tree-heap", source: "trees", target: "heap" }
  ]
};

const frontendPath = {
  title: "Frontend Development",
  description: "Become a modern frontend developer. Master React, Next.js, and CSS.",
  difficulty: "intermediate",
  estimatedDuration: 80,
  tags: ["Web Dev", "React", "UI/UX"],
  nodes: [
    { id: "root", type: "root", data: { label: "Frontend" }, position: { x: 300, y: 0 } },
    { id: "html_css", type: "topic", data: { label: "HTML & CSS", description: "The building blocks of the web.", questions: [{ title: "Semantic HTML", difficulty: "easy" }, { title: "Flexbox Froggy", difficulty: "easy" }] }, position: { x: 150, y: 100 } },
    { id: "js", type: "topic", data: { label: "JavaScript", description: "The language of the web.", questions: [{ title: "Closures", difficulty: "medium" }, { title: "Promises", difficulty: "medium" }] }, position: { x: 450, y: 100 } },
    { id: "react", type: "topic", data: { label: "React", description: "UI Library.", questions: [{ title: "Hooks", difficulty: "medium" }] }, position: { x: 300, y: 250 } },
    { id: "state", type: "topic", data: { label: "State Mgmt" }, position: { x: 150, y: 400 } },
    { id: "nextjs", type: "topic", data: { label: "Next.js" }, position: { x: 450, y: 400 } },
  ],
  edges: [
    { id: "e1", source: "root", target: "html_css" },
    { id: "e2", source: "root", target: "js" },
    { id: "e3", source: "html_css", target: "react" },
    { id: "e4", source: "js", target: "react" },
    { id: "e5", source: "react", target: "state" },
    { id: "e6", source: "react", target: "nextjs" }
  ]
};

const backendPath = {
  title: "Backend Development",
  description: "Build robust APIs and systems. Node.js, Databases, and System Design.",
  difficulty: "advanced",
  estimatedDuration: 100,
  tags: ["Backend", "Node.js", "DB"],
  nodes: [
    { id: "root", type: "root", data: { label: "Backend" }, position: { x: 300, y: 0 } },
    { id: "nodejs", type: "topic", data: { label: "Node.js" }, position: { x: 300, y: 100 } },
    { id: "db", type: "topic", data: { label: "Databases" }, position: { x: 150, y: 250 } },
    { id: "api", type: "topic", data: { label: "API Design" }, position: { x: 450, y: 250 } },
    { id: "auth", type: "topic", data: { label: "Auth" }, position: { x: 300, y: 350 } },
    { id: "deploy", type: "topic", data: { label: "Deployment" }, position: { x: 300, y: 450 } },
  ],
  edges: [
    { id: "e1", source: "root", target: "nodejs" },
    { id: "e2", source: "nodejs", target: "db" },
    { id: "e3", source: "nodejs", target: "api" },
    { id: "e4", source: "api", target: "auth" },
    { id: "e5", source: "auth", target: "deploy" }
  ]
};

// React Path
const reactPath = {
  title: 'React.js Mastery',
  description: 'From basics to advanced React patterns, including Hooks, Context, Redux, and Next.js.',
  category: 'Frontend',
  difficulty: 'intermediate',
  estimatedDuration: 60,
  tags: ['react', 'javascript', 'frontend', 'hooks'],
  nodes: [
    {
      id: 'react-root',
      type: 'root',
      data: { label: 'React.js', description: 'The library for web and native user interfaces', questions: [] },
      position: { x: 400, y: 0 }
    },
    {
      id: 'fundamentals',
      type: 'topic',
      data: { label: 'Fundamentals', description: 'JSX, Props, State, Events', questions: [] },
      position: { x: 400, y: 150 }
    },
    {
      id: 'hooks',
      type: 'topic',
      data: { label: 'Hooks', description: 'useState, useEffect, custom hooks', questions: [] },
      position: { x: 400, y: 300 }
    },
    {
      id: 'routing',
      type: 'topic',
      data: { label: 'Routing', description: 'React Router, Layouts, Navigation', questions: [] },
      position: { x: 200, y: 450 }
    },
    {
      id: 'state-mgmt',
      type: 'topic',
      data: { label: 'State Mgmt', description: 'Context API, Redux Toolkit, Zustand', questions: [] },
      position: { x: 600, y: 450 }
    },
    {
      id: 'advanced',
      type: 'subtopic',
      data: { label: 'Advanced Patterns', description: 'HOC, Render Props, Optimization', questions: [] },
      position: { x: 400, y: 450 }
    },
    {
      id: 'nextjs',
      type: 'subtopic',
      data: { label: 'Next.js Framework', description: 'SSR, SSG, API Routes, App Router', questions: [] },
      position: { x: 400, y: 600 }
    }
  ],
  edges: [
    { id: 'e1', source: 'react-root', target: 'fundamentals' },
    { id: 'e2', source: 'fundamentals', target: 'hooks' },
    { id: 'e3', source: 'hooks', target: 'routing' },
    { id: 'e4', source: 'hooks', target: 'state-mgmt' },
    { id: 'e5', source: 'hooks', target: 'advanced' },
    { id: 'e6', source: 'advanced', target: 'nextjs' },
    { id: 'e7', source: 'state-mgmt', target: 'nextjs' }
  ]
};

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://edufyai:abcdefg@cluster0.fzjmokw.mongodb.net/edufya?retryWrites=true&w=majority&appName=Cluster0';
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    await LearningPath.deleteMany({});
    console.log('Cleared existing paths');

    await LearningPath.create(dsAlgoPath as any);
    await LearningPath.create(frontendPath as any);
    await LearningPath.create(backendPath as any);
    await LearningPath.create(reactPath as any);

    console.log('Seeded learning paths successfully');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seed();
