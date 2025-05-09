
import { ChatBot } from "@/components/chat/ChatBot";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SuperStu = () => {
  const navigate = useNavigate();
  const suggestions = [
    "Explain the OSI model layers and their functions",
    "What are the best practices for network segmentation?",
    "How do VPNs work and what security features should I look for?",
    "Explain the concept of zero trust security architecture"
  ];

  const handleGoToFlashcards = () => {
    navigate("/flashcards");
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Super Tutor"
        description="Upload your class materials and use AI-powered tools to help you understand complex concepts and answer your questions."
      />

      <div className="flex flex-col gap-4 mb-6">
        <Button onClick={handleGoToFlashcards} className="w-fit">
          Generate Flashcards
        </Button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot 
          suggestions={suggestions}
          title="Class Assistant" 
          knowledgeBase="Network Security Concepts"
        />
      </div>
    </div>
  );
};

export default SuperStu;
