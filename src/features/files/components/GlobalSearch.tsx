// src/features/files/components/GlobalSearch.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, FileText, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useDebounce } from '@/hooks/use-debounce'; // We'll create this simple hook next
import { cn } from '@/lib/utils';
import { HighlightedText } from '@/components/chat/HighlightedText'; // Re-using this component for highlighting

// Define the shape of a single search result
interface SearchResult {
  file_id: string;
  file_name: string;
  snippet: string;
  page_number: number;
}

interface GlobalSearchProps {
  selectedClassId: string | null;
  onResultClick: (fileId: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ selectedClassId, onResultClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce the search query to avoid firing requests on every keystroke
  const debouncedQuery = useDebounce(query, 300);

  // Effect to perform the search when the debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('semantic-search', {
          body: { query: debouncedQuery, class_id: selectedClassId },
        });

        if (error) throw new Error(error.message);
        setResults(data || []);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]); // Clear results on error
      } finally {
        setIsSearching(false);
      }
    };
    performSearch();
  }, [debouncedQuery, selectedClassId]);

  // Handle clicks outside of the search component to close the results list
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    onResultClick(result.file_id);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <Command
        shouldFilter={false} // We handle filtering in the backend
        className="rounded-lg border shadow-md"
      >
        <div className="flex items-center px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
                value={query}
                onValueChange={setQuery}
                onFocus={() => setIsOpen(true)}
                placeholder={selectedClassId ? "Search within this class..." : "Select a class to search..."}
                disabled={!selectedClassId}
                className="h-10"
            />
            {isSearching && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
            {query && !isSearching && (
                <button onClick={() => setQuery('')} className="ml-2">
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
            )}
        </div>
        
        {isOpen && (query.length > 0 || results.length > 0) && (
          <div className="absolute top-full mt-2 w-full z-10">
            <CommandList className="rounded-lg border bg-background shadow-lg">
              {results.length === 0 && !isSearching && debouncedQuery.length > 2 && (
                  <CommandEmpty>No results found.</CommandEmpty>
              )}
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={`${result.file_id}-${result.page_number}`}
                    onSelect={() => handleSelectResult(result)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{result.file_name}</span>
                            <span className="text-xs text-muted-foreground">(p. {result.page_number})</span>
                        </div>
                        <div className="text-xs text-muted-foreground pl-6">
                            <HighlightedText text={result.snippet} keywords={debouncedQuery.split(' ')} />
                        </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
};
