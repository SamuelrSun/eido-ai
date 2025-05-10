
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Quiz, QuizQuestion } from "./types";

/**
 * Service for quiz database operations
 */
export const quizRepository = {
  /**
   * Save a quiz to the database
   */
  saveQuiz: async (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quiz> => {
    try {
      // Get the current authenticated user to set user_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to save a quiz");
      }
      
      // Get the active class
      const activeClass = sessionStorage.getItem('activeClass');
      const classTitle = activeClass ? JSON.parse(activeClass).title : null;
      
      // Insert the quiz into the quizzes table
      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          title: quiz.title,
          description: quiz.description,
          question_count: quiz.questionCount,
          time_estimate: quiz.timeEstimate,
          difficulty: quiz.difficulty,
          coverage: quiz.coverage,
          user_id: session.user.id, // Set the user_id to the current user's ID
          class_title: classTitle // Associate with the current class
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Now that we have the quiz ID, save the questions
      for (const question of quiz.questions) {
        const { error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: data.id,
            question_text: question.question,
            options: question.options,
            correct_answer_index: question.correctAnswerIndex,
            explanation: question.explanation
          });

        if (questionError) throw questionError;
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        questions: quiz.questions,
        questionCount: data.question_count,
        timeEstimate: data.time_estimate,
        difficulty: data.difficulty,
        coverage: data.coverage,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        userId: data.user_id,
        classTitle: data.class_title
      };
    } catch (error) {
      console.error('Error saving quiz:', error);
      throw error;
    }
  },
  
  /**
   * Fetch all quizzes for the current user and active class
   */
  fetchQuizzes: async (): Promise<Quiz[]> => {
    try {
      // Get the current authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No active session found when fetching quizzes");
        return [];
      }

      // Get the active class
      const activeClass = sessionStorage.getItem('activeClass');
      const classTitle = activeClass ? JSON.parse(activeClass).title : null;
      
      // If no active class, return an empty array
      if (!classTitle) {
        console.log("No active class found, returning empty quizzes array");
        return [];
      }

      const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', session.user.id) // Only fetch quizzes for the current user
        .eq('class_title', classTitle) // Only fetch quizzes for the current class
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each quiz, fetch its questions
      const quizzesWithQuestions = await Promise.all(
        quizzes.map(async (quiz) => {
          const { data: questions, error: questionsError } = await supabase
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', quiz.id);

          if (questionsError) throw questionsError;

          const formattedQuestions: QuizQuestion[] = questions.map(q => ({
            question: q.question_text,
            options: q.options,
            correctAnswerIndex: q.correct_answer_index,
            explanation: q.explanation
          }));

          return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            questions: formattedQuestions,
            questionCount: quiz.question_count,
            timeEstimate: quiz.time_estimate,
            difficulty: quiz.difficulty,
            coverage: quiz.coverage,
            createdAt: quiz.created_at,
            updatedAt: quiz.updated_at,
            userId: quiz.user_id,
            classTitle: quiz.class_title
          };
        })
      );

      return quizzesWithQuestions;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
      return [];
    }
  },
  
  /**
   * Fetch a single quiz by ID with questions
   */
  fetchQuiz: async (quizId: string): Promise<Quiz | null> => {
    try {
      // Fetch the quiz
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) throw error;
      if (!quiz) return null;

      // Fetch the questions for this quiz
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId);

      if (questionsError) throw questionsError;

      const formattedQuestions: QuizQuestion[] = questions.map(q => ({
        question: q.question_text,
        options: q.options,
        correctAnswerIndex: q.correct_answer_index,
        explanation: q.explanation
      }));

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questions: formattedQuestions,
        questionCount: quiz.question_count,
        timeEstimate: quiz.time_estimate,
        difficulty: quiz.difficulty,
        coverage: quiz.coverage,
        createdAt: quiz.created_at,
        updatedAt: quiz.updated_at,
        userId: quiz.user_id,
        classTitle: quiz.class_title
      };
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz');
      return null;
    }
  },
  
  /**
   * Delete a quiz
   */
  deleteQuiz: async (quizId: string): Promise<void> => {
    try {
      // Delete the questions first (due to foreign key constraint)
      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);

      if (questionsError) throw questionsError;

      // Then delete the quiz
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  }
};
