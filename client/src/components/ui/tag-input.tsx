import React, { useState, KeyboardEvent, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

const TagInput = forwardRef<HTMLDivElement, TagInputProps>(
  ({ value = [], onChange, placeholder = "Add tag...", className, disabled = false, error }, ref) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag();
      } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
        removeTag(value.length - 1);
      }
    };

    const addTag = () => {
      const trimmedValue = inputValue.trim();
      if (trimmedValue) {
        // Split by comma and filter out empty values and duplicates
        const newTags = trimmedValue
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag && !value.includes(tag));
        
        if (newTags.length > 0) {
          onChange([...value, ...newTags]);
        }
        setInputValue('');
      }
    };

    const removeTag = (index: number) => {
      const newTags = value.filter((_, i) => i !== index);
      onChange(newTags);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    return (
      <div ref={ref} className={cn("w-full", className)}>
        <div
          className={cn(
            "flex min-h-9 w-full flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-xs focus-within:border-neutral-950 focus-within:ring-[3px] focus-within:ring-neutral-950/50 dark:border-neutral-800 dark:focus-within:border-neutral-300 dark:focus-within:ring-neutral-300/50",
            disabled && "cursor-not-allowed opacity-50",
            error && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20 dark:border-red-900 dark:focus-within:border-red-900 dark:focus-within:ring-red-900/40"
          )}
        >
          {value.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 focus:outline-none dark:text-blue-300 dark:hover:text-blue-100"
                  onClick={() => removeTag(index)}
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                addTag();
              }
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

TagInput.displayName = 'TagInput';

export { TagInput };