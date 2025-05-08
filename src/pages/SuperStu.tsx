
import { ChatBot } from "@/components/chat/ChatBot";
import { GraduationCap } from "lucide-react";

const SuperStu = () => {
  const suggestions = [
    "Explain the OSI model layers and their functions",
    "What are the best practices for network segmentation?",
    "How do VPNs work and what security features should I look for?",
    "Explain the concept of zero trust security architecture"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-purple-700">
          <GraduationCap className="h-7 w-7" />
          Search
        </h1>
        <p className="text-gray-600 mb-6">
          Upload your class materials and use AI-powered tools to help you understand complex concepts and answer your questions.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot 
          suggestions={suggestions}
          title="Class Assistant" 
          knowledgeBase="Network Security Concepts"
          inputAtBottom={true}
        />
      </div>
    </div>
  );
};

export default SuperStu;
