
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PolicyCardProps {
  title: string;
  summary: string;
  details: string;
  icon: React.ReactNode;
  lastUpdated: string;
  department?: string;
}

export function PolicyCard({ title, summary, details, icon, lastUpdated, department }: PolicyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const acknowledgePolicy = () => {
    setAcknowledged(true);
  };

  return (
    <div className="policy-card overflow-hidden">
      <div className="flex items-start">
        <div className="p-2 bg-cybercoach-teal-light/20 text-cybercoach-teal rounded-md">
          {icon}
        </div>
        
        <div className="ml-4 flex-grow">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">{title}</h3>
            {department && (
              <Badge variant="secondary" className="ml-2">
                {department}
              </Badge>
            )}
          </div>
          
          <p className="text-gray-600 mt-1">{summary}</p>
        </div>
      </div>
      
      <div className={`mt-4 transition-all duration-300 ${expanded ? 'max-h-[500px]' : 'max-h-0'} overflow-hidden`}>
        <div className="p-4 bg-slate-50 rounded-md">
          <p className="whitespace-pre-line">{details}</p>
          
          {!acknowledged && (
            <Button 
              onClick={acknowledgePolicy} 
              className="mt-4 bg-cybercoach-blue hover:bg-cybercoach-blue-dark"
            >
              Acknowledge Policy
            </Button>
          )}
          
          {acknowledged && (
            <p className="mt-4 text-sm text-green-600 font-medium">
              ✓ You have acknowledged this policy
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Last updated: {lastUpdated}
        </p>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-cybercoach-blue flex items-center" 
          onClick={toggleExpanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              View More
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
