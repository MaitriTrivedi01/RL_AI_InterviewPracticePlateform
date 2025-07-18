import axios from 'axios';
import { Interview, Question, Answer } from '../types/index';

// Base URL for our API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export interface ResumeData {
  education: Array<{
    institution: string;
    degree: string;
    year: string;
    gpa?: string;
  }>;
  work_experience: Array<{
    company: string;
    year: string;
    description: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
}

// Resume API
export const resumeApi = {
  uploadResume: async (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    
    const response = await axios.post(`${API_URL}/resume/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response;
  },
  
  getResume: async (resumeId: string) => {
    const response = await axios.get(`${API_URL}/resume/${resumeId}`);
    return response;
  },
};

// Question API
export const questionApi = {
  generateQuestions: (params: { 
    resumeId?: string, 
    topic: string, 
    difficulty: number, 
    numQuestions?: number 
  }) => {
    return api.post('/questions/generate', params);
  },
  evaluateAnswer: (params: { 
    questionId: string, 
    answer: string,
    topic: string
  }) => {
    return api.post('/questions/evaluate', params);
  }
};

// RL Agent API
export const rlAgentApi = {
  createInterview: async (topic: string, difficulty: number = 5, maxQuestions: number = 10) => {
    const response = await axios.post(`${API_URL}/interview/start`, {
      topic,
      difficulty,
      maxQuestions,
    });
    return response;
  },
  
  submitAnswer: async (interviewId: string, answer: string, timeTaken: number = 0) => {
    const response = await axios.post(`${API_URL}/interview/${interviewId}/submit-answer`, {
      answer,
      time_taken: timeTaken
    });
    return response;
  },
  
  endInterview: async (interviewId: string) => {
    const response = await axios.post(`${API_URL}/interview/end`, {
      session_id: interviewId
    });
    return response;
  },
};

export const scoreHistoryApi = {
  saveScore: async (interviewId: string, questionData: {
    questionNumber: number,
    difficulty: number,
    score: number,
    topic: string,
    timeTaken: number
  }) => {
    const response = await api.post('/interview/score-history', {
      interviewId,
      ...questionData,
      timestamp: new Date().toISOString()
    });
    return response.data;
  }
};

export default api; 