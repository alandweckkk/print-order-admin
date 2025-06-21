import { useRef, useEffect, useCallback, useState } from 'react';

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

interface TableEnvelopePreviewProps {
  shippingAddress: any;
  className?: string;
}

// Helper function to format shipping address
const formatShippingAddressMultiLine = (address: any): string[] => {
  if (!address || typeof address !== 'object') {
    return ['No Address Available'];
  }

  const lines: string[] = [];
  
  // Add name if available
  if (address.name) {
    lines.push(address.name);
  }
  
  // Add address line 1
  if (address.line1) {
    lines.push(address.line1);
  }
  
  // Add address line 2 if available
  if (address.line2) {
    lines.push(address.line2);
  }
  
  // Add city, state, postal code
  const cityStateZip = [
    address.city,
    address.state,
    address.postal_code
  ].filter(Boolean).join(', ');
  
  if (cityStateZip) {
    lines.push(cityStateZip);
  }
  
  // Add country if it's not US
  if (address.country && address.country !== 'US') {
    lines.push(address.country);
  }
  
  return lines.length > 0 ? lines : ['No Address Available'];
};

function EnvelopeCanvas({ shippingAddress, width = 120, height = 80 }: { shippingAddress: any, width?: number, height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Convert shipping address to formatted text
  const getShippingAddressText = useCallback(() => {
    if (!shippingAddress) {
      return 'No Address Available';
    }
    
    const addressLines = formatShippingAddressMultiLine(shippingAddress);
    return addressLines.join('\n');
  }, [shippingAddress]);

  // Create text elements with actual shipping address
  const textElements: TextElement[] = [
    {
      id: 'sender-address',
      text: 'MakeMeASticker\n125 Cervantes Blvd\nSan Francisco, CA 94123',
      x: 8,
      y: 12,
      fontSize: Math.max(6, width * 0.05),
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left'
    },
    {
      id: 'recipient-address',
      text: getShippingAddressText(),
      x: width / 2,
      y: height / 2 + 8,
      fontSize: Math.max(7, width * 0.06),
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'center'
    }
  ];

  // Draw canvas content
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw text elements
    textElements.forEach(element => {
      ctx.save();
      
      // Move to element position
      ctx.translate(element.x, element.y);

      // Set font properties
      const fontStyle = element.fontStyle === 'italic' ? 'italic ' : '';
      const fontWeight = element.fontWeight === 'bold' ? 'bold ' : '';
      ctx.font = `${fontStyle}${fontWeight}${element.fontSize}px ${element.fontFamily}`;
      ctx.fillStyle = element.color;
      ctx.textAlign = element.textAlign;
      
      // Split text into lines
      const lines = element.text.split('\n');
      const lineHeight = element.fontSize * 1.2; // 1.2 line spacing
      
      // Draw each line of text
      lines.forEach((line, index) => {
        const yOffset = index * lineHeight;
        ctx.fillText(line, 0, yOffset);
      });

      ctx.restore();
    });
  }, [textElements, width, height]);

  // Update canvas when elements change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border bg-white rounded"
    />
  );
}

export function TableEnvelopePreview({ shippingAddress, className = "" }: TableEnvelopePreviewProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const thumbnailRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (thumbnailRef.current) {
      const rect = thumbnailRef.current.getBoundingClientRect();
      const popoverWidth = 700;
      const popoverHeight = 500;
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
      const addressText = formatShippingAddressMultiLine(shippingAddress).join('\n');
      await navigator.clipboard.writeText(addressText);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <>
      <div 
        ref={thumbnailRef}
        className={`relative cursor-pointer group ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        title="Click to copy address • Hover to preview envelope"
      >
        <div className="h-12 w-16 bg-gray-100 rounded border flex items-center justify-center hover:bg-gray-200 transition-colors group-hover:shadow-sm">
          <EnvelopeCanvas shippingAddress={shippingAddress} width={56} height={36} />
        </div>
      </div>
      
      {showPopover && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 transition-opacity duration-200 ease-in-out"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            width: '700px',
            height: '500px',
            minWidth: '700px',
            minHeight: '500px',
            maxWidth: '700px',
            maxHeight: '500px',
            opacity: showPopover ? 1 : 0,
          }}
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{ height: 'calc(100% - 2rem)' }} className="flex flex-col">
            <p className="text-sm font-medium text-gray-900 mb-2">Envelope Preview</p>
            <div className="bg-gray-50 p-2 rounded border flex-1 flex items-center justify-center" style={{ minHeight: '450px' }}>
              <EnvelopeCanvas shippingAddress={shippingAddress} width={670} height={450} />
            </div>
          </div>
        </div>
      )}
    </>
  );
} 