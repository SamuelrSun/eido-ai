
import { useState } from "react";
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
  ChartBar 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Sample quiz data
const quizzes = [
  {
    id: 1,
    title: "Network Security Fundamentals",
    description: "Test your knowledge of basic network security concepts and protocols.",
    questions: 15,
    timeEstimate: "15 min",
    difficulty: "Easy",
    chapter: "Chapter 1-3"
  },
  {
    id: 2,
    title: "Encryption Techniques",
    description: "Evaluate your understanding of modern encryption algorithms and methods.",
    questions: 20,
    timeEstimate: "25 min",
    difficulty: "Medium",
    chapter: "Chapter 4-5"
  },
  {
    id: 3,
    title: "Security Vulnerabilities",
    description: "Identify common security vulnerabilities and appropriate mitigation strategies.",
    questions: 25,
    timeEstimate: "30 min",
    difficulty: "Hard",
    chapter: "Chapter 6-8"
  },
  {
    id: 4,
    title: "Final Exam Preparation",
    description: "Comprehensive review of all course material in exam format.",
    questions: 50,
    timeEstimate: "90 min",
    difficulty: "Hard",
    chapter: "All Chapters"
  }
];

const QuizzesPage = () => {
  const navigate = useNavigate();
  const [selectedQuiz, setSelectedQuiz] = useState<null | typeof quizzes[0]>(null);

  // Function to determine difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const startQuiz = () => {
    // In a real app, this would navigate to the quiz taking interface
    console.log(`Starting quiz: ${selectedQuiz?.title}`);
    // Close dialog by setting selected quiz to null
    setSelectedQuiz(null);
  };

  const createNewQuiz = () => {
    // Would navigate to quiz creation wizard in a full implementation
    console.log("Creating new quiz");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground mt-1">Test your knowledge with practice quizzes</p>
        </div>
        <Button onClick={createNewQuiz}>Create Quiz</Button>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{quiz.title}</CardTitle>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                    {quiz.difficulty}
                  </span>
                </div>
                <CardDescription>{quiz.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <FileText className="mr-1 h-4 w-4" /> {quiz.questions} questions
                  </span>
                  <span className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" /> {quiz.timeEstimate}
                  </span>
                  <span>{quiz.chapter}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex w-full justify-between">
                  <Button variant="outline" size="sm" onClick={() => console.log(`View details: ${quiz.id}`)}>
                    Preview
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setSelectedQuiz(quiz)}>
                        Start Quiz <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      {selectedQuiz && (
                        <>
                          <DialogHeader>
                            <DialogTitle>Start "{selectedQuiz.title}"</DialogTitle>
                            <DialogDescription>
                              You are about to start a {selectedQuiz.questions}-question quiz that takes approximately {selectedQuiz.timeEstimate}.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="py-4">
                            <h4 className="font-medium mb-2">Quiz Settings:</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Difficulty:</span>
                                <span className="font-medium">{selectedQuiz.difficulty}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Coverage:</span>
                                <span className="font-medium">{selectedQuiz.chapter}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Time Limit:</span>
                                <span className="font-medium">30 minutes</span>
                              </div>
                            </div>
                          </div>
                          
                          <DialogFooter className="flex space-x-2">
                            <Button variant="outline" onClick={() => setSelectedQuiz(null)}>Cancel</Button>
                            <Button onClick={startQuiz}>Begin Quiz</Button>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Performance Analytics Card */}
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
    </div>
  );
};

export default QuizzesPage;
