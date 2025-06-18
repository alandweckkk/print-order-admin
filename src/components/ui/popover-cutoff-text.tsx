"use client";

import { useState, useRef, useEffect } from 'react';

interface PopoverCutoffTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export function PopoverCutoffText({ 
  text, 
  maxLength = 20, 
  className = "" 
}: PopoverCutoffTextProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Truncate text if needed
  const displayText = text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
  
  const needsTruncation = text.length > maxLength;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = async () => {
    if (!needsTruncation) return;
    
    setShowPopover(true);
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleMouseLeave = () => {
    setShowPopover(false);
  };

  return (
    <div className="relative inline-block">
      <div
        ref={textRef}
        className={`${className} ${needsTruncation ? 'cursor-pointer' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {displayText}
      </div>
      
      {showPopover && needsTruncation && (
        <div
          ref={popoverRef}
          className="absolute z-50 p-2 bg-gray-900 text-white text-sm rounded-md shadow-lg max-w-md break-words"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-8px)',
            minWidth: '200px',
          }}
        >
          <div className="mb-1">{text}</div>
          <div className="text-xs text-gray-400">
            {copied ? '✓ Copied to clipboard' : 'Copying to clipboard...'}
          </div>
          
          {/* Arrow pointing down */}
          <div
            className="absolute w-0 h-0"
            style={{
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgb(17 24 39)',
            }}
          />
        </div>
      )}
    </div>
  );
} 