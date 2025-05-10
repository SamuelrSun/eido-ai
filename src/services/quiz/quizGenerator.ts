
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
          topic: params.title, // Ensure we pass the correct parameter name
          questionCount: params.questionCount,
          difficulty: params.difficulty,
          coverage: params.coverage,
          openAIConfig: classConfig // Pass the class-specific configuration
        }
      });

      if (error) throw new Error(error.message || 'Failed to generate quiz');
      
      // Validate the response data structure
      if (!data || !data.questions || !Array.isArray(data.questions)) {
        console.error("Invalid quiz data received:", data);
        throw new Error("Received invalid quiz data format from API");
      }
      
      // Transform the data to match our expected format
      const formattedQuestions: QuizQuestion[] = data.questions.map(q => ({
        question: q.question_text || q.question,
        options: q.options || [],
        correctAnswerIndex: q.correct_answer_index !== undefined ? q.correct_answer_index : 0,
        explanation: q.explanation || "No explanation provided"
      }));
      
      return {
        questions: formattedQuestions,
        timeEstimate: data.timeEstimate || 5 * params.questionCount
      };
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }
};
