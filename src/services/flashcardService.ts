
import { supabase } from "@/integrations/supabase/client";
import { Deck, FlashcardContent, GenerateDeckParams } from "@/types/flashcard";

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

      // Ensure the correct number of flashcards are returned
      if (data.flashcards.length < params.cardCount) {
        console.warn(`Requested ${params.cardCount} flashcards but only got ${data.flashcards.length}`);
      }

      console.log("Flashcards generated successfully:", data);
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
    // Convert from application camelCase to database snake_case naming
    const dbDeck = {
      title: deck.title,
      description: deck.description,
      color: deck.color,
      card_count: deck.cardCount,
      due_cards: deck.dueCards,
      new_cards: deck.newCards,
      user_id: deck.userId
    };
    
    const { data, error } = await supabase
      .from('decks')
      .insert(dbDeck)
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
      userId: data.user_id
    };

    return savedDeck;
  },

  /**
   * Save flashcards to the database for a deck
   */
  saveFlashcards: async (deckId: string, flashcards: FlashcardContent[]): Promise<void> => {
    // Convert from application model to database model (camelCase to snake_case)
    const flashcardsToInsert = flashcards.map(card => ({
      deck_id: deckId,
      front: card.front,
      back: card.back,
      difficulty: 'medium',
      next_review: new Date().toISOString(),
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
   * Fetch all decks from the database
   */
  fetchDecks: async (): Promise<Deck[]> => {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
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
      userId: deck.user_id
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
  }
};
