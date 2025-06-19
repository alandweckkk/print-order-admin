"use client";

import { useState, useRef } from 'react';
import Image from 'next/image';

interface TableImagePopoverProps {
  imageUrl: string;
  alt?: string;
}

export function TableImagePopover({ imageUrl, alt = "Thumbnail" }: TableImagePopoverProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [imageLoading, setImageLoading] = useState(true);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (thumbnailRef.current) {
      const rect = thumbnailRef.current.getBoundingClientRect();
      const popoverWidth = 300;
      const popoverHeight = 300;
      const gap = 10;
      
      // Calculate initial position (above and centered)
      let top = rect.top - popoverHeight - gap;
      let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
      
      // Adjust if popover would go off the top of the screen
      if (top < 10) {
        // Position below the thumbnail instead
        top = rect.bottom + gap;
      }
      
      // Adjust if popover would go off the left edge
      if (left < 10) {
        left = 10;
      }
      
      // Adjust if popover would go off the right edge
      if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }
      
      // Adjust if popover would go off the bottom (when positioned below)
      if (top + popoverHeight > window.innerHeight - 10) {
        // Try to position above again, or adjust to fit
        top = Math.max(10, rect.top - popoverHeight - gap);
      }
      
      setPopoverPosition({ top, left });
      setImageLoading(true);
      setShowPopover(true);
    }
  };

  const handleMouseLeave = () => {
    setShowPopover(false);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(imageUrl);
    } catch (err) {
      console.error('Failed to copy image URL:', err);
    }
  };

  return (
    <>
      <div 
        ref={thumbnailRef}
        className="relative w-10 h-10 cursor-pointer group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        title="Click to copy image URL"
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover rounded transition-opacity group-hover:opacity-90"
          sizes="40px"
          unoptimized
        />
      </div>
      
      {showPopover && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 transition-opacity duration-200 ease-in-out"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            width: '300px',
            height: '300px',
            opacity: showPopover ? 1 : 0,
          }}
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="relative w-full h-full">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
              </div>
            )}
            <Image
              src={imageUrl}
              alt={alt}
              fill
              className="object-contain rounded"
              sizes="300px"
              unoptimized
              priority
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
          </div>
        </div>
      )}
    </>
  );
} 