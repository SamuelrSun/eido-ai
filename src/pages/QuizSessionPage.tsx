
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { quizService, Quiz, QuizQuestion } from "@/services/quiz";
import { Clock, CheckSquare, ArrowLeft, ArrowRight, AlertCircle, Check, Timer, Play, CircleStop } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";

interface QuizAnswer {
  questionIndex: number;
  selectedOptionIndex: number | null;
}

const QuizSessionPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load quiz data
  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) {
        toast.error("Quiz ID is missing");
        navigate("/quizzes");
        return;
      }
      
      setIsLoading(true);
      
      try {
        const loadedQuiz = await quizService.fetchQuiz(quizId);
        if (!loadedQuiz) {
          toast.error("Quiz not found");
          navigate("/quizzes");
          return;
        }
        
        setQuiz(loadedQuiz);
        
        // Initialize answers array with null selections
        const initialAnswers = loadedQuiz.questions.map((_, index) => ({
          questionIndex: index,
          selectedOptionIndex: null
        }));
        
        setAnswers(initialAnswers);
        
        // Set up timer - convert minutes to seconds
        setTimeRemaining(loadedQuiz.timeEstimate * 60);
      } catch (error) {
        console.error("Error loading quiz:", error);
        toast.error("Failed to load quiz");
        navigate("/quizzes");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuiz();
  }, [quizId, navigate]);
  
  // Timer logic
  useEffect(() => {
    if (isLoading || quizSubmitted || !quiz) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up, submit the quiz automatically
          clearInterval(timerRef.current!);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading, quizSubmitted, quiz]);
  
  // Handle selecting an answer option
  const handleSelectOption = (optionIndex: number) => {
    if (quizSubmitted) return;
    
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex].selectedOptionIndex = optionIndex;
    setAnswers(updatedAnswers);
  };
  
  // Submit the quiz
  const handleSubmitQuiz = () => {
    if (!quiz) return;
    
    // Calculate score
    let correctCount = 0;
    
    answers.forEach((answer, index) => {
      if (answer.selectedOptionIndex === quiz.questions[index].correctAnswerIndex) {
        correctCount++;
      }
    });
    
    setScore({
      correct: correctCount,
      total: quiz.questions.length
    });
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setQuizSubmitted(true);
    toast.success("Quiz submitted successfully");
  };
  
  // Navigate between questions
  const goToNextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    if (!quiz) return 0;
    
    const answeredCount = answers.filter(answer => answer.selectedOptionIndex !== null).length;
    return Math.floor((answeredCount / quiz.questions.length) * 100);
  };
  
  // Check if all questions are answered
  const allQuestionsAnswered = (): boolean => {
    return answers.every(answer => answer.selectedOptionIndex !== null);
  };
  
  // Get the current question
  const getCurrentQuestion = (): QuizQuestion | null => {
    if (!quiz || !quiz.questions.length) return null;
    return quiz.questions[currentQuestionIndex];
  };
  
  // Render question navigation buttons
  const renderQuestionNav = () => {
    if (!quiz) return null;
    
    return (
      <div className="flex flex-wrap gap-2 my-4">
        {quiz.questions.map((_, index) => (
          <Button
            key={index}
            variant={currentQuestionIndex === index ? "default" : "outline"}
            size="sm"
            className={`w-10 h-10 ${
              answers[index].selectedOptionIndex !== null ? "bg-muted-foreground/10" : ""
            }`}
            onClick={() => setCurrentQuestionIndex(index)}
          >
            {index + 1}
          </Button>
        ))}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Timer className="h-10 w-10 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {!quizSubmitted ? (
        // Active Quiz UI
        <>
          <div className="flex items-center justify-between">
            <PageHeader 
              title={quiz?.title || "Quiz Session"}
              description={quiz?.description || ""}
            />
            
            <Card className="w-auto">
              <CardContent className="py-4 flex items-center">
                <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
                <span className="text-xl font-mono">
                  {formatTime(timeRemaining)}
                </span>
              </CardContent>
            </Card>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress: {getProgressPercentage()}%</span>
              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quiz?.questions.length}
              </span>
            </div>
            <Progress value={getProgressPercentage()} />
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Question {currentQuestionIndex + 1}</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CheckSquare className="h-4 w-4 mr-1" />
                  <span>{quiz?.difficulty}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-lg font-medium">{getCurrentQuestion()?.question}</p>
                <RadioGroup 
                  value={answers[currentQuestionIndex]?.selectedOptionIndex?.toString() || ""}
                  onValueChange={(value) => handleSelectOption(parseInt(value))}
                  className="space-y-3"
                >
                  {getCurrentQuestion()?.options.map((option, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 rounded-md border">
                      <RadioGroupItem id={`option-${index}`} value={index.toString()} />
                      <label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={goToPrevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              {currentQuestionIndex < (quiz?.questions.length || 0) - 1 ? (
                <Button onClick={goToNextQuestion}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmitQuiz}
                  disabled={!allQuestionsAnswered()}
                >
                  Submit Quiz
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {renderQuestionNav()}
          
          <div className="flex justify-between items-center mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                const confirmed = window.confirm("Are you sure you want to quit? Your progress will be lost.");
                if (confirmed) {
                  navigate("/quizzes");
                }
              }}
            >
              Quit Quiz
            </Button>
            <Button 
              onClick={handleSubmitQuiz} 
              disabled={!allQuestionsAnswered()}
            >
              Submit Quiz
            </Button>
          </div>
        </>
      ) : (
        // Quiz Results UI
        <>
          <PageHeader 
            title="Quiz Results" 
            description={`You've completed "${quiz?.title}"`}
          />
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Score</span>
                <span className="text-2xl">{score.correct}/{score.total}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Score: {Math.round((score.correct / score.total) * 100)}%</span>
                  </div>
                  <Progress value={Math.round((score.correct / score.total) * 100)} className="h-3" />
                </div>
                
                <div className="pt-4 grid gap-4 grid-cols-2">
                  <div className="bg-green-50 p-3 rounded-md border border-green-100">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-green-800 font-medium">Correct</span>
                    </div>
                    <p className="text-2xl font-bold ml-7 text-green-700">{score.correct}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md border border-red-100">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-red-800 font-medium">Incorrect</span>
                    </div>
                    <p className="text-2xl font-bold ml-7 text-red-700">{score.total - score.correct}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Review Questions</h2>
            
            {quiz?.questions.map((question, qIndex) => {
              const userAnswer = answers[qIndex].selectedOptionIndex;
              const isCorrect = userAnswer === question.correctAnswerIndex;
              
              return (
                <Card 
                  key={qIndex} 
                  className={`${
                    isCorrect ? "border-green-200" : "border-red-200"
                  }`}
                >
                  <CardHeader className={`${
                    isCorrect ? "bg-green-50" : "bg-red-50"
                  } border-b ${
                    isCorrect ? "border-green-100" : "border-red-100"
                  }`}>
                    <CardTitle className="text-lg flex justify-between">
                      <span>Question {qIndex + 1}</span>
                      {isCorrect ? (
                        <span className="flex items-center text-green-600 text-sm font-medium">
                          <Check className="h-4 w-4 mr-1" /> Correct
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 text-sm font-medium">
                          <AlertCircle className="h-4 w-4 mr-1" /> Incorrect
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="font-medium mb-4">{question.question}</p>
                    
                    <div className="space-y-2">
                      {question.options.map((option, oIndex) => (
                        <div
                          key={oIndex}
                          className={`p-3 rounded-md border ${
                            oIndex === question.correctAnswerIndex
                              ? "bg-green-50 border-green-300"
                              : oIndex === userAnswer
                                ? "bg-red-50 border-red-300"
                                : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 text-xs">
                              {String.fromCharCode(65 + oIndex)}
                            </span>
                            <span>{option}</span>
                            {oIndex === question.correctAnswerIndex && (
                              <Check className="ml-auto h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t">
                      <p className="font-medium text-sm">Explanation:</p>
                      <p className="text-muted-foreground">{question.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => navigate("/quizzes")}>
              Back to Quizzes
            </Button>
            <Button onClick={() => {
              // Reset and retake the same quiz
              setAnswers(quiz?.questions.map((_, index) => ({
                questionIndex: index,
                selectedOptionIndex: null
              })) || []);
              setCurrentQuestionIndex(0);
              setQuizSubmitted(false);
              setTimeRemaining(quiz?.timeEstimate ? quiz.timeEstimate * 60 : 600);
            }}>
              <Play className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizSessionPage;
