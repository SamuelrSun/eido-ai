
/**
 * Single flashcard content (front and back)
 */
export interface FlashcardContent {
  front: string;
  back: string;
}

/**
 * Flashcard schema for database and application use
 */
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deckId: string;
  difficulty: string;
  nextReview: Date;
  lastReviewed?: Date;
  reviewCount?: number;
}

/**
 * Deck schema for database and application use
 */
export interface Deck {
  id: string;
  title: string;
  description: string;
  userId?: string;
  updatedAt: Date;
  color: string;
  cardCount: number;
  dueCards: number;
  newCards: number;
  cards?: Flashcard[];
}

/**
 * Parameters for generating a new deck
 */
export interface GenerateDeckParams {
  title: string;
  cardCount: number;
}
