// src/components/chat/MarkdownRenderer.tsx
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderMarkdown = (text: string) => {
    let rendered = text;

    // Replace bold (both ** and __ syntax)
    rendered = rendered.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    
    // Replace italics (both * and _ syntax)
    rendered = rendered.replace(/(?<!\S)(\*|_)(?!\s)((?:(?!\1).)+)(?<!\s)\1(?!\S)/g, '<em>$2</em>');

    // FIX: Updated regex to find and format the new citation style
    // It looks for "(Source: [filename](url))" and makes the link clickable.
    rendered = rendered.replace(/\(Source: \[([^\]]+)\]\(([^)]+)\)\)/g, 
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cybercoach-teal underline">($1)</a>'
    );
    
    // Handle bullet lists properly
    rendered = rendered.replace(
      /(?:^\s*-\s+(.+)$\n?)+/gm, 
      function(match) {
        const items = match.split('\n')
          .filter(line => line.trim().match(/^\s*-\s+/))
          .map(line => `<li>${line.replace(/^\s*-\s+/, '')}</li>`)
          .join('');
        return `<ul class="list-disc pl-5 my-2 space-y-0.5">${items}</ul>`;
      }
    );
    
    // Handle numbered lists
    rendered = rendered.replace(
      /(?:^\s*\d+\.\s+(.+)$\n?)+/gm,
      function(match) {
        const items = match.split('\n')
          .filter(line => line.trim().match(/^\s*\d+\.\s+/))
          .map(line => `<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`)
          .join('');
        return `<ol class="list-decimal pl-5 my-2 space-y-0.5">${items}</ol>`;
      }
    );
    
    // Replace code blocks
    rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">$1</code>');
    
    // Replace line breaks with <br />
    rendered = rendered.replace(/\n/g, '<br />');
    
    return rendered;
  };

  return (
    <div 
      className="markdown-content prose dark:prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
