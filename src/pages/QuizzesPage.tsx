// src/pages/QuizzesPage.tsx
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Clock, 
  FileText, 
  Timer, 
  SquareCheck, 
  ChevronRight, 
  ChartBar,
  Plus,
  Loader,
  Eye,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { quizService, Quiz, QuizQuestion } from "@/services/quiz"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const quizGenerationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  questionCount: z.coerce.number().min(5, "Minimum 5 questions").max(50, "Maximum 50 questions"),
  difficulty: z.string(),
  coverage: z.string(),
});

type QuizGenerationFormValues = z.infer<typeof quizGenerationSchema>;

const QuizzesPage = () => {
  const navigate = useNavigate();
  const [selectedQuizForAction, setSelectedQuizForAction] = useState<null | Quiz>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [isStartQuizDialogOpen, setIsStartQuizDialogOpen] = useState(false);

  const form = useForm<QuizGenerationFormValues>({
    resolver: zodResolver(quizGenerationSchema),
    defaultValues: {
      title: "",
      questionCount: 10,
      difficulty: "medium",
      coverage: "Chapters 1-5",
    },
  });

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuizCardBarColor = (difficulty: string): string => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setIsLoading(true);
    try {
      const fetchedQuizzes = await quizService.fetchQuizzes();
      setQuizzes(fetchedQuizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Failed to load quizzes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async (data: QuizGenerationFormValues) => {
    setIsGenerating(true);
    try {
      toast.info(`Generating ${data.questionCount} ${data.difficulty} quiz questions for "${data.title}"...`);
      
      // Call the service to generate quiz questions
      // The 'data' here is QuizGenerationFormValues
      const { questions, timeEstimate } = await quizService.generateQuiz(data);
      
      // Construct the object for saveQuiz explicitly matching Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>
      // userId and classId are handled within saveQuiz
      const quizToSavePayload: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'classId'> = {
        title: data.title,
        description: `${data.difficulty} quiz covering ${data.coverage}`,
        questions: questions, // These are the generated QuizQuestion[]
        questionCount: questions.length, // Use the actual number of questions generated
        timeEstimate: timeEstimate,
        difficulty: data.difficulty,
        coverage: data.coverage,
      };
      
      const newQuiz = await quizService.saveQuiz(quizToSavePayload);
      
      setQuizzes(prevQuizzes => [newQuiz, ...prevQuizzes]);
      toast.success(`Successfully generated ${newQuiz.questionCount} quiz questions for "${newQuiz.title}"!`);
      setOpenGenerateDialog(false);
      form.reset();
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error(`Failed to generate quiz: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartQuizClick = (quiz: Quiz) => {
    setSelectedQuizForAction(quiz);
    setIsStartQuizDialogOpen(true);
  };

  const confirmStartQuiz = () => {
    if (selectedQuizForAction) {
      navigate(`/quizzes/${selectedQuizForAction.id}`);
      setIsStartQuizDialogOpen(false);
      setSelectedQuizForAction(null);
    }
  };

  const viewQuiz = async (quizId: string) => {
    try {
      const quiz = await quizService.fetchQuiz(quizId);
      if (quiz) {
        setViewingQuiz(quiz);
        setOpenViewDialog(true);
      }
    } catch (error) {
      console.error("Error loading quiz:", error);
      toast.error("Failed to load quiz details");
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      await quizService.deleteQuiz(quizToDelete);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizToDelete));
      toast.success("Quiz deleted successfully");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Failed to delete quiz");
    } finally {
      setOpenDeleteDialog(false);
      setQuizToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Quizzes"
        description="Test your knowledge with practice quizzes"
      />

      {/* Quiz Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <FileText className="mr-2 h-5 w-5 text-purple-500" />
              Chapter Quizzes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Focus on specific chapters or units from your course material.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Browse</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Timer className="mr-2 h-5 w-5 text-purple-500" />
              Timed Exams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Simulate real exam conditions with strict time limits.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Browse</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <SquareCheck className="mr-2 h-5 w-5 text-purple-500" />
              Quick Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Short quizzes for rapid knowledge checks and concept reinforcement.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Browse</Button>
          </CardFooter>
        </Card>
      </div>

      {/* Available Quizzes Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Available Quizzes</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className={`h-2 ${getQuizCardBarColor(quiz.difficulty)}`}></div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{quiz.title}</CardTitle>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyBadgeColor(quiz.difficulty)}`}>
                      {quiz.difficulty}
                    </span>
                  </div>
                  <CardDescription>{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <FileText className="mr-1 h-4 w-4" /> {quiz.questionCount} questions
                    </span>
                    <span className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" /> {quiz.timeEstimate} min
                    </span>
                    <span>{quiz.coverage}</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="flex w-full justify-between">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => viewQuiz(quiz.id)}
                    >
                      <Eye className="mr-1 h-4 w-4" /> Preview
                    </Button>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="px-2">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-3">
                            <h4 className="font-medium">Quiz Details</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Created:</span>
                                <span className="font-medium">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Questions:</span>
                                <span className="font-medium">{quiz.questionCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Difficulty:</span>
                                <span className="font-medium">{quiz.difficulty}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Coverage:</span>
                                <span className="font-medium">{quiz.coverage}</span>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-destructive hover:text-destructive border-destructive/50 hover:border-destructive"
                              onClick={() => {
                                setQuizToDelete(quiz.id);
                                setOpenDeleteDialog(true);
                              }}
                            >
                              Delete Quiz
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button size="sm" onClick={() => handleStartQuizClick(quiz)}>
                         Start Quiz <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
            
            <Card 
              className="border-dashed flex items-center justify-center h-[180px] cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setOpenGenerateDialog(true)}
            >
              <div className="text-center">
                <Plus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="font-medium">Generate New Quiz</p>
              </div>
            </Card>
          </div>
        )}
      </div>
      
       <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ChartBar className="mr-2 h-5 w-5 text-purple-500" /> Performance Analytics
          </CardTitle>
          <CardDescription>Track your quiz performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center bg-muted/30 rounded-md">
            <p className="text-muted-foreground">Take quizzes to view your performance analytics</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">View Detailed Statistics</Button>
        </CardFooter>
      </Card>

      <Dialog open={openGenerateDialog} onOpenChange={setOpenGenerateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate New Quiz</DialogTitle>
            <DialogDescription>
              Create AI-generated quiz questions from your course material
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateQuiz)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quiz Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title for your quiz" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your quiz a descriptive name (e.g., "Network Security Basics")
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="questionCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Questions</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={5}
                        max={50}
                        placeholder="10" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      How many quiz questions would you like to generate? (5-50)
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty Level</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the difficulty level for your quiz questions
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Coverage</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select coverage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Chapters 1-5">Chapters 1-5</SelectItem>
                        <SelectItem value="Chapters 6-10">Chapters 6-10</SelectItem>
                        <SelectItem value="All Chapters">All Chapters</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Specify what content the quiz should cover
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenGenerateDialog(false)}
                  disabled={isGenerating}
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
                    "Generate Quiz"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingQuiz?.title}</DialogTitle>
            <DialogDescription>
              {viewingQuiz?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {viewingQuiz?.questions?.length ? (
              <div className="space-y-6">
                {viewingQuiz.questions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="mb-2 flex justify-between items-center">
                      <Badge variant="outline" className="mb-2">Question {index + 1}</Badge>
                    </div>
                    <p className="font-medium mb-3">{question.question}</p>
                    
                    <div className="space-y-2 mb-3">
                      {question.options.map((option, optIndex) => (
                        <div 
                          key={optIndex} 
                          className={`flex items-center p-2 rounded-md ${
                            optIndex === question.correctAnswerIndex 
                              ? "bg-green-100 border border-green-300" 
                              : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <div className="flex-shrink-0 mr-2">
                            <div className={`w-6 h-6 flex items-center justify-center rounded-full ${
                              optIndex === question.correctAnswerIndex 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200"
                            }`}>
                              {String.fromCharCode(65 + optIndex)}
                            </div>
                          </div>
                          <div>{option}</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 text-sm">
                      <p className="font-medium mb-1">Explanation:</p>
                      <p className="text-muted-foreground">{question.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                <p className="text-muted-foreground">No questions available in this quiz</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-end gap-3 mt-4">
            <Button 
              onClick={() => setOpenViewDialog(false)}
            >
              Close
            </Button>
            {viewingQuiz && (
              <Button 
                onClick={() => {
                  setOpenViewDialog(false);
                  handleStartQuizClick(viewingQuiz);
                }}
              >
                Start Quiz
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStartQuizDialogOpen} onOpenChange={setIsStartQuizDialogOpen}>
        <DialogContent>
          {selectedQuizForAction && (
            <>
              <DialogHeader>
                <DialogTitle>Start "{selectedQuizForAction.title}"</DialogTitle>
                <DialogDescription>
                  You are about to start a {selectedQuizForAction.questionCount}-question quiz that takes approximately {selectedQuizForAction.timeEstimate} minutes.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <h4 className="font-medium mb-2">Quiz Settings:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Difficulty:</span>
                    <span className="font-medium">{selectedQuizForAction.difficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coverage:</span>
                    <span className="font-medium">{selectedQuizForAction.coverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Limit:</span>
                    <span className="font-medium">{selectedQuizForAction.timeEstimate} minutes</span>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex space-x-2">
                <Button variant="outline" onClick={() => {setIsStartQuizDialogOpen(false); setSelectedQuizForAction(null);}}>Cancel</Button>
                <Button onClick={confirmStartQuiz}>Begin Quiz</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quiz
              and all its questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuizToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuizzesPage;
