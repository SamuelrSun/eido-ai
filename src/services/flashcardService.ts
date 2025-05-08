
import { supabase } from "@/integrations/supabase/client";
import { FlashcardContent, GenerateDeckParams } from "@/types/flashcard";

/**
 * Service to handle flashcard-related operations
 */
export const flashcardService = {
  /**
   * Generate a deck of flashcards using OpenAI and the vector database
   */
  generateDeck: async (params: GenerateDeckParams): Promise<FlashcardContent[]> => {
    try {
      // Call the Supabase Edge Function to generate flashcards
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          title: params.title,
          topic: params.topic,
          cardCount: params.cardCount
        }
      });

      if (error) {
        console.error("Error calling generate-flashcards function:", error);
        throw new Error("Failed to generate flashcards");
      }

      return data.flashcards || [];
    } catch (error) {
      console.error("Error generating flashcards:", error);
      throw new Error("Failed to generate flashcards");
    }
  },
  
  /**
   * Get all available topics from the vector database
   */
  getAvailableTopics: async (): Promise<string[]> => {
    try {
      // Call Supabase to get distinct topics from embeddings
      const { data, error } = await supabase.functions.invoke('get-flashcard-topics');

      if (error) {
        console.error("Error calling get-flashcard-topics function:", error);
        throw new Error("Failed to fetch available topics");
      }

      return data.topics || [];
    } catch (error) {
      console.error("Error fetching topics:", error);
      throw new Error("Failed to fetch available topics");
    }
  }
};
