import React, { useState, useRef, useEffect } from 'react';
import { Input } from './input';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSuggestions?: number;
  isLoading?: boolean;
  noResultsText?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  disabled,
  className,
  maxSuggestions = 10,
  isLoading = false,
  noResultsText = "No suggestions found"
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter suggestions based on input value
  useEffect(() => {
    if (value.trim() === '') {
      setFilteredSuggestions([]);
      setIsOpen(false);
      return;
    }

    const searchValue = value.toLowerCase();
    
    // Priority scoring for better relevance
    const scored = suggestions
      .map(suggestion => {
        const lower = suggestion.toLowerCase();
        let score = 0;
        
        // Exact match gets highest score
        if (lower === searchValue) score = 1000;
        // Starts with gets high score
        else if (lower.startsWith(searchValue)) score = 500;
        // Contains gets medium score
        else if (lower.includes(searchValue)) score = 100;
        // No match gets zero score
        else return null;
        
        return { suggestion, score };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, maxSuggestions)
      .map(item => item!.suggestion);

    setFilteredSuggestions(scored);
    setIsOpen(scored.length > 0);
    setSelectedIndex(-1);
  }, [value, suggestions, maxSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle input focus
  const handleFocus = () => {
    if (value.trim() === '' && suggestions.length > 0) {
      // Show all suggestions when input is empty
      setFilteredSuggestions(suggestions.slice(0, maxSuggestions));
      setIsOpen(true);
    } else if (filteredSuggestions.length > 0) {
      setIsOpen(true);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        listRef.current && 
        !listRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`pr-8 ${className}`}
        autoComplete="off"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {(isOpen || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-center">
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-500">Loading suggestions...</span>
              </div>
            </div>
          ) : filteredSuggestions.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredSuggestions.map((suggestion, index) => {
              // Highlight matching text
              const highlightText = (text: string, highlight: string) => {
                if (!highlight.trim()) return text;
                
                const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                const parts = text.split(regex);
                
                return parts.map((part, i) => 
                  regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200 text-yellow-800 px-0.5 rounded">{part}</mark>
                  ) : part
                );
              };

              return (
                <li
                  key={suggestion}
                  className={`px-4 py-3 cursor-pointer transition-all duration-150 ${
                    index === selectedIndex
                      ? 'bg-blue-50 text-blue-900 border-l-3 border-blue-500 shadow-sm'
                      : 'text-gray-900 hover:bg-gray-50 hover:shadow-sm'
                  }`}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {highlightText(suggestion, value)}
                      </span>
                    </div>
                    {index === selectedIndex && (
                      <div className="flex items-center ml-2">
                        <span className="text-xs text-blue-500 mr-1">Press Enter</span>
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            
            {suggestions.length > filteredSuggestions.length && (
              <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span>
                  Showing {filteredSuggestions.length} of {suggestions.filter(s => 
                    s.toLowerCase().includes(value.toLowerCase())
                  ).length} matches
                </span>
                <div className="flex items-center text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Use ↑↓ to navigate, Enter to select
                </div>
              </div>
            )}
          </ul>
          ) : (
            <div className="px-4 py-3 text-center">
              <div className="flex flex-col items-center">
                <svg className="w-6 h-6 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-gray-500">{noResultsText}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}