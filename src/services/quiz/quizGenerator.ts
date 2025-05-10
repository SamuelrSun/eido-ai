
import { supabase } from "@/integrations/supabase/client";
import { QuizQuestion, QuizGenerationParams } from "./types";
import { classOpenAIConfigService } from "../classOpenAIConfig";

/**
 * Service for generating quiz questions using OpenAI
 */
export const quizGenerator = {
  /**
   * Generate a quiz using OpenAI through Supabase Edge Function
   */
  generateQuiz: async (params: QuizGenerationParams): Promise<{questions: QuizQuestion[], timeEstimate: number}> => {
    try {
      // Get class-specific OpenAI configuration if available
      const classConfig = await classOpenAIConfigService.getActiveClassConfig();
      console.log("Using class config for quiz generation:", classConfig ? "YES" : "NO");
      if (classConfig?.apiKey) {
        console.log("API key is configured for quiz generation");
      }
      if (classConfig?.vectorStoreId) {
        console.log(`Using vector store ID for quiz: ${classConfig.vectorStoreId}`);
      }
      if (classConfig?.assistantId) {
        console.log(`Using assistant ID for quiz: ${classConfig.assistantId}`);
      }

      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          ...params,
          openAIConfig: classConfig // Pass the class-specific configuration
        }
      });

      if (error) throw new Error(error.message || 'Failed to generate quiz');
      
      return data;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }
};
