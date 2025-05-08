
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Plus,
  BarChart3,
  Settings,
  FileUp,
  Clock,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const FlashcardsPage = () => {
  const [activeTab, setActiveTab] = useState("study");
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Sample decks data
  const decks = [
    {
      id: 1,
      title: "Network Security Basics",
      description: "Fundamental concepts of network security",
      cardCount: 42,
      dueCards: 7,
      newCards: 3,
      color: "bg-purple-500",
    },
    {
      id: 2,
      title: "Encryption Methods",
      description: "Types of encryption and their applications",
      cardCount: 28,
      dueCards: 5,
      newCards: 0,
      color: "bg-blue-500",
    },
    {
      id: 3,
      title: "Security Protocols",
      description: "Common security protocols and standards",
      cardCount: 36,
      dueCards: 12,
      newCards: 8,
      color: "bg-teal-500",
    },
  ];

  // Sample cards being studied
  const cards = [
    {
      id: 1,
      front: "What is the primary purpose of a firewall in network security?",
      back: "A firewall monitors and filters incoming and outgoing network traffic based on predetermined security rules. Its primary purpose is to establish a barrier between a trusted internal network and untrusted external networks.",
      deckId: 1,
      difficulty: "medium",
      nextReview: new Date(),
    },
    {
      id: 2,
      front: "What is the difference between symmetric and asymmetric encryption?",
      back: "Symmetric encryption uses the same key for encryption and decryption, while asymmetric encryption uses a pair of keys (public and private). Symmetric is faster but requires secure key exchange, while asymmetric is slower but more secure for key distribution.",
      deckId: 1,
      difficulty: "hard",
      nextReview: new Date(),
    },
    {
      id: 3,
      front: "What is a Man-in-the-Middle (MitM) attack?",
      back: "A Man-in-the-Middle attack is a type of cybersecurity attack where an attacker secretly relays and possibly alters the communication between two parties who believe they are directly communicating with each other.",
      deckId: 1,
      difficulty: "medium",
      nextReview: new Date(),
    },
  ];

  const currentCard = cards[currentCardIndex];

  // Sample study statistics
  const studyStats = {
    cardsStudiedToday: 24,
    totalCards: 106,
    masteredCards: 68,
    retentionRate: 87,
    averageTime: 42,
    streakDays: 7,
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
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        handleFlip();
      } else if (e.code === "ArrowRight") {
        handleNextCard();
      } else if (e.code === "ArrowLeft") {
        handlePrevCard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    // Clean up event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentCardIndex, isFlipped]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileUp className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Card
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="study" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="study">
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
          {/* Study Interface */}
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                Network Security Basics
              </Badge>
              <div className="text-sm text-muted-foreground">
                Card {currentCardIndex + 1} of {cards.length}
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
                  <p className="text-xl font-medium text-center">{currentCard.front}</p>
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
                  <p className="text-lg">{currentCard.back}</p>
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
                  <Button variant="outline" size="sm">
                    Skip
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleNextCard}
                    disabled={currentCardIndex === cards.length - 1}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="browse" className="space-y-4">
          {/* Deck Browser */}
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
                    <Button size="sm">Study Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Card className="border-dashed flex items-center justify-center h-[180px] cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="text-center">
                <Plus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="font-medium">Create New Deck</p>
              </div>
            </Card>
          </div>
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
    </div>
  );
};

export default FlashcardsPage;
