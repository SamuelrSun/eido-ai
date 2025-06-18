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
    
    // Render citations as "[SOURCE #]"
    rendered = rendered.replace(/\(SOURCE (\d+)\)/g, (match, numberStr) => {
      return `<span class="source-citation" data-source-number="${numberStr}">[SOURCE ${numberStr}]</span>`;
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
  
  const citationStyles = `
    .source-citation {
      font-size: 0.75em;
      vertical-align: super;
      color: #005780;
      font-weight: 600;
      cursor: pointer;
      padding: 0 2px;
      text-decoration: none;
      border-radius: 4px;
    }
    .source-citation:hover {
      background-color: #e0f2fe;
      text-decoration: underline;
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