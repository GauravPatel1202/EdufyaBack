import mongoose from 'mongoose';
import User from '../models/User';

export interface SkillGap {
  name: string;
  requiredLevel: number;
  currentLevel: number;
  gap: number;
}

export interface CareerAnalysis {
  targetRole: string;
  readinessScore: number;
  skillGaps: SkillGap[];
  marketDemand: string;
  recommendations: any[];
}

export const analyzeSkillGaps = (user: any, targetRole: any): CareerAnalysis => {
  if (!targetRole) {
    return {
      targetRole: 'None',
      readinessScore: 0,
      skillGaps: [],
      marketDemand: 'N/A',
      recommendations: []
    };
  }

  const userProficiency = user.skillProficiency || new Map();
  
  const skillGaps = targetRole.requiredSkills.map((reqSkill: any) => {
    let currentLevel = 0;
    if (userProficiency instanceof Map) {
      currentLevel = userProficiency.get(reqSkill.name) || 0;
    } else if (typeof userProficiency === 'object') {
      currentLevel = userProficiency[reqSkill.name] || 0;
    }
    
    return {
      name: reqSkill.name,
      requiredLevel: reqSkill.level,
      currentLevel,
      gap: Math.max(0, reqSkill.level - currentLevel)
    };
  });

  const totalRequired = targetRole.requiredSkills.reduce((sum: number, s: any) => sum + (s.level || 0), 0);
  const totalCurrent = targetRole.requiredSkills.reduce((sum: number, s: any) => {
    let currentLevel = 0;
    if (userProficiency instanceof Map) {
      currentLevel = userProficiency.get(s.name) || 0;
    } else if (typeof userProficiency === 'object') {
      currentLevel = userProficiency[s.name] || 0;
    }
    return sum + Math.min(s.level || 0, currentLevel);
  }, 0);

  const readinessScore = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;

  const recommendations = skillGaps
    .filter((gap: any) => gap.gap > 0)
    .slice(0, 3)
    .map((gap: any) => ({
      id: `rec-${gap.name}`,
      title: `Master ${gap.name} with our targeted learning path`,
    }));

  return {
    targetRole: targetRole.title,
    readinessScore,
    skillGaps,
    marketDemand: targetRole.marketDemand,
    recommendations
  };
};
