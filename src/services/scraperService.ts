import JobImportQueue from '../models/JobImportQueue';
import JobRole from '../models/JobRole';
import { extractJobDetails } from './aiService';
import mongoose from 'mongoose';

const basicExtract = (html: string, url: string) => {
    let extracted = {
        title: "Untitled Job",
        company: "Unknown Company",
        description: "",
        location: "Remote",
        salary: "Not specified",
        type: "external",
        techStack: [] as string[],
        requirements: [] as string[],
        responsibilities: [] as string[],
        benefits: [] as string[],
        requiredSkills: [] as any[]
    };

    // Helper: Clean HTML tags
    const cleanText = (text: string) => text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    try {
        // 1. Attempt JSON-LD Extraction (JobPosting)
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
        if (jsonLdMatch) {
            for (const script of jsonLdMatch) {
                try {
                    const content = script.replace(/<script[^>]*>|<\/script>/gi, "");
                    const data = JSON.parse(content);
                    const job = Array.isArray(data) ? data.find(item => item['@type'] === 'JobPosting') : (data['@type'] === 'JobPosting' ? data : null);
                    
                    if (job) {
                        extracted.title = job.title || extracted.title;
                        extracted.company = job.hiringOrganization?.name || extracted.company;
                        extracted.description = job.description ? cleanText(job.description) : extracted.description;
                        
                        if (job.jobLocation?.address) {
                            const addr = job.jobLocation.address;
                            extracted.location = typeof addr === 'string' ? addr : `${addr.addressLocality || ''}, ${addr.addressRegion || ''}`;
                        }
                        
                        if (job.baseSalary) {
                            const salary = job.baseSalary.value;
                            extracted.salary = typeof salary === 'object' ? `${salary.minValue || ''}-${salary.maxValue || ''} ${salary.currency || ''}` : salary;
                        }

                        if(job.skills) {
                           const skills = Array.isArray(job.skills) ? job.skills : (typeof job.skills === 'string' ? job.skills.split(',') : []);
                           extracted.techStack = skills;
                           extracted.requiredSkills = skills.map((s: string) => ({ name: s, level: 50 }));
                        }
                        
                        // Continue to text analysis to fill gaps (like missing skills in JSON-LD)
                    }
                } catch (e) { }
            }
        }
    } catch (e) {
        console.log("JSON-LD parsing failed");
    }

    // 2. Fallback: Smart Regex Extraction for Title/Company (if not found in JSON-LD)
    if (extracted.title === "Untitled Job") {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        let rawTitle = titleMatch ? titleMatch[1].trim() : "";
        if (rawTitle) {
            const separator = rawTitle.includes('|') ? '|' : (rawTitle.includes('-') && rawTitle.match(/-/g)!.length === 1 ? '-' : null);
            if (separator) {
                const parts = rawTitle.split(separator);
                extracted.title = parts[0].trim();
                extracted.company = parts[1].trim();
            } else {
                extracted.title = rawTitle;
            }
        }
    }

    // 3. Fallback: Meta Description (if description still empty)
    if (!extracted.description) {
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
        extracted.description = descMatch ? descMatch[1] : "No description extracted.";
    }

    // 4. Keyword Extraction for Tech Stack (if empty)
    if (extracted.techStack.length === 0) {
        const commonTech = [
            "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
            "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "Redis", "GraphQL", "REST API",
            "HTML", "CSS", "Tailwind", "Sass", "Redux", "Vue", "Angular", "Svelte", "Git", "CI/CD", "Linux", "Agile", "Scrum", "Jira"
        ];
        
        const contentText = cleanText(html);
        const foundTech = commonTech.filter(tech => {
            // Case-insensitive whole word match
            const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            return regex.test(contentText);
        });
        
        extracted.techStack = [...new Set(foundTech)]; // Unique
        extracted.requiredSkills = extracted.techStack.map(s => ({ name: s, level: 50 }));
    }

    return extracted;
};

export const scraperService = {
  /**
   * Add URLs to the import queue
   */
  addToQueue: async (urls: string[], userId: string, useAI: boolean = true) => {
    const results = { added: 0, skipped: 0 };
    
    for (const url of urls) {
      if (!url) continue;
      
      // Check if already in queue
      const existingInQueue = await JobImportQueue.findOne({ url });
      if (existingInQueue) {
        results.skipped++;
        continue;
      }

      // Check if already exists as a job
      const existingJob = await JobRole.findOne({ externalUrl: url });
      if (existingJob) {
        results.skipped++;
        continue;
      }

      await JobImportQueue.create({
        url,
        useAI,
        createdBy: userId,
        status: 'Pending'
      });
      results.added++;
    }
    
    return results;
  },

  /**
   * Process pending items in the queue
   */
  processQueue: async () => {
    const pendingItems = await JobImportQueue.find({ status: 'Pending' }).limit(5); // Process 5 at a time
    const results = { success: 0, failed: 0, duplicates: 0 };

    for (const item of pendingItems) {
      try {
        item.status = 'Processing';
        await item.save();

        // 1. Check for existing job
        let existingJob = await JobRole.findOne({ externalUrl: item.url });

        // If exists and NOT forcing update, skip as duplicate
        if (existingJob && !item.forceUpdate) {
             item.status = 'Completed';
             item.error = "Duplicate: Job with this URL already exists.";
             await item.save();
             results.duplicates++;
             continue;
        }

        // 2. Fetch Content
        const response = await fetch(item.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const html = await response.text();

        // 3. Extraction (AI or Basic)
        let extractedData: any;
        
        if (item.useAI) {
            try {
                extractedData = await extractJobDetails(html);
                if (extractedData.error) throw new Error(extractedData.error);
            } catch (aiError: any) {
                console.warn(`AI failed for ${item.url}, falling back to basic scraper. Error: ${aiError.message}`);
                extractedData = basicExtract(html, item.url);
                extractedData.description += "\n\n[Note: AI extraction failed, basic details only.]";
            }
        } else {
            extractedData = basicExtract(html, item.url);
        }

        // 4. Update or Create
        if (existingJob && item.forceUpdate) {
            // UPDATE Existing Job
            Object.assign(existingJob, {
                title: extractedData.title,
                company: extractedData.company,
                description: extractedData.description,
                location: extractedData.location,
                salary: extractedData.salary,
                type: extractedData.type === 'internal' ? 'internal' : (extractedData.type === 'project' ? 'project' : 'external'),
                techStack: Array.isArray(extractedData.techStack) ? extractedData.techStack : [],
                requirements: Array.isArray(extractedData.requirements) ? extractedData.requirements : [],
                responsibilities: Array.isArray(extractedData.responsibilities) ? extractedData.responsibilities : [],
                status: 'Draft' // Reset to Draft on update? Or keep current? User usually wants to review updates. Let's set to Draft or keep current? User probably wants to Approve again. Let's keep it Draft.
            });
            await existingJob.save();
            item.status = 'Completed';
            item.jobId = existingJob._id; 
            item.error = undefined; // Clear error
            await item.save();
            results.success++;

        } else {
             // Check duplication by Title + Company (only if creating new)
            const duplicateByTitle = await JobRole.findOne({ 
                title: extractedData.title, 
                company: extractedData.company 
            });
    
            if (duplicateByTitle && !item.forceUpdate) {
                 item.status = 'Completed';
                 item.error = "Duplicate: Job with this Title and Company already exists.";
                 await item.save();
                 results.duplicates++;
                 continue;
            }

            // CREATE New Job
            const newJob = await JobRole.create({
                title: extractedData.title || "Untitled Job",
                company: extractedData.company || "Unknown Organization",
                description: extractedData.description || "No description provided.",
                location: extractedData.location || "Remote",
                salary: extractedData.salary || "Not specified",
                type: extractedData.type === 'internal' ? 'internal' : (extractedData.type === 'project' ? 'project' : 'external'),
                
                // Strict Array Defaults
                techStack: Array.isArray(extractedData.techStack) ? extractedData.techStack : [],
                officePhotos: Array.isArray(extractedData.officePhotos) ? extractedData.officePhotos : [],
                requirements: Array.isArray(extractedData.requirements) ? extractedData.requirements : [],
                responsibilities: Array.isArray(extractedData.responsibilities) ? extractedData.responsibilities : [],
                benefits: Array.isArray(extractedData.benefits) ? extractedData.benefits : [],
                requiredSkills: Array.isArray(extractedData.requiredSkills) ? extractedData.requiredSkills : [],
    
                // Meta Defaults
                marketDemand: extractedData.marketDemand || 'Medium',
                experienceLevel: extractedData.experienceLevel || 'Entry Level',
                status: 'Draft',
                externalUrl: item.url,
                postedBy: item.createdBy
            });

            item.status = 'Completed';
            item.jobId = newJob._id;
            await item.save();
            results.success++;
        }

      } catch (error: any) {
        console.error(`Scraper Error for ${item.url}:`, error);
        item.status = 'Failed';
        item.error = error.message;
        await item.save();
        results.failed++;
      }
    }

    return results;
  },

  /**
   * Get queue status
   */
  getQueueStatus: async () => {
      const pending = await JobImportQueue.countDocuments({ status: 'Pending' });
      const processing = await JobImportQueue.countDocuments({ status: 'Processing' });
      const completedCount = await JobImportQueue.countDocuments({ status: 'Completed' });
      const failed = await JobImportQueue.countDocuments({ status: 'Failed' });
      const recent = await JobImportQueue.find().sort({ createdAt: -1 }).limit(20);
      
      return {
        counts: {
            pending: pending,
            processing: processing,
            completed: completedCount,
            failed: failed
        },
        recent: recent.map(r => ({
            ...r.toObject(),
            canRetry: r.status === 'Failed' || r.status === 'Completed'
        }))
    };
  },

  /**
   * Retry failed items
   */
  retryFailed: async () => {
      await JobImportQueue.updateMany(
          { status: 'Failed' },
          { $set: { status: 'Pending', error: undefined } }
      );
      return { message: "Failed items reset to Pending" };
  },

  reScrapeItem: async (id: string) => {
      const item = await JobImportQueue.findById(id);
      if (!item) throw new Error("Item not found");
      
      item.status = 'Pending';
      item.forceUpdate = true;
      item.error = undefined;
      await item.save();
      
      return item;
  }
};
