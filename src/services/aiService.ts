import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const generateInterviewQuestion = async (context: string, history: { role: string; parts: { text: string }[] }[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const prompt = `You are an expert technical interviewer for the role of ${context}. 
    Conduct a realistic industrial mock interview. 
    Keep responses concise and professional. 
    After each response from the user, provide brief feedback and ask the next logical technical question.
    If the interview is nearing 10 minutes or 10 questions, wrap it up and say "INTERVIEW_COMPLETE".`;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate AI response");
  }
};

export const analyzeInterview = async (context: string, history: any[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze the following interview for the role of ${context}. 
    Provide a performance score (0-100) and structured feedback on:
    1. Conceptual Depth
    2. Communication Skills
    3. Areas for Improvement
    
    Interview History:
    ${JSON.stringify(history)}
    
    Return the result as a raw JSON object with keys: score, conceptualDepth, communication, improvements.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Attempt to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse analysis" };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze interview");
  }
};

export const analyzeATS = async (resume: string, jobDescription: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert HR Recruitment Specialist and ATS (Applicant Tracking System) optimizer.
    Analyze the following Resume against the provided Job Description.
    
    Resume:
    ${resume}
    
    Job Description:
    ${jobDescription}
    
    Provide a detailed ATS evaluation in raw JSON format with the following keys:
    1. score: (0-100)
    2. matches: (Array of strings - skills/keywords that match)
    3. missingKeywords: (Array of strings - important keywords from JD missing in resume)
    4. resumeFeedback: (String - overall feedback on how to improve the resume for this specific role)
    5. formattingIssues: (Array of strings - any ATS formatting warnings)
    
    Return ONLY the raw JSON object.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse ATS analysis" };
  } catch (error) {
    console.error("Gemini ATS Error:", error);
    throw new Error("Failed to perform ATS analysis");
  }
};
