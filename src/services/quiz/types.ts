
// Quiz service type definitions

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  questionCount: number;
  timeEstimate: number; // in minutes
  difficulty: string;
  coverage: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface QuizGenerationParams {
  title: string;
  questionCount: number;
  difficulty: string; 
  coverage: string;
}
