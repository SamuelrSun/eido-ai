
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Upload, Check, AlertCircle, BookOpen, FileInput } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FeedbackItem {
  questionNumber: number;
  correct: boolean;
  feedback: string;
  explanation: string;
}

export function WorksheetUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const { toast } = useToast();

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, or image file",
        variant: "destructive"
      });
      return;
    }
    
    setFile(selectedFile);
    setIsComplete(false);
    setScore(null);
    setFeedback([]);
    
    toast({
      title: "File selected",
      description: `${selectedFile.name} ready for submission`
    });
  };

  const handleSubmit = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate file upload with progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(i);
      }
      
      setIsUploading(false);
      setIsProcessing(true);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate grade results
      const simulatedScore = Math.floor(Math.random() * 40) + 60; // Score between 60-99
      setScore(simulatedScore);
      
      // Generate simulated feedback
      const simulatedFeedback = generateSimulatedFeedback(simulatedScore);
      setFeedback(simulatedFeedback);
      
      // Complete the process
      setIsProcessing(false);
      setIsComplete(true);
      
      toast({
        title: "Grading complete",
        description: `Your work has been graded with a score of ${simulatedScore}%`
      });
    } catch (error) {
      console.error("Error processing worksheet:", error);
      setIsUploading(false);
      setIsProcessing(false);
      
      toast({
        title: "Grading failed",
        description: "An error occurred while grading your worksheet",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setIsComplete(false);
    setScore(null);
    setFeedback([]);
  };

  // Helper function to generate simulated feedback
  const generateSimulatedFeedback = (score: number): FeedbackItem[] => {
    const feedbackItems: FeedbackItem[] = [];
    const questionCount = Math.floor(Math.random() * 5) + 5; // 5-10 questions
    const correctCount = Math.round((score / 100) * questionCount);
    
    // Create array with correct/incorrect distribution matching the score
    const correctDistribution = Array(questionCount).fill(false)
      .map((_, i) => i < correctCount);
    
    // Shuffle array to randomize correct/incorrect questions
    for (let i = correctDistribution.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [correctDistribution[i], correctDistribution[j]] = 
        [correctDistribution[j], correctDistribution[i]];
    }
    
    // Generate feedback for each question
    for (let i = 0; i < questionCount; i++) {
      const isCorrect = correctDistribution[i];
      
      feedbackItems.push({
        questionNumber: i + 1,
        correct: isCorrect,
        feedback: isCorrect 
          ? "Correct answer" 
          : ["Partially correct", "Incorrect approach", "Missing key steps"][Math.floor(Math.random() * 3)],
        explanation: isCorrect
          ? "Your solution demonstrates a good understanding of the concept."
          : [
              "The correct approach should consider all relevant variables and apply the proper formula.",
              "This problem requires applying the formula in a different way. Review the steps in chapter 4.",
              "Your approach is on the right track, but you missed a critical step in the calculation.",
              "Remember to check your work for algebraic errors and sign mistakes."
            ][Math.floor(Math.random() * 4)]
      });
    }
    
    return feedbackItems;
  };

  return (
    <div className="space-y-6">
      {!isComplete ? (
        <div className="grid grid-cols-1 gap-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted"
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {!isUploading && !isProcessing ? (
              <>
                <div className="bg-secondary/20 p-4 rounded-full">
                  <Upload className="h-8 w-8 text-secondary-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">Upload your completed worksheet</h3>
                  <p className="text-muted-foreground">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports PDF, DOCX, JPG, PNG
                  </p>
                </div>
                <div className="mt-2 w-full max-w-xs">
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileInputChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <FileInput className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                </div>
                
                {file && (
                  <div className="mt-4 w-full max-w-md">
                    <div className="bg-muted p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <BookOpen className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="flex-shrink-0"
                      >
                        Clear
                      </Button>
                    </div>
                    
                    <Button 
                      className="w-full mt-4"
                      onClick={handleSubmit}
                    >
                      Submit for Grading
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full max-w-md space-y-4 py-8">
                {isUploading && (
                  <>
                    <h3 className="text-center font-semibold">Uploading your worksheet...</h3>
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-center text-sm text-muted-foreground">
                      {uploadProgress}% complete
                    </p>
                  </>
                )}
                
                {isProcessing && (
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                    <h3 className="font-semibold">Analyzing your worksheet</h3>
                    <p className="text-sm text-muted-foreground">
                      Our AI is reviewing your answers... This may take a moment.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Results section */}
          <div className="bg-muted/30 p-6 rounded-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Worksheet Results</h2>
                <p className="text-muted-foreground">{file?.name}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{score}%</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                
                <Button variant="outline" onClick={handleReset}>
                  Grade Another Worksheet
                </Button>
              </div>
            </div>
          </div>
          
          {/* Feedback section */}
          <div>
            <h3 className="text-lg font-medium mb-4">Detailed Feedback</h3>
            
            <div className="space-y-4">
              {feedback.map((item) => (
                <Card key={item.questionNumber}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">Question {item.questionNumber}</h4>
                          <Badge variant={item.correct ? "default" : "outline"}>
                            {item.correct ? (
                              <span className="flex items-center gap-1">
                                <Check className="h-3 w-3" /> Correct
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {item.feedback}
                              </span>
                            )}
                          </Badge>
                        </div>
                        
                        <Tabs defaultValue="explanation" className="w-full">
                          <TabsList className="mb-2">
                            <TabsTrigger value="explanation">Explanation</TabsTrigger>
                            <TabsTrigger value="tips">Learning Tips</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="explanation" className="text-sm text-muted-foreground">
                            {item.explanation}
                          </TabsContent>
                          
                          <TabsContent value="tips" className="text-sm text-muted-foreground">
                            {item.correct 
                              ? "Great job! Continue practicing similar problems to reinforce your understanding." 
                              : "Review the related concepts in your textbook and try solving similar practice problems."
                            }
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
