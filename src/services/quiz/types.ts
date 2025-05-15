// src/services/quiz/types.ts

export interface QuizQuestion {
  question: string; // Corresponds to question_text in DB
  options: string[];
  correctAnswerIndex: number; // Corresponds to correct_answer_index in DB
  explanation: string;
}

export interface Quiz {
  id: string; // Corresponds to quiz_id in DB
  title: string;
  description: string;
  questions: QuizQuestion[];
  questionCount: number; // Corresponds to question_count in DB
  timeEstimate: number; // in minutes, corresponds to time_estimate in DB
  difficulty: string;
  coverage: string;
  createdAt: Date; // Changed from string to Date
  updatedAt: Date; // Changed from string to Date
  userId?: string | null; // Corresponds to user_id in DB
  classId?: string | null; // Corresponds to class_id in DB
}

export interface QuizGenerationParams {
  title: string;
  questionCount: number;
  difficulty: string; 
  coverage: string;
}
