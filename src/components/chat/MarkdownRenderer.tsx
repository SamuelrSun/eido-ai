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
    // Be careful with this if italics are part of URLs or other constructs
    // For now, let's assume standard markdown italics.
    rendered = rendered.replace(/(?<!\S)(\*|_)(?!\s)((?:(?!\1).)+)(?<!\s)\1(?!\S)/g, '<em>$2</em>');


    // Replace links - **MODIFIED TO CLEAN URLS**
    rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, rawUrl) => {
      let cleanUrl = rawUrl;
      
      // Apply the specific hotfix for the "file_storage" malformation
      if (cleanUrl.includes('file%3Cem%3Estorage')) {
        console.warn("[MarkdownRenderer] Malformed URL (encoded em) detected:", cleanUrl);
        cleanUrl = cleanUrl.replace(/file%3Cem%3Estorage/gi, 'file_storage');
        console.warn("[MarkdownRenderer] Attempted fix (encoded em):", cleanUrl);
      } else if (cleanUrl.includes('file%3C\/em%3Estorage')) { // Check for encoding with slash
        console.warn("[MarkdownRenderer] Malformed URL (encoded em with slash) detected:", cleanUrl);
        cleanUrl = cleanUrl.replace(/file%3C\/em%3Estorage/gi, 'file_storage');
        console.warn("[MarkdownRenderer] Attempted fix (encoded em with slash):", cleanUrl);
      } else if (cleanUrl.includes('file<em>storage')) { // Check for unencoded version
        console.warn("[MarkdownRenderer] Malformed URL (unencoded em) detected:", cleanUrl);
        cleanUrl = cleanUrl.replace(/file<em>storage/gi, 'file_storage');
        console.warn("[MarkdownRenderer] Attempted fix (unencoded em):", cleanUrl);
      }
      // Ensure the URL is properly encoded for the href attribute, but decode common issues first
      // This step is tricky; for now, we rely on the URL being mostly correct from the backend after our hotfix.
      // A more robust solution might involve a proper URL parsing and reconstruction library if issues persist.
      
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-cybercoach-teal underline">${linkText}</a>`;
    });
    
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
    rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">\$1</code>');
    
    // Replace line breaks with <br /> - This should be one of the last steps
    // to avoid interfering with block elements like lists.
    // Consider processing block elements first, then inline, then line breaks.
    // For simplicity, if the AI is already providing good newlines for paragraphs,
    // we might not need to replace all \n with <br>.
    // Let's make this more conservative: only replace double newlines with paragraph breaks,
    // and single newlines within paragraphs could be <br> if needed, or rely on CSS white-space.
    
    // Convert double newlines to paragraph breaks (basic)
    // This is a simplified approach; a full Markdown parser would handle this more robustly.
    // For now, we'll assume the AI structures paragraphs with double newlines.
    // And that our list processing above handles newlines within lists.
    // The rest of the text will have newlines converted to <br>.
    
    // First, protect newlines within pre/code tags if you add full code block support
    // Then, process paragraphs and lists
    // Finally, convert remaining single newlines to <br /> if desired for general text.
    // For now, keeping the simple \n to <br /> conversion as it was.
    rendered = rendered.replace(/\n/g, '<br />');
    
    return rendered;
  };

  return (
    <div 
      className="markdown-content prose dark:prose-invert prose-sm max-w-none" // Added prose classes for better default styling
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
