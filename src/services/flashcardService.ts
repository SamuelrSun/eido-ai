
import { supabase } from "@/integrations/supabase/client";
import { FlashcardContent, GenerateDeckParams } from "@/types/flashcard";

// Sample flashcard topics to use as fallback when API calls fail
const FALLBACK_TOPICS = [
  "Network Security",
  "Encryption",
  "Security Protocols", 
  "Cybersecurity Basics",
  "All Topics"
];

// Mock generation function for when API calls fail
const generateMockFlashcards = (params: GenerateDeckParams): FlashcardContent[] => {
  console.log("Generating mock flashcards as fallback");
  
  // Create mock flashcards based on the topic
  const mockCards: FlashcardContent[] = [];
  const baseTopics = {
    "Network Security": [
      { front: "What is a firewall?", back: "A network security device that monitors and filters incoming and outgoing network traffic based on predetermined security rules." },
      { front: "What is the purpose of a VPN?", back: "A Virtual Private Network extends a private network across a public network, enabling users to send and receive data as if their devices were directly connected to the private network." },
      { front: "What is a DDOS attack?", back: "A Distributed Denial of Service attack attempts to disrupt normal traffic to a server by overwhelming it with a flood of internet traffic from multiple sources." }
    ],
    "Encryption": [
      { front: "What is symmetric encryption?", back: "An encryption method where the same key is used for both encryption and decryption of data." },
      { front: "What is asymmetric encryption?", back: "An encryption method that uses a pair of keys - a public key for encryption and a private key for decryption." },
      { front: "What is a hash function?", back: "A mathematical function that converts data of arbitrary size to a fixed-size string of bytes, typically for indexing or ensuring data integrity." }
    ],
    "All Topics": [
      { front: "What is the CIA triad?", back: "Confidentiality, Integrity, and Availability - the three main principles of information security." },
      { front: "What is multi-factor authentication?", back: "An authentication method that requires users to provide two or more verification factors to gain access to a resource." },
      { front: "What is a zero-day vulnerability?", back: "A software vulnerability that is unknown to those who should be interested in mitigating it, including the vendor of the target software." }
    ]
  };
  
  // Choose base cards based on topic or default to All Topics
  const topicCards = baseTopics[params.topic as keyof typeof baseTopics] || baseTopics["All Topics"];
  
  // Add the base cards
  mockCards.push(...topicCards);
  
  // Add additional generic cards to reach the requested count
  while (mockCards.length < params.cardCount) {
    const index = mockCards.length + 1;
    mockCards.push({
      front: `Question ${index} about ${params.topic}?`,
      back: `This is a sample answer about ${params.topic} to question ${index}.`
    });
  }
  
  return mockCards.slice(0, params.cardCount);
};

/**
 * Service to handle flashcard-related operations
 */
export const flashcardService = {
  /**
   * Generate a deck of flashcards using OpenAI and the vector database
   */
  generateDeck: async (params: GenerateDeckParams): Promise<FlashcardContent[]> => {
    try {
      console.log("Attempting to generate flashcards with params:", params);
      
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
        // Instead of throwing an error, we'll return mock flashcards
        return generateMockFlashcards(params);
      }

      console.log("Flashcards generated successfully:", data);
      return data.flashcards || [];
    } catch (error) {
      console.error("Error generating flashcards:", error);
      return generateMockFlashcards(params);
    }
  },
  
  /**
   * Get all available topics from the vector database
   */
  getAvailableTopics: async (): Promise<string[]> => {
    try {
      console.log("Attempting to fetch flashcard topics");
      
      // Call Supabase to get distinct topics from embeddings
      const { data, error } = await supabase.functions.invoke('get-flashcard-topics');

      if (error) {
        console.error("Error calling get-flashcard-topics function:", error);
        return FALLBACK_TOPICS;
      }

      console.log("Topics fetched successfully:", data);
      return data.topics || FALLBACK_TOPICS;
    } catch (error) {
      console.error("Error fetching topics:", error);
      return FALLBACK_TOPICS;
    }
  }
};
