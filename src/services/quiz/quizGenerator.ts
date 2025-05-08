
import { supabase } from "@/integrations/supabase/client";
import { QuizQuestion, QuizGenerationParams } from "./types";

/**
 * Service for generating quiz questions using OpenAI
 */
export const quizGenerator = {
  /**
   * Generate a quiz using OpenAI through Supabase Edge Function
   */
  generateQuiz: async (params: QuizGenerationParams): Promise<{questions: QuizQuestion[], timeEstimate: number}> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: params
      });

      if (error) throw new Error(error.message || 'Failed to generate quiz');
      
      return data;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }
};
