// src/components/chat/MarkdownRenderer.tsx
import React, { useEffect, useRef } from 'react';

interface MarkdownRendererProps {
  content: string;
  onCitationClick?: (sourceNumber: number) => void;
}

export function MarkdownRenderer({ content, onCitationClick }: MarkdownRendererProps) {
  
  const renderMarkdown = (text: string) => {
    let rendered = text;
    rendered = rendered.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    rendered = rendered.replace(/(?<!\S)(\*|_)(?!\s)((?:(?!\1).)+)(?<!\s)\1(?!\S)/g, '<em>$2</em>');
    rendered = rendered.replace(/(?:^\s*-\s+(.+)$\n?)+/gm, match => `<ul class="list-disc pl-5 my-2 space-y-0.5">${match.split('\n').filter(Boolean).map(line => `<li>${line.replace(/^\s*-\s+/, '')}</li>`).join('')}</ul>`);
    rendered = rendered.replace(/(?:^\s*\d+\.\s+(.+)$\n?)+/gm, match => `<ol class="list-decimal pl-5 my-2 space-y-0.5">${match.split('\n').filter(Boolean).map(line => `<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`).join('')}</ol>`);
    rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">$1</code>');
    
    // MODIFICATION: Looks for [SOURCE #] and wraps it in a subscript tag.
    rendered = rendered.replace(/\[SOURCE (\d+)]/g, (match, numberStr) => {
      return `<sub><span class="source-citation" data-source-number="${numberStr}">[${numberStr}]</span></sub>`;
    });
    rendered = rendered.replace(/\n/g, '<br />');
    
    return rendered;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (container && onCitationClick) {
      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('source-citation')) {
          const sourceNumber = target.getAttribute('data-source-number');
          if (sourceNumber) {
            event.preventDefault();
            onCitationClick(parseInt(sourceNumber, 10));
          }
        }
      };
      container.addEventListener('click', handleClick);
      return () => {
        if (container) {
          container.removeEventListener('click', handleClick);
        }
      };
    }
  }, [content, onCitationClick]);

  // MODIFICATION: New styles for subscripted, muted-blue citation links.
  const citationStyles = `
    .source-citation {
      font-family: sans-serif;
      color: hsl(220 10% 40%); /* muted-foreground color */
      font-weight: 600;
      cursor: pointer;
      padding: 0 3px;
      text-decoration: none;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .source-citation:hover {
      background-color: hsl(220 13% 91%); /* border color */
      text-decoration: none;
    }
  `;
  return (
    <>
      <style>{citationStyles}</style>
      <div 
        ref={containerRef}
        className="markdown-content prose dark:prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </>
  );
}