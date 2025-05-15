// src/types/flashcard.ts

/**
 * Single flashcard content (front and back) - typically for generation
 */
export interface FlashcardContent {
  front: string;
  back: string;
}

/**
 * Flashcard schema for application use.
 * Corresponds to the 'flashcards' table.
 */
export interface Flashcard {
  id: string; // Maps to flashcard_id (PK)
  deckId: string; // Maps to flashcard_deck_id (FK)
  front: string;
  back: string;
  difficulty: string;
  nextReview: Date; // Will be converted from DB string
  lastReviewed?: Date | null; // Will be converted from DB string
  reviewCount: number | null;
  createdAt: Date; // Will be converted from DB string
  updatedAt: Date; // Will be converted from DB string
  userId?: string | null;
  classId?: string | null; // Foreign key to classes table
}

/**
 * Deck schema for application use.
 * Corresponds to the 'flashcard-decks' table.
 */
export interface Deck {
  id: string; // Maps to flashcard_deck_id (PK)
  title: string;
  description: string;
  color: string;
  cardCount: number; // maps to card_count
  dueCards: number; // maps to due_cards
  newCards: number; // maps to new_cards
  createdAt: Date; // Will be converted from DB string
  updatedAt: Date; // Will be converted from DB string
  userId?: string | null;
  classId?: string | null; // Foreign key to classes table
  cards?: Flashcard[]; // Optional array of flashcards belonging to this deck
}

/**
 * Parameters for generating a new deck
 */
export interface GenerateDeckParams {
  title: string;
  cardCount: number;
}
