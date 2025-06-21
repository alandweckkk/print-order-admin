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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleMouseEnter = () => {
    if (!needsTruncation) return;
    setShowPopover(true);
  };

  const handleMouseLeave = () => {
    setShowPopover(false);
  };

  const handleClick = async () => {
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

  return (
    <div className="relative inline-block">
      <div
        ref={textRef}
        className={`${className} cursor-pointer`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {displayText}
      </div>
      
      {showPopover && needsTruncation && (
        <div
          ref={popoverRef}
          className="absolute z-50 bg-gray-900 text-white text-sm rounded-md shadow-lg transition-all duration-200"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-8px)',
            width: '300px',
            height: 'auto',
            padding: '12px',
            border: copied ? '1px solid #10b981' : '1px solid transparent',
          }}
        >
          <div className="break-words" style={{ whiteSpace: 'pre-wrap' }}>
            {text}
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