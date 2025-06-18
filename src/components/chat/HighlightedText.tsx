// src/components/chat/HighlightedText.tsx
import React from 'react';

interface HighlightedTextProps {
  text?: string;
  keywords?: string[];
}

export const HighlightedText = ({ text = '', keywords = [] }: HighlightedTextProps) => {
  if (keywords.length === 0 || !text) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  // Escape special characters for each keyword and join them with '|' for the regex
  const escapedKeywords = keywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        // Check if the part is one of the keywords (case-insensitive)
        const isHighlight = keywords.some(kw => kw.toLowerCase() === part.toLowerCase());
        if (isHighlight) { 
          return (
            <mark key={index} className="bg-yellow-300/60 text-black/90 px-1 rounded-sm">
              {part}
            </mark>
          );
        } else {
          return <span key={index}>{part}</span>;
        }
      })}
    </p>
  );
};