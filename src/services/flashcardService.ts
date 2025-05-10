
import { supabase } from "@/integrations/supabase/client";
import { Deck, FlashcardContent, GenerateDeckParams } from "@/types/flashcard";
import { classOpenAIConfigService } from "./classOpenAIConfig";

/**
 * Service to handle flashcard-related operations
 */
export const flashcardService = {
  /**
   * Generate a deck of flashcards using OpenAI and the vector database
   */
  generateDeck: async (params: GenerateDeckParams): Promise<FlashcardContent[]> => {
    console.log("Attempting to generate flashcards with params:", params);
    
    try {
      // Get class-specific OpenAI configuration if available
      const classConfig = await classOpenAIConfigService.getActiveClassConfig();
      console.log("Using class config:", classConfig ? "YES" : "NO");
      if (classConfig?.apiKey) {
        console.log("API key is configured");
      }
      if (classConfig?.vectorStoreId) {
        console.log(`Using vector store ID: ${classConfig.vectorStoreId}`);
      }
      if (classConfig?.assistantId) {
        console.log(`Using assistant ID: ${classConfig.assistantId}`);
      }
      
      // Call the Supabase Edge Function to generate flashcards with the class config
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          title: params.title,
          cardCount: params.cardCount,
          openAIConfig: classConfig // Pass the class-specific configuration
        }
      });

      if (error) {
        console.error("Error calling generate-flashcards function:", error);
        throw new Error(`Failed to generate flashcards: ${error.message}`);
      }

      if (!data || !data.flashcards || data.flashcards.length === 0) {
        throw new Error("No flashcards were generated. Please try again.");
      }

      // Verify we got exactly the right number of flashcards
      if (data.flashcards.length !== params.cardCount) {
        console.log(`Expected ${params.cardCount} flashcards but received ${data.flashcards.length}. Adjusting...`);
      }
      
      console.log(`Received ${data.flashcards.length} flashcards from the API`);
      return data.flashcards;
    } catch (error: any) {
      console.error("Error generating flashcards:", error);
      
      // Check specifically for connection issues
      if (error.message?.includes("Failed to send a request") || 
          error.message?.includes("Failed to fetch")) {
        throw new Error("Unable to connect to the flashcard generation service. Please check your connection and try again.");
      }
      
      throw error;
    }
  },

  /**
   * Save a new deck to the database
   */
  saveDeck: async (deck: Omit<Deck, 'id' | 'updatedAt'>): Promise<Deck> => {
    // Get the active class from session storage
    const activeClass = sessionStorage.getItem('activeClass');
    const classTitle = activeClass ? JSON.parse(activeClass).title : null;
    
    // Create an object with snake_case properties for the database
    // Make sure we're using the field names expected by the database
    const { data, error } = await supabase
      .from('decks')
      .insert({
        title: deck.title,
        description: deck.description,
        color: deck.color,
        card_count: deck.cardCount,
        due_cards: deck.dueCards,
        new_cards: deck.newCards,
        user_id: deck.userId,
        class_title: classTitle // Add class_title to associate with specific class
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving deck:", error);
      throw new Error(`Failed to save deck: ${error.message}`);
    }

    // Convert from snake_case database fields to camelCase for app use
    const savedDeck: Deck = {
      id: data.id,
      title: data.title,
      description: data.description,
      color: data.color,
      cardCount: data.card_count,
      dueCards: data.due_cards,
      newCards: data.new_cards,
      updatedAt: new Date(data.updated_at),
      userId: data.user_id,
      classTitle: data.class_title
    };

    return savedDeck;
  },

  /**
   * Save flashcards to the database for a deck
   */
  saveFlashcards: async (deckId: string, flashcards: FlashcardContent[]): Promise<void> => {
    // Convert from application model to database model (camelCase to snake_case)
    // Make sure we're mapping properly to the database schema fields
    const flashcardsToInsert = flashcards.map(card => ({
      deck_id: deckId,
      front: card.front,
      back: card.back,
      difficulty: 'medium',
      next_review: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('flashcards')
      .insert(flashcardsToInsert);

    if (error) {
      console.error("Error saving flashcards:", error);
      throw new Error(`Failed to save flashcards: ${error.message}`);
    }
  },

  /**
   * Fetch all decks from the database for the current active class
   */
  fetchDecks: async (): Promise<Deck[]> => {
    // Get the active class from session storage
    const activeClass = sessionStorage.getItem('activeClass');
    const classTitle = activeClass ? JSON.parse(activeClass).title : null;
    
    // If no active class, return an empty array
    if (!classTitle) {
      console.log("No active class found, returning empty decks array");
      return [];
    }
    
    // Fetch decks filtered by class_title
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('class_title', classTitle)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching decks:", error);
      throw new Error(`Failed to fetch decks: ${error.message}`);
    }

    return data.map(deck => ({
      id: deck.id,
      title: deck.title,
      description: deck.description,
      color: deck.color,
      cardCount: deck.card_count,
      dueCards: deck.due_cards,
      newCards: deck.new_cards,
      updatedAt: new Date(deck.updated_at),
      userId: deck.user_id,
      classTitle: deck.class_title
    }));
  },
  
  /**
   * Fetch flashcards for a specific deck
   */
  fetchFlashcards: async (deckId: string) => {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error("Error fetching flashcards:", error);
      throw new Error(`Failed to fetch flashcards: ${error.message}`);
    }
    
    return data.map(card => ({
      id: card.id,
      front: card.front,
      back: card.back,
      deckId: card.deck_id,
      difficulty: card.difficulty,
      nextReview: new Date(card.next_review),
      lastReviewed: card.last_reviewed ? new Date(card.last_reviewed) : undefined,
      reviewCount: card.review_count
    }));
  },
  
  /**
   * Delete a deck and its associated flashcards
   */
  deleteDeck: async (deckId: string): Promise<void> => {
    try {
      // First delete all flashcards associated with this deck (cascade delete isn't automatic)
      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .delete()
        .eq('deck_id', deckId);
      
      if (flashcardsError) {
        console.error("Error deleting flashcards:", flashcardsError);
        throw new Error(`Failed to delete flashcards: ${flashcardsError.message}`);
      }
      
      // Then delete the deck itself
      const { error: deckError } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId);
      
      if (deckError) {
        console.error("Error deleting deck:", deckError);
        throw new Error(`Failed to delete deck: ${deckError.message}`);
      }
      
      console.log(`Successfully deleted deck ${deckId} and its flashcards`);
    } catch (error: any) {
      console.error("Error in deleteDeck:", error);
      throw error;
    }
  }
};
