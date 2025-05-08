
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
    console.log("Attempting to generate flashcards with params:", params);
    
    // Call the Supabase Edge Function to generate flashcards
    const { data, error } = await supabase.functions.invoke('generate-flashcards', {
      body: {
        title: params.title,
        cardCount: params.cardCount
      }
    });

    if (error) {
      console.error("Error calling generate-flashcards function:", error);
      throw new Error(`Failed to generate flashcards: ${error.message}`);
    }

    if (!data || !data.flashcards || data.flashcards.length === 0) {
      throw new Error("No flashcards were generated. Please try again.");
    }

    console.log("Flashcards generated successfully:", data);
    return data.flashcards;
  }
};
