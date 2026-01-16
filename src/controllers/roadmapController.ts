import { Request, Response } from 'express';
import LearningPath, { INode, IEdge } from '../models/LearningPath';
import { scraperService } from '../services/scraperService';

const ROADMAP_BASE_URL = 'https://raw.githubusercontent.com/kamranahmedse/developer-roadmap/master/src/data/roadmaps';

// Map generic roles to specific JSON paths
const ROLE_MAP: Record<string, string> = {
    'frontend': 'frontend/frontend.json',
    'backend': 'backend/backend.json',
    'devops': 'devops/devops.json',
    'full-stack': 'full-stack/full-stack.json',
    'ai-data-scientist': 'ai-data-scientist/ai-data-scientist.json',
    'blockchain': 'blockchain/blockchain.json'
};

// --- Helper Function: Core Logic ---
const processRoadmapImport = async (roleIdentifier: string, category: string = 'Role Based', context: any = {}) => {
    let roadmapData;
    let questionsData: string[] = [];
    let roleName = roleIdentifier;

    // Detect if valid URL or ID
    const isUrl = roleIdentifier.startsWith('http');
    
    if (isUrl) {
         // 1. Check for official roadmap.sh URL
         const roadmapShMatch = roleIdentifier.match(/roadmap\.sh\/([\w-]+)/);
         if (roadmapShMatch) {
             roleName = roadmapShMatch[1];
             console.log(`✨ Detected roadmap.sh URL, fetching official data for: ${roleName}`);
             
             try {
                 // Fetch Official JSON (Structure)
                 const jsonUrl = `https://roadmap.sh/${roleName}.json`;
                 const structureRes = await fetch(jsonUrl);
                 if (structureRes.ok) {
                     roadmapData = await structureRes.json();
                 }

                 // Fetch Official Questions
                 const questionsUrl = `https://roadmap.sh/api/v1-official-roadmap-questions/${roleName}`;
                 const questionsRes = await fetch(questionsUrl);
                 if (questionsRes.ok) {
                     const qData = await questionsRes.json();
                     questionsData = qData.questions || [];
                 }
             } catch (err) {
                 console.warn(`Official API fetch failed for ${roleName}, falling back...`);
             }
         } 
         
         if (!roadmapData) {
             // 2. Generic AI Scraper for other sites
             console.log(`🌐 Importing Roadmap from URL based fallback: ${roleIdentifier}`);
             roadmapData = await scraperService.scrapeRoadmap(roleIdentifier);
             roleName = roadmapData.title || 'Imported Roadmap';
        }
    } else {
         // Legacy/Direct Role Support (ID passed directly)
         // Try Official First (it's often better)
         try {
            const jsonUrl = `https://roadmap.sh/${roleIdentifier}.json`;
            const structureRes = await fetch(jsonUrl);
            if (structureRes.ok) {
                roadmapData = await structureRes.json();
                roleName = roleIdentifier;
                 // Try fetching questions too
                 const questionsUrl = `https://roadmap.sh/api/v1-official-roadmap-questions/${roleIdentifier}`;
                 const questionsRes = await fetch(questionsUrl);
                 if (questionsRes.ok) {
                     const qData = await questionsRes.json();
                     questionsData = qData.questions || [];
                 }
            }
         } catch(e) {}

         // If official failed, try GitHub Legacy
         if (!roadmapData) {
            const mappedPath = ROLE_MAP[roleIdentifier] || `${roleIdentifier}/${roleIdentifier}.json`;
            const url = `${ROADMAP_BASE_URL}/${mappedPath}`;
            console.log(`Fetching legacy roadmap from: ${url}`);
            const response = await fetch(url);
            if (response.ok) {
                roadmapData = await response.json();
            }
         }
    }

    if (!roadmapData) {
        throw new Error(`Failed to retrieve roadmap data for '${roleIdentifier}'`);
    }

    // Transform Nodes
    const nodes: INode[] = (roadmapData.nodes || [])
        .filter((node: any) => {
            const isStructural = ['vertical', 'horizontal'].includes(node.type);
            const hasLabel = node.data?.label && node.data.label.trim().length > 0;
            return !isStructural && hasLabel;
        })
        .map((node: any) => {
            // Distribute Questions
            const nodeQuestions = questionsData.filter(q => q.toLowerCase().includes(node.data?.label?.toLowerCase()));
            const mappedQuestions = nodeQuestions.map(q => ({
                question: q,
                difficulty: 'medium',
                expectedAnswer: "Explain the core concept and its application."
            }));

            return {
                id: node.id,
                type: 'topic',
                data: {
                    label: node.data?.label || "Untitled Node",
                    description: `**${node.data?.label}** is a fundamental concept in ${roleName}. \n\nIn this module, you will learn:\n1. Core principles of ${node.data?.label}\n2. Best practices and common pitfalls.\n\nMastering this topic is essential for technical interviews.`,
                    estimatedTime: 90,
                    isPremium: false,
                    difficulty: 'medium',
                    problemUrl: `https://leetcode.com/problemset/all/?search=${encodeURIComponent(node.data?.label)}`,
                    videoUrl: '', 
                    documentationLinks: [
                        {
                            title: `${node.data?.label} Official Docs`,
                            url: `https://www.google.com/search?q=${encodeURIComponent(node.data?.label + ' official documentation')}&btnI`,
                            type: 'official'
                        }
                    ],
                    industrialStandards: [],
                    interviewQuestions: mappedQuestions,
                    resources: []
                },
                position: { x: node.position?.x || 0, y: node.position?.y || 0 }
            };
        });

    const edges: IEdge[] = (roadmapData.edges || [])
        .map((edge: any) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target
        }))
        .filter((edge: IEdge) => edge.source && edge.target);

    // Create Learning Path with upsert
    let safeTitle = roleName;
    if (context.title) {
        safeTitle = context.title;
    } else if (roadmapData.title) {
        if (typeof roadmapData.title === 'string') {
            safeTitle = roadmapData.title;
        } else if (typeof roadmapData.title === 'object') {
             safeTitle = roadmapData.title.page || roadmapData.title.card || roadmapData.title.text || roleName;
        }
    }
    const displayTitle = safeTitle.toString().replace(/^\w/, (c: string) => c.toUpperCase());

    const newPath = await LearningPath.findOneAndUpdate(
        { title: `${displayTitle} Roadmap` },
        {
            title: `${displayTitle} Roadmap`,
            description: context.description || roadmapData.description || `Official ${roleName} developer roadmap imported from roadmap.sh.`,
            category,
            metadata: context.metadata || {},
            difficulty: 'beginner',
            estimatedDuration: nodes.length * 1,
            tags: ['roadmap.sh', roleName, 'imported', category, ...(context.metadata?.tags || [])],
            nodes, 
            edges,
            status: 'pending',
            createdBy: context.adminId
        },
        { upsert: true, new: true }
    );

    return { pathId: newPath._id, nodeCount: nodes.length, title: displayTitle };
};

// --- Controllers ---

export const importRoadmap = async (req: Request, res: Response) => {
    try {
        const { role } = req.body; 
        const adminId = (req as any).user.userId;
        const result = await processRoadmapImport(role, 'Role Based', { adminId });
        res.status(201).json({ 
            message: 'Roadmap imported successfully', 
            ...result
        });
    } catch (error: any) {
        console.error("Import Error:", error);
        res.status(500).json({ message: `Import failed: ${error.message}` });
    }
};

export const generateAIRoadmap = async (req: Request, res: Response) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ message: 'Topic is required' });
        }

        console.log(`🤖 AI Roadmap requested for topic: ${topic}`);
        const roadmap = await scraperService.suggestRoadmapNodes(topic);
        
        res.json({
            message: 'AI Roadmap generated successfully',
            roadmap
        });
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ message: `AI Generation failed: ${error.message}` });
    }
};

export const bulkImportRoadmaps = async (req: Request, res: Response) => {
    try {
        console.log("🚀 Starting Bulk Import from pages.json...");
        const response = await fetch('https://roadmap.sh/pages.json');
        if (!response.ok) throw new Error("Failed to fetch pages.json");
        
        const pages = await response.json();
        
        // Filter out 'Questions' group
        const targets = pages.filter((p: any) => p.group !== 'Questions'); 
        
        const results = { success: 0, failed: 0, errors: [] as string[] };
        
        for (const page of targets) {
            try {
                // Map roadmap.sh specific groups/tags to our Categories
                let category = 'Role Based';
                const group = page.group || '';
                const tags = page.metadata?.tags || [];

                if (group === 'Projects') {
                    category = 'Project Ideas';
                } else if (group === 'Best Practices' || group === 'Guides') {
                    category = 'Best Practices';
                } else if (group === 'Skill-based') {
                    category = 'Skill Based'; // Explicit group
                } else if (group === 'Roadmaps') {
                    // Check tags for differentiation
                    if (tags.includes('skill-roadmap')) {
                        category = 'Skill Based';
                    } else {
                        category = 'Role Based';
                    }
                }
                
                console.log(`Processing ${page.id} [${category}]...`);
                
                // Pass context to helper
                await processRoadmapImport(page.id, category, {
                    title: page.title,
                    description: page.description,
                    metadata: page.metadata,
                    adminId: (req as any).user.userId
                });
                
                results.success++;
            } catch (err: any) {
                 console.error(`Failed to import ${page.id}:`, err.message);
                 results.failed++;
                 results.errors.push(`${page.id}: ${err.message}`);
            }
        }

        res.json({ message: "Bulk import completed", results });

    } catch (error: any) {
        console.error("Bulk Import Error:", error);
        res.status(500).json({ message: `Bulk import failed: ${error.message}` });
    }
};
