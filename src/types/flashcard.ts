
/**
 * Flashcard schema for database and application use
 */
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deckId: string;
  difficulty: 'easy' | 'medium' | 'hard';
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
  createdAt: Date;
  updatedAt: Date;
  color: string;
  cardCount: number;
  dueCards: number;
  newCards: number;
  cards?: Flashcard[];
}

/**
 * Form input for generating a new deck
 */
export interface GenerateDeckInput {
  title: string;
  cardCount: number;
  topic: string;
}
