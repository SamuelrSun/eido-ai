// src/components/chat/MarkdownRenderer.tsx
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  
  const renderMarkdown = (text: string) => {
    let rendered = text;
    // --- MODIFICATION START ---
    // The regular expressions for bold, italics, lists, and code remain.
    // The regex for [Source X] has been REMOVED.
    rendered = rendered.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    rendered = rendered.replace(/(?<!\S)(\*|_)(?!\s)((?:(?!\1).)+)(?<!\s)\1(?!\S)/g, '<em>$2</em>');
    rendered = rendered.replace(/(?:^\s*-\s+(.+)$\n?)+/gm, match => `<ul class="list-disc pl-5 my-2 space-y-0.5">${match.split('\n').filter(Boolean).map(line => `<li>${line.replace(/^\s*-\s+/, '')}</li>`).join('')}</ul>`);
    rendered = rendered.replace(/(?:^\s*\d+\.\s+(.+)$\n?)+/gm, match => `<ol class="list-decimal pl-5 my-2 space-y-0.5">${match.split('\n').filter(Boolean).map(line => `<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`).join('')}</ol>`);
    rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">$1</code>');
    
    // The replace for [Source X] is now gone.
    
    // This replace for newlines should also be removed to respect paragraph breaks from the AI.
    // rendered = rendered.replace(/\n/g, '<br />');
    // --- MODIFICATION END ---
    
    return rendered;
  };

  // The useEffect for handling clicks on citations has also been removed.

  return (
    <div
      className="markdown-content prose dark:prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}