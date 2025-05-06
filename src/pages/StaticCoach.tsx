
import { ChatBot } from "@/components/chat/ChatBot";

const StaticCoach = () => {
  const suggestions = [
    "What's Zero Trust?",
    "How do I spot a phishing email?", 
    "Password policy best practices", 
    "Secure remote work tips"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-cybercoach-blue-dark">Cybersecurity Coach</h1>
        <p className="text-gray-600 mb-6">
          Ask the AI Coach anything about cybersecurity best practices, policies, or hacker tactics—based on your team's training materials.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot 
          suggestions={suggestions} 
          knowledgeBase="Knowledge Base: Internal Training Slides (v1.2)"
        />
      </div>
    </div>
  );
};

export default StaticCoach;
