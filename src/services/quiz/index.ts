
import { quizGenerator } from './quizGenerator';
import { quizRepository } from './quizRepository';
export * from './types';

/**
 * Combined quiz service that includes all quiz-related functionality
 */
export const quizService = {
  // Quiz generation methods
  generateQuiz: quizGenerator.generateQuiz,
  
  // Quiz database operations
  saveQuiz: quizRepository.saveQuiz,
  fetchQuizzes: quizRepository.fetchQuizzes,
  fetchQuiz: quizRepository.fetchQuiz,
  deleteQuiz: quizRepository.deleteQuiz
};
