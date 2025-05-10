
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
      // Check auth status before making the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to generate flashcards");
      }

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
        toast("Unable to connect to the flashcard generation service. Please check your connection and try again.");
      } else if (error.message?.includes("logged in")) {
        toast("You must be logged in to generate flashcards");
      } else {
        toast("Failed to generate flashcards. Please try again later.");
      }
      
      throw error;
    }
  },

  /**
   * Save a new deck to the database
   */
  saveDeck: async (deck: Omit<Deck, 'id' | 'updatedAt'>): Promise<Deck> => {
    try {
      // Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast("You must be logged in to save a deck");
        throw new Error("Authentication required");
      }

      // Create an object with snake_case properties for the database
      const { data, error } = await supabase
        .from('decks')
        .insert({
          title: deck.title,
          description: deck.description,
          color: deck.color,
          card_count: deck.cardCount,
          due_cards: deck.dueCards,
          new_cards: deck.newCards,
          user_id: session.user.id // Always use the current user's ID
        } as any)
        .select()
        .single();

      if (error) {
        console.error("Error saving deck:", error);
        toast("Failed to save deck");
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
    } catch (error: any) {
      console.error("Error in saveDeck:", error);
      throw error;
    }
  },

  /**
   * Save flashcards to the database for a deck
   */
  saveFlashcards: async (deckId: string, flashcards: FlashcardContent[]): Promise<void> => {
    try {
      // Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast("You must be logged in to save flashcards");
        throw new Error("Authentication required");
      }

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
        .insert(flashcardsToInsert as any[]);

      if (error) {
        console.error("Error saving flashcards:", error);
        toast("Failed to save flashcards");
        throw new Error(`Failed to save flashcards: ${error.message}`);
      } else {
        toast("Flashcards saved successfully");
      }
    } catch (error: any) {
      console.error("Error in saveFlashcards:", error);
      throw error;
    }
  },

  /**
   * Fetch all decks from the database
   */
  fetchDecks: async (): Promise<Deck[]> => {
    try {
      console.log("Fetching decks...");
      
      // Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No active session when fetching decks");
        return [];
      }

      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', session.user.id) // Only fetch decks for the current user
        .order('updated_at', { ascending: false });

      if (error) {
        console.error("Error fetching decks:", error);
        toast("Failed to load decks");
        throw new Error(`Failed to fetch decks: ${error.message}`);
      }

      console.log("Fetched decks:", data);
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
    } catch (error: any) {
      console.error("Error in fetchDecks:", error);
      toast("Failed to load decks");
      return [];
    }
  },
  
  /**
   * Fetch flashcards for a specific deck
   */
  fetchFlashcards: async (deckId: string) => {
    try {
      console.log("Fetching flashcards for deck:", deckId);
      
      // Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No active session when fetching flashcards");
        return [];
      }
      
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error("Error fetching flashcards:", error);
        toast("Failed to load flashcards");
        throw new Error(`Failed to fetch flashcards: ${error.message}`);
      }
      
      console.log("Fetched flashcards:", data);
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
    } catch (error: any) {
      console.error("Error in fetchFlashcards:", error);
      toast("Failed to load flashcards");
      return [];
    }
  },
  
  /**
   * Delete a deck and its associated flashcards
   */
  deleteDeck: async (deckId: string): Promise<void> => {
    try {
      // Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast("You must be logged in to delete a deck");
        throw new Error("Authentication required");
      }
      
      // First delete all flashcards associated with this deck (cascade delete isn't automatic)
      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .delete()
        .eq('deck_id', deckId);
      
      if (flashcardsError) {
        console.error("Error deleting flashcards:", flashcardsError);
        toast("Failed to delete flashcards");
        throw new Error(`Failed to delete flashcards: ${flashcardsError.message}`);
      }
      
      // Then delete the deck itself
      const { error: deckError } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId);
      
      if (deckError) {
        console.error("Error deleting deck:", deckError);
        toast("Failed to delete deck");
        throw new Error(`Failed to delete deck: ${deckError.message}`);
      }
      
      console.log(`Successfully deleted deck ${deckId} and its flashcards`);
      toast("Deck deleted successfully");
    } catch (error: any) {
      console.error("Error in deleteDeck:", error);
      throw error;
    }
  }
};
