
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Basic markdown rendering logic
  const renderMarkdown = (text: string) => {
    // Replace bold (both ** and __ syntax)
    let rendered = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    
    // Replace italics (both * and _ syntax)
    rendered = rendered.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    
    // Replace links
    rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cybercoach-teal underline">$1</a>');
    
    // Replace bullet lists
    rendered = rendered.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
    rendered = rendered.replace(/<li>(.+)<\/li>/g, '<ul class="list-disc pl-5 my-2">$&</ul>');
    
    // Replace code blocks
    rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
    
    // Replace line breaks with <br />
    rendered = rendered.replace(/\n/g, '<br />');
    
    return rendered;
  };

  return (
    <div 
      className="markdown-content" 
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
