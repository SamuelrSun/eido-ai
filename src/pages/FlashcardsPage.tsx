import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Plus,
  BarChart3,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { flashcardService } from "@/services/flashcardService";
import { Deck, Flashcard, FlashcardContent } from "@/types/flashcard";

// Form schema for deck generation
const deckGenerationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  cardCount: z.coerce.number().min(3).max(20),
  topic: z.string().min(1, "Please select a topic"),
});

type DeckGenerationFormValues = z.infer<typeof deckGenerationSchema>;

const FlashcardsPage = () => {
  const [activeTab, setActiveTab] = useState("browse");
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<DeckGenerationFormValues>({
    resolver: zodResolver(deckGenerationSchema),
    defaultValues: {
      title: "",
      cardCount: 10,
      topic: "",
    },
  });

  // Sample study statistics - we can keep these for UI demonstration
  const studyStats = {
    cardsStudiedToday: 0,
    totalCards: 0,
    masteredCards: 0,
    retentionRate: 0,
    averageTime: 0,
    streakDays: 0,
  };

  // Fetch decks on component mount
  useEffect(() => {
    fetchDecks();
    fetchAvailableTopics();
  }, []);

  const fetchDecks = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from Supabase
      // For now, we'll set an empty array as we'll be generating decks
      setDecks([]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching decks:", error);
      toast.error("Failed to load flashcard decks");
      setIsLoading(false);
    }
  };

  const fetchAvailableTopics = async () => {
    try {
      const topics = await flashcardService.getAvailableTopics();
      setAvailableTopics(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      toast.error("Failed to load available topics");
      // Fall back to sample topics if API fails
      setAvailableTopics([
        "Network Security",
        "Encryption",
        "Security Protocols",
        "Cybersecurity Basics",
        "All Topics"
      ]);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleConfidenceRating = (rating: string) => {
    console.log(`Card rated: ${rating}`);
    // Here we would update the SRS algorithm with the rating
    setIsFlipped(false);
    handleNextCard();
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleNextCard = () => {
    if (currentDeck?.cards && currentCardIndex < currentDeck.cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const handleGenerateDeck = async (data: DeckGenerationFormValues) => {
    setIsGenerating(true);
    
    try {
      toast.info("Generating flashcard deck...");
      
      // Call the service to generate flashcards
      const generatedFlashcards = await flashcardService.generateDeck({
        title: data.title,
        topic: data.topic,
        cardCount: data.cardCount
      });
      
      const newDeckId = Math.random().toString(36).substring(2, 9);
      
      // Convert the generated content to flashcard objects
      const flashcards = generatedFlashcards.map((card, idx) => {
        return {
          id: `card-${newDeckId}-${idx}`,
          front: card.front,
          back: card.back,
          deckId: newDeckId,
          difficulty: "medium",
          nextReview: new Date(),
        } as Flashcard;
      });

      const newDeck: Deck = {
        id: newDeckId,
        title: data.title,
        description: `AI-generated flashcards about ${data.topic}`,
        cardCount: flashcards.length,
        dueCards: flashcards.length,
        newCards: flashcards.length,
        color: getRandomDeckColor(),
        cards: flashcards,
        updatedAt: new Date()
      };

      // Add the new deck to our state
      setDecks([...decks, newDeck]);
      toast.success("Deck generated successfully!");
      
      setOpenGenerateDialog(false);
      form.reset();
    } catch (error) {
      console.error("Error generating deck:", error);
      toast.error("Failed to generate flashcard deck");
    } finally {
      setIsGenerating(false);
    }
  };

  const startStudyingDeck = (deckId: string) => {
    const selectedDeck = decks.find(deck => deck.id === deckId);
    if (selectedDeck) {
      setCurrentDeck(selectedDeck);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setActiveTab("study");
    }
  };

  const getRandomDeckColor = () => {
    const colors = [
      "bg-purple-500", 
      "bg-blue-500", 
      "bg-teal-500", 
      "bg-green-500", 
      "bg-amber-500", 
      "bg-red-500"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Effect for keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === "study" && currentDeck?.cards) {
        if (e.code === "Space") {
          handleFlip();
        } else if (e.code === "ArrowRight") {
          handleNextCard();
        } else if (e.code === "ArrowLeft") {
          handlePrevCard();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    // Clean up event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentCardIndex, isFlipped, activeTab, currentDeck]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Flashcards"
          description="Enhance your learning with interactive flashcards"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Import
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="study" disabled={!currentDeck}>
            <BookOpen className="mr-2 h-4 w-4" />
            Study
          </TabsTrigger>
          <TabsTrigger value="browse">
            <Clock className="mr-2 h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Stats
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="study" className="space-y-8">
          {currentDeck && currentDeck.cards && currentDeck.cards.length > 0 ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  {currentDeck.title}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Card {currentCardIndex + 1} of {currentDeck.cards.length}
                </div>
              </div>
              
              <div className="relative h-64 perspective-1000">
                <div 
                  className={`absolute w-full h-full transition-all duration-500 transform ${
                    isFlipped ? "rotate-x-180" : ""
                  } cursor-pointer border rounded-xl overflow-hidden`}
                  onClick={handleFlip}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {/* Front of card */}
                  <div 
                    className={`absolute w-full h-full bg-card p-6 flex items-center justify-center`}
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
                      opacity: isFlipped ? 0 : 1,
                      transition: 'transform 0.6s, opacity 0.6s'
                    }}
                  >
                    <p className="text-xl font-medium text-center">{currentDeck.cards[currentCardIndex].front}</p>
                  </div>
                  
                  {/* Back of card */}
                  <div 
                    className={`absolute w-full h-full bg-card p-6 flex items-center justify-center`}
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: isFlipped ? 'rotateX(0deg)' : 'rotateX(-180deg)',
                      opacity: isFlipped ? 1 : 0,
                      transition: 'transform 0.6s, opacity 0.6s'
                    }}
                  >
                    <p className="text-lg">{currentDeck.cards[currentCardIndex].back}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {isFlipped ? "How well did you know this?" : "Click the card to reveal answer (or press Space)"}
                </p>
                
                {isFlipped && (
                  <div className="grid grid-cols-4 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleConfidenceRating("again")} 
                      className="bg-red-100 hover:bg-red-200 border-red-200"
                    >
                      Again
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleConfidenceRating("hard")}
                      className="bg-orange-100 hover:bg-orange-200 border-orange-200"
                    >
                      Hard
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleConfidenceRating("good")}
                      className="bg-green-100 hover:bg-green-200 border-green-200"
                    >
                      Good
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleConfidenceRating("easy")}
                      className="bg-blue-100 hover:bg-blue-200 border-blue-200"
                    >
                      Easy
                    </Button>
                  </div>
                )}
                
                {!isFlipped && (
                  <div className="flex justify-center gap-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrevCard}
                      disabled={currentCardIndex === 0}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab("browse")}
                    >
                      Back to Browse
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNextCard}
                      disabled={currentCardIndex === currentDeck.cards.length - 1}
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-xl text-muted-foreground mb-4">No deck selected for study</p>
              <Button onClick={() => setActiveTab("browse")}>Browse Decks</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="browse" className="space-y-4">
          {/* Deck Browser */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deck) => (
                <Card key={deck.id} className="overflow-hidden">
                  <div className={`h-2 ${deck.color}`}></div>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-1">{deck.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{deck.description}</p>
                    
                    <div className="flex justify-between text-sm mb-2">
                      <span>{deck.cardCount} cards total</span>
                      <span>{deck.dueCards} cards due</span>
                    </div>
                    
                    <Progress value={(deck.cardCount - deck.dueCards) / deck.cardCount * 100} className="h-1 mb-4" />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button 
                        size="sm"
                        onClick={() => startStudyingDeck(deck.id)}
                      >
                        Study Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Card 
                className="border-dashed flex items-center justify-center h-[180px] cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setOpenGenerateDialog(true)}
              >
                <div className="text-center">
                  <Plus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="font-medium">Generate New Deck</p>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-6">
          {/* Study Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Cards Studied Today</h3>
                <p className="text-3xl font-bold">{studyStats.cardsStudiedToday}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Mastered Cards</h3>
                <p className="text-3xl font-bold">{studyStats.masteredCards}/{studyStats.totalCards}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Streak</h3>
                <p className="text-3xl font-bold">{studyStats.streakDays} days</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">Retention Rate Over Time</h3>
              <div className="h-[200px] bg-muted/20 rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Retention graph will appear here</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">Study Activity Heatmap</h3>
              <div className="h-[100px] bg-muted/20 rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Activity heatmap will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Generate Deck Dialog */}
      <Dialog open={openGenerateDialog} onOpenChange={setOpenGenerateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate New Flashcard Deck</DialogTitle>
            <DialogDescription>
              Create AI-generated flashcards based on topics in your vector database
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateDeck)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deck Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title for your deck" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your flashcard deck a descriptive name
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cardCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Cards</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={3}
                        max={20}
                        placeholder="10" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      How many flashcards would you like to generate? (3-20)
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableTopics.map(topic => (
                          <SelectItem key={topic} value={topic}>
                            {topic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a topic from your knowledge base
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenGenerateDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" /> 
                      Generating...
                    </>
                  ) : (
                    "Generate Deck"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlashcardsPage;
