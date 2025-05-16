// src/pages/FlashcardsPage.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  BookOpen,
  Plus,
  BarChart3,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader,
  Eye,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
// PageHeader import is no longer needed
// import { PageHeader } from "@/components/layout/PageHeader"; 
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription as FormDescriptionComponent } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { flashcardService } from "@/services/flashcardService";
import { Deck, FlashcardContent, Flashcard } from "@/types/flashcard"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Form schema for deck generation
const deckGenerationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  cardCount: z.coerce.number().min(3).max(50),
});

type DeckGenerationFormValues = z.infer<typeof deckGenerationSchema>;

const FlashcardsPage = () => {
  const [activeTab, setActiveTab] = useState("browse");
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewingDeck, setViewingDeck] = useState<Deck | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<DeckGenerationFormValues>({
    resolver: zodResolver(deckGenerationSchema),
    defaultValues: {
      title: "",
      cardCount: 10,
    },
  });

  // Sample study statistics - kept for UI demonstration
  const studyStats = {
    cardsStudiedToday: 0,
    totalCards: 0,
    masteredCards: 0,
    retentionRate: 0,
    averageTime: 0,
    streakDays: 0,
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const fetchedDecks = await flashcardService.fetchDecks();
      setDecks(fetchedDecks);
    } catch (error) {
      console.error("Error fetching decks:", error);
      toast.error("Failed to load flashcard decks");
    } finally {
      setIsLoadingDecks(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleConfidenceRating = (rating: string) => {
    console.log(`Card rated: ${rating}`);
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

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeleting(true);
    try {
      await flashcardService.deleteDeck(deckToDelete.id);
      setDecks(decks.filter(d => d.id !== deckToDelete.id));
      if (viewingDeck?.id === deckToDelete.id) {
        setViewingDeck(null);
        setOpenViewDialog(false);
      }
      if (currentDeck?.id === deckToDelete.id) {
        setCurrentDeck(null);
        setActiveTab("browse");
      }
      toast.success(`Successfully deleted "${deckToDelete.title}" deck`);
    } catch (error) {
      console.error("Error deleting deck:", error);
      toast.error(`Failed to delete deck: ${(error as Error).message}`);
    } finally {
      setDeckToDelete(null);
      setIsDeleting(false);
    }
  };

  const handleGenerateDeck = async (data: DeckGenerationFormValues) => {
    setIsGenerating(true);
    try {
      toast.info(`Generating ${data.cardCount} flashcards...`);
      const generatedFlashcards = await flashcardService.generateDeck({
        title: data.title,
        cardCount: data.cardCount
      });
      
      const newDeckData: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'> = {
        title: data.title,
        description: `AI-generated flashcards for ${data.title}`,
        cardCount: generatedFlashcards.length,
        dueCards: generatedFlashcards.length, 
        newCards: generatedFlashcards.length,
        color: getRandomDeckColor(),
      };
      const savedDeck = await flashcardService.saveDeck(newDeckData);
      await flashcardService.saveFlashcards(savedDeck.id, generatedFlashcards);
      
      const completeNewDeck = { 
        ...savedDeck, 
        cards: generatedFlashcards.map(fc => ({...fc, deckId: savedDeck.id, difficulty: 'medium', nextReview: new Date(), reviewCount: 0, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() })) as Flashcard[]
      };
      
      setDecks(prevDecks => [completeNewDeck, ...prevDecks]);
      setCurrentDeck(completeNewDeck);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      toast.success(`Successfully generated ${completeNewDeck.cardCount} flashcards!`);
      setOpenGenerateDialog(false);
      form.reset();
      setActiveTab("study");
    } catch (error) {
      console.error("Error generating deck:", error);
      toast.error(`Failed to generate flashcard deck: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const startStudyingDeck = async (deckId: string) => {
    try {
      let selectedDeck = decks.find(deck => deck.id === deckId);
      if (selectedDeck && (!selectedDeck.cards || selectedDeck.cards.length === 0)) {
        const fetchedCards = await flashcardService.fetchFlashcards(deckId);
        selectedDeck = { ...selectedDeck, cards: fetchedCards };
        setDecks(prevDecks => prevDecks.map(d => d.id === deckId ? selectedDeck! : d));
      }
      if (selectedDeck) {
        setCurrentDeck(selectedDeck);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setActiveTab("study");
      }
    } catch (error) {
      console.error("Error loading flashcards:", error);
      toast.error(`Failed to load flashcards: ${(error as Error).message}`);
    }
  };

  const viewDeck = async (deckId: string) => {
    try {
      let selectedDeck = decks.find(deck => deck.id === deckId);
      if (selectedDeck && (!selectedDeck.cards || selectedDeck.cards.length === 0)) {
        const fetchedCards = await flashcardService.fetchFlashcards(deckId);
        selectedDeck = { ...selectedDeck, cards: fetchedCards };
         setDecks(prevDecks => prevDecks.map(d => d.id === deckId ? selectedDeck! : d));
      }
      if (selectedDeck) {
        setViewingDeck(selectedDeck);
        setOpenViewDialog(true);
      }
    } catch (error) {
      console.error("Error loading flashcards for viewing:", error);
      toast.error(`Failed to load flashcards: ${(error as Error).message}`);
    }
  };

  const getRandomDeckColor = () => {
    const colors = ["bg-purple-500", "bg-blue-500", "bg-teal-500", "bg-green-500", "bg-amber-500", "bg-red-500"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === "study" && currentDeck?.cards && 
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
        if (e.code === "Space") { e.preventDefault(); handleFlip(); }
        else if (e.code === "ArrowRight") { e.preventDefault(); handleNextCard(); }
        else if (e.code === "ArrowLeft") { e.preventDefault(); handlePrevCard(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCardIndex, isFlipped, activeTab, currentDeck]);

  return (
    // MODIFICATION: Root div now uses space-y-6 for natural page flow
    <div className="space-y-6"> 
      {/* MODIFICATION: PageHeader removed */}
      {/* <PageHeader 
        title="Flashcards"
        description="Enhance your learning with interactive flashcards"
      /> 
      */}
      
      {/* This div used to contain PageHeader and Import button. Now only Import button. */}
      {/* It will get spacing from the parent's space-y-6 if it's not the first element. */}
      {/* If it becomes the first, may need explicit top margin or padding. */}
      <div className="flex items-center justify-between">
        {/* Empty div to push button to the right if PageHeader is gone */}
        <div></div> 
        <Button variant="outline" size="sm">
          Import
        </Button>
      </div>
      
      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4" data-orientation="horizontal">
          <TabsTrigger value="study" disabled={!currentDeck}><BookOpen className="mr-2 h-4 w-4" />Study</TabsTrigger>
          <TabsTrigger value="browse"><Clock className="mr-2 h-4 w-4" />Browse</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="mr-2 h-4 w-4" />Stats</TabsTrigger>
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
                    <Button variant="outline" onClick={() => handleConfidenceRating("again")} className="bg-red-100 hover:bg-red-200 border-red-200">Again</Button>
                    <Button variant="outline" onClick={() => handleConfidenceRating("hard")} className="bg-orange-100 hover:bg-orange-200 border-orange-200">Hard</Button>
                    <Button variant="outline" onClick={() => handleConfidenceRating("good")} className="bg-green-100 hover:bg-green-200 border-green-200">Good</Button>
                    <Button variant="outline" onClick={() => handleConfidenceRating("easy")} className="bg-blue-100 hover:bg-blue-200 border-blue-200">Easy</Button>
                  </div>
                )}
                {!isFlipped && (
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" size="sm" onClick={handlePrevCard} disabled={currentCardIndex === 0}><ArrowLeft className="mr-2 h-4 w-4" />Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("browse")}>Back to Browse</Button>
                    <Button variant="outline" size="sm" onClick={handleNextCard} disabled={currentCardIndex === currentDeck.cards.length - 1}>Next<ArrowRight className="ml-2 h-4 w-4" /></Button>
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
          {isLoadingDecks ? (
            <div className="flex justify-center items-center py-12"><Loader className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deck) => (
                <Card key={deck.id} className="overflow-hidden h-full flex flex-col">
                  <div className={`h-2 ${deck.color}`}></div>
                  <CardHeader className="flex-shrink-0">
                    <h3 className="font-semibold text-lg mb-1">{deck.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{deck.description}</p>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 flex-grow">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{deck.cardCount} cards total</span>
                      <span>{deck.dueCards} cards due</span>
                    </div>
                    <Progress value={(deck.cardCount > 0 ? (deck.cardCount - deck.dueCards) / deck.cardCount * 100 : 0)} className="h-1 mb-4" />
                  </CardContent>
                  <CardFooter className="pt-2 flex-shrink-0">
                    <div className="flex w-full justify-between">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => viewDeck(deck.id)}><Eye className="mr-2 h-4 w-4" />View</Button>
                        <Button variant="outline" size="sm" onClick={() => setDeckToDelete(deck)} className="text-destructive hover:text-destructive border-destructive/50 hover:border-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <Button size="sm" onClick={() => startStudyingDeck(deck.id)}>Study Now</Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
              <Card 
                className="border-dashed flex flex-col items-center justify-center h-full cursor-pointer hover:bg-accent/50 transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-6"><h3 className="text-sm font-medium text-muted-foreground mb-1">Cards Studied Today</h3><p className="text-3xl font-bold">{studyStats.cardsStudiedToday}</p></CardContent></Card>
            <Card><CardContent className="p-6"><h3 className="text-sm font-medium text-muted-foreground mb-1">Mastered Cards</h3><p className="text-3xl font-bold">{studyStats.masteredCards}/{studyStats.totalCards}</p></CardContent></Card>
            <Card><CardContent className="p-6"><h3 className="text-sm font-medium text-muted-foreground mb-1">Current Streak</h3><p className="text-3xl font-bold">{studyStats.streakDays} days</p></CardContent></Card>
          </div>
          <Card><CardContent className="p-6"><h3 className="font-medium mb-4">Retention Rate Over Time</h3><div className="h-[200px] bg-muted/20 rounded-md flex items-center justify-center"><p className="text-muted-foreground">Retention graph will appear here</p></div></CardContent></Card>
          <Card><CardContent className="p-6"><h3 className="font-medium mb-4">Study Activity Heatmap</h3><div className="h-[100px] bg-muted/20 rounded-md flex items-center justify-center"><p className="text-muted-foreground">Activity heatmap will appear here</p></div></CardContent></Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={openGenerateDialog} onOpenChange={setOpenGenerateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate New Flashcard Deck</DialogTitle>
            <DialogDescription>
              Create AI-generated flashcards from random content in your vector database
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateDeck)} className="space-y-4 pt-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deck Title</FormLabel>
                    <FormControl><Input placeholder="Enter a title for your deck" {...field} /></FormControl>
                    <FormDescriptionComponent>Give your flashcard deck a descriptive name</FormDescriptionComponent>
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="cardCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Cards</FormLabel>
                    <FormControl><Input type="number" min={3} max={50} placeholder="10" {...field} /></FormControl>
                    <FormDescriptionComponent>How many flashcards? (3-50)</FormDescriptionComponent>
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpenGenerateDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate Deck"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingDeck?.title}</DialogTitle>
            <DialogDescription>{viewingDeck?.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {viewingDeck?.cards?.length ? (
              <Table>
                <TableHeader><TableRow><TableHead className="w-[50px]">#</TableHead><TableHead>Question</TableHead><TableHead>Answer</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewingDeck.cards.map((card, index) => (
                    <TableRow key={card.id}><TableCell className="font-medium">{index + 1}</TableCell><TableCell>{card.front}</TableCell><TableCell>{card.back}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (<div className="flex justify-center items-center py-8"><p className="text-muted-foreground">No flashcards in this deck</p></div>)}
          </div>
          <DialogFooter className="flex justify-end gap-3 mt-4">
            <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
            {viewingDeck && (<Button onClick={() => { setOpenViewDialog(false); startStudyingDeck(viewingDeck.id);}}>Study Now</Button>)}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deckToDelete} onOpenChange={(open) => !open && setDeckToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deckToDelete?.title}"? This action cannot be undone 
              and will permanently delete the deck and all its flashcards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteDeck();}} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <><Loader className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlashcardsPage;
