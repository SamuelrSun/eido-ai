// src/pages/PlaceholderPage.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Construction } from "lucide-react"; // Using Construction icon

interface PlaceholderPageProps {
  pageName?: string; // Optional prop to customize the message slightly
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ pageName }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px)-4rem)] text-center p-4">
      <Construction className="w-24 h-24 text-yellow-500 mb-8" strokeWidth={1} />
      <h1 className="text-4xl font-bold mb-4">
        {pageName ? `${pageName} - Coming Soon!` : "New Features Coming Soon!"}
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        We're working hard to bring you this feature. Stay tuned!
      </p>
      <Button asChild>
        <Link to="/">Return to Home</Link>
      </Button>
    </div>
  );
};

export default PlaceholderPage;
