// src/services/quiz/quizRepository.ts
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Quiz, QuizQuestion } from "./types";
import type { User } from "@supabase/supabase-js";

// Helper to get active class_id from sessionStorage
const getActiveClassId = (): string | null => {
  const activeClassString = sessionStorage.getItem('activeClass');
  if (activeClassString) {
    try {
      const parsedClass = JSON.parse(activeClassString);
      return parsedClass.class_id || null; 
    } catch (e) {
      console.error("Error parsing activeClass from session storage:", e);
      return null;
    }
  }
  return null;
};

// Define types for Supabase table rows
interface QuizDBRow {
  quiz_id: string;
  title: string;
  description: string;
  question_count: number;
  time_estimate: number;
  difficulty: string;
  coverage: string;
  created_at: string; 
  updated_at: string; 
  user_id: string | null;
  class_id: string | null;
}

interface QuizQuestionDBRow {
  quiz_questions_id: string; 
  quiz_id: string; 
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  class_id: string | null;
}

// Type for QuizDBRow when joined with quiz_questions
interface QuizWithQuestionsDBRow extends QuizDBRow {
  quiz_questions: QuizQuestionDBRow[];
}


/**
 * Service for quiz database operations
 */
export const quizRepository = {
  saveQuiz: async (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quiz> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("You must be logged in to save a quiz");
      }
      
      const activeClassId = getActiveClassId();
      if (!activeClassId) {
        console.warn("No active class ID found. Quiz will not be associated with a class.");
      }

      const quizInsertPayload = {
        title: quiz.title,
        description: quiz.description,
        question_count: quiz.questionCount,
        time_estimate: quiz.timeEstimate,
        difficulty: quiz.difficulty,
        coverage: quiz.coverage,
        user_id: session.user.id,
        class_id: activeClassId 
      };

      const { data: savedQuizData, error: quizError } = await supabase
        .from('quizzes')
        .insert(quizInsertPayload)
        .select()
        .single<QuizDBRow>(); 

      if (quizError) {
        console.error("Supabase error details (saveQuiz - quizzes):", quizError);
        throw quizError;
      }
      if (!savedQuizData) {
        throw new Error("Failed to save quiz: No data returned from database.");
      }

      const questionsToInsert = quiz.questions.map(question => ({
        quiz_id: savedQuizData.quiz_id,
        question_text: question.question,
        options: question.options || ["No option provided"],
        correct_answer_index: question.correctAnswerIndex ?? 0,
        explanation: question.explanation || "No explanation provided",
        user_id: session.user.id,
        class_id: activeClassId
      }));
      
      if (questionsToInsert.length > 0) {
        const { error: questionError } = await supabase
          .from('quiz_questions')
          .insert(questionsToInsert);

        if (questionError) {
          console.error("Supabase error details (saveQuiz - quiz_questions):", questionError);
          throw questionError;
        }
      }

      return {
        id: savedQuizData.quiz_id,
        title: savedQuizData.title,
        description: savedQuizData.description,
        questions: quiz.questions, 
        questionCount: savedQuizData.question_count,
        timeEstimate: savedQuizData.time_estimate,
        difficulty: savedQuizData.difficulty,
        coverage: savedQuizData.coverage,
        createdAt: new Date(savedQuizData.created_at), 
        updatedAt: new Date(savedQuizData.updated_at), 
        userId: savedQuizData.user_id,
        classId: savedQuizData.class_id 
      };
    } catch (error) {
      console.error('Error saving quiz:', error);
      throw error;
    }
  },
  
  fetchQuizzes: async (): Promise<Quiz[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log("No active session found when fetching quizzes");
        return [];
      }

      const activeClassId = getActiveClassId();
      if (!activeClassId) {
        console.log("No active class ID found, returning empty quizzes array");
        return [];
      }

      console.log(`Fetching quizzes with questions for user: ${session.user.id} and class: ${activeClassId}`);

      // ** MODIFICATION: Restored nested select for quiz_questions **
      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select(`
          quiz_id, 
          title, 
          description, 
          question_count, 
          time_estimate, 
          difficulty, 
          coverage, 
          created_at, 
          updated_at, 
          user_id, 
          class_id,
          quiz_questions ( 
            quiz_questions_id,
            question_text,
            options,
            correct_answer_index,
            explanation
          )
        `)
        .eq('user_id', session.user.id)
        .eq('class_id', activeClassId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase error details (fetchQuizzes - with questions):", error);
        throw error; 
      }

      return (quizzesData || []).map((quizFromDb: QuizWithQuestionsDBRow): Quiz => {
        const formattedQuestions: QuizQuestion[] = (quizFromDb.quiz_questions || []).map((q: QuizQuestionDBRow) => ({
          question: q.question_text,
          options: q.options,
          correctAnswerIndex: q.correct_answer_index,
          explanation: q.explanation
        }));
        return {
          id: quizFromDb.quiz_id,
          title: quizFromDb.title,
          description: quizFromDb.description,
          questions: formattedQuestions,
          questionCount: quizFromDb.question_count,
          timeEstimate: quizFromDb.time_estimate,
          difficulty: quizFromDb.difficulty,
          coverage: quizFromDb.coverage,
          createdAt: new Date(quizFromDb.created_at),
          updatedAt: new Date(quizFromDb.updated_at),
          userId: quizFromDb.user_id,
          classId: quizFromDb.class_id
        };
      });
    } catch (error) { 
      console.error('Error in fetchQuizzes function:', error);
      toast.error('Failed to load quizzes. Check console for Supabase error details.');
      return [];
    }
  },
  
  fetchQuiz: async (quizId: string): Promise<Quiz | null> => {
    try {
      const { data: quizData, error } = await supabase
        .from('quizzes')
        .select(`
          quiz_id, 
          title, 
          description, 
          question_count, 
          time_estimate, 
          difficulty, 
          coverage, 
          created_at, 
          updated_at, 
          user_id, 
          class_id,
          quiz_questions (
            quiz_questions_id,
            question_text,
            options,
            correct_answer_index,
            explanation
          )
        `)
        .eq('quiz_id', quizId)
        .single<QuizWithQuestionsDBRow>(); 

      if (error) {
        if (error.code === 'PGRST116') { 
          console.log(`Quiz with ID ${quizId} not found.`);
          return null;
        }
        console.error("Supabase error details (fetchQuiz):", error);
        throw error;
      }
      if (!quizData) return null;

      const formattedQuestions: QuizQuestion[] = (quizData.quiz_questions || []).map((q: QuizQuestionDBRow) => ({
        question: q.question_text,
        options: q.options,
        correctAnswerIndex: q.correct_answer_index,
        explanation: q.explanation
      }));

      return {
        id: quizData.quiz_id,
        title: quizData.title,
        description: quizData.description,
        questions: formattedQuestions,
        questionCount: quizData.question_count,
        timeEstimate: quizData.time_estimate,
        difficulty: quizData.difficulty,
        coverage: quizData.coverage,
        createdAt: new Date(quizData.created_at),
        updatedAt: new Date(quizData.updated_at),
        userId: quizData.user_id,
        classId: quizData.class_id
      };
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz');
      return null;
    }
  },
  
  deleteQuiz: async (quizId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('quiz_id', quizId);

      if (error) {
        console.error("Supabase error details (deleteQuiz):", error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  }
};
