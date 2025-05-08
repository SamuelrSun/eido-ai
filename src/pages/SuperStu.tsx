
import { ChatBot } from "@/components/chat/ChatBot";
import { PageHeader } from "@/components/layout/PageHeader";

const SuperStu = () => {
  const suggestions = [
    "Explain the OSI model layers and their functions",
    "What are the best practices for network segmentation?",
    "How do VPNs work and what security features should I look for?",
    "Explain the concept of zero trust security architecture"
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Search"
        description="Upload your class materials and use AI-powered tools to help you understand complex concepts and answer your questions."
      />

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
