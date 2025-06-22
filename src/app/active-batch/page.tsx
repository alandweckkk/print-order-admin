"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { 
  MoreHorizontal, 
  Grid3X3, 
  Maximize2, 
  Download, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Settings
} from "lucide-react";
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { formatShippingAddressMultiLine, ShippingAddress } from '@/lib/data-transformations';
import { fetchBatchesFromDatabase, DatabaseBatch } from './actions/fetch-batches';
import { fetchBatchOrders, BatchOrder } from './actions/fetch-batch-orders';
import { updateStickerSheetUrl } from './actions/update-sticker-sheet-url';

// Note: This page is temporarily disabled while transitioning to database-based batches
// TODO: Implement database-based batch loading to replace localStorage functionality

// Batch interface  
interface Batch {
  batch_id: string;
  name: string;
  created_at: string;
  order_ids: string[]; // UUIDs
  order_data?: OrderData[]; // Store actual order data (optional for backward compatibility)
  processed_images?: { [orderId: string]: string }; // UUID keys
}

// Order data interface for batch storage
interface OrderData {
  id: string; // UUID
  mr_id?: string;
  order_number?: string;
  pmo_order_number?: string;
  pmo_email?: string;
  user_id?: string;
  original_output_image_url?: string;
  mr_original_output_image_url?: string;
  mr_output_image_url?: string;
  output_image_url?: string;
  pmo_status?: string;
  shipping_address?: ShippingAddress;
  pmo_shipping_address?: string;
}

// Shipping address interface


// Order interface for typed state
interface Order {
  id: string; // UUID string
  stripePaymentId: string; // Business identifier
  modelRunId: string;
  orderNumber: string;
  userEmail: string;
  stickerSheetUrl: string;
  originalImageUrl?: string; // Store original image URL for comparison
  envelopeUrl: string;
  status: string;
  isProcessed?: boolean; // Whether the sticker sheet is a processed blob URL
  shippingAddress?: ShippingAddress | string | null; // Add shipping address data
}

type ViewMode = 'horizontal' | 'gallery' | 'one-by-one';

interface OrderCardProps {
  order: Order;
  onRemove: (id: string) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'horizontal-large' | 'one-by-one-huge';
}

// Text element interface for envelope canvas
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
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  rotation: number;
}

// Envelope Canvas Component
interface EnvelopeCanvasProps {
  shippingAddress: ShippingAddress | string | null | undefined;
  className?: string;
  width?: number;
  height?: number;
}

function EnvelopeCanvas({ shippingAddress, className = "", width = 350, height = 250 }: EnvelopeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Convert shipping address to formatted text
  const getShippingAddressText = useCallback(() => {
    console.log('🏠 Shipping address data:', shippingAddress);
    
    if (!shippingAddress) {
      return 'No Address Available';
    }
    
    // Handle string addresses (like pmo_shipping_address)
    if (typeof shippingAddress === 'string') {
      // Split on commas and clean up spacing
      return shippingAddress.split(',').map(line => line.trim()).join('\n');
    }
    
    // Handle structured address objects
    const addressLines = formatShippingAddressMultiLine(shippingAddress);
    console.log('📮 Formatted address lines:', addressLines);
    return addressLines.join('\n');
  }, [shippingAddress]);

  // Create text elements with actual shipping address
  const textElements: TextElement[] = [
    {
      id: 'sender-address',
      text: 'MakeMeASticker\n125 Cervantes Blvd\nSan Francisco, CA 94123',
      x: 45, // 20px padding + 25px margin
      y: 40,
      fontSize: 11,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      rotation: 0
    },
    {
      id: 'recipient-address',
      text: getShippingAddressText(),
      x: width / 2,
      y: height / 2 - 10, // Slightly higher than center
      fontSize: 14,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'bold', // Make it bold for better visibility
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      rotation: 0
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
    ctx.fillStyle = '#ffffff'; // White background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border with 20px padding on left and right
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 0, canvas.width - 40, canvas.height);

    // Draw text elements
    textElements.forEach(element => {
      ctx.save();
      
      // Move to element position
      ctx.translate(element.x, element.y);
      
      // Apply rotation
      if (element.rotation !== 0) {
        ctx.rotate((element.rotation * Math.PI) / 180);
      }

      // Set font properties
      const fontStyle = element.fontStyle === 'italic' ? 'italic ' : '';
      const fontWeight = element.fontWeight === 'bold' ? 'bold ' : '';
      ctx.font = `${fontStyle}${fontWeight}${element.fontSize}px ${element.fontFamily}`;
      ctx.fillStyle = element.color;
      ctx.textAlign = element.textAlign;
      
      // Split text into lines
      const lines = element.text.split('\n');
      const lineHeight = element.fontSize * 1.3; // Increased line spacing for better readability
      
      // Draw each line of text
      lines.forEach((line, index) => {
        const yOffset = index * lineHeight;
        ctx.fillText(line, 0, yOffset);
      });

      ctx.restore();
    });
  }, [textElements]);

  // Update canvas when elements change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div className={`${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border bg-white"
      />
    </div>
  );
}

function OrderCard({ order, onRemove, className = "", size = 'medium' }: OrderCardProps) {
  const sizeClasses = {
    'small': 'w-64',
    'medium': 'w-80',
    'large': 'w-96',
    'horizontal-large': 'w-80 flex-shrink-0',
    'one-by-one-huge': 'w-[1300px] max-w-[1300px]'   // Exactly 1300px max width for one-by-one view
  };

  const imageClasses = {
    'small': 'h-48',
    'medium': 'h-64',
    'large': 'h-80',
    'horizontal-large': 'h-64',
    'one-by-one-huge': 'h-[684px]'   // 484px + 200px = 684px for one-by-one
  };

  return (
    <Card className={`${sizeClasses[size]} ${className} flex-shrink-0 shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        {/* Toolbar/Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Order #{order.orderNumber}</h3>
            <Badge 
              variant={order.status === "Ready" ? "default" : "secondary"}
              className={order.status === "Ready" ? "bg-green-100 text-green-800" : ""}
            >
              {order.status}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(order.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <X className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Remove</span>
          </Button>
        </div>
        
        {/* Side by side layout for one-by-one-huge view */}
        {size === 'one-by-one-huge' ? (
          <div className="flex gap-6 mb-4">
            {/* Sticker Sheet Preview - Left Side */}
            <div className="flex-1">
              <div className={`${imageClasses[size]} bg-gray-100 rounded-lg mb-2 overflow-hidden relative py-2.5`}>
                {order.isProcessed && order.originalImageUrl ? (
                  // Show sticker sheet centered with original as small thumbnail in bottom-left
                  <>
                    {/* Main sticker sheet - centered */}
                    <div className="flex items-center justify-center h-full">
                      <img 
                        src={order.stickerSheetUrl} 
                        alt="3-up Sticker Sheet"
                        className="h-full w-auto object-contain"
                      />
                    </div>
                    {/* Original image thumbnail - bottom-left corner */}
                    <div className="absolute bottom-0 left-0 w-[50px] h-[50px] border-2 border-white rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={order.originalImageUrl} 
                        alt="Original Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </>
                ) : (
                  // Show single image (original or processed)
                  <div className="flex items-center justify-center h-full">
                    <img 
                      src={order.stickerSheetUrl} 
                      alt="Sticker Sheet Preview"
                      className="h-full w-auto object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end">
                {order.isProcessed && (
                  <Badge className="bg-green-100 text-green-700 text-xs px-1 py-0">
                    Processed
                  </Badge>
                )}
              </div>
            </div>

            {/* Envelope Preview - Right Side */}
            <div className="flex-1">
              <div className="bg-gray-50 rounded-lg flex items-center justify-center p-8 min-h-[600px]">
                <EnvelopeCanvas 
                  shippingAddress={order.shippingAddress}
                  width={700}
                  height={500}
                  className="rounded shadow-sm"
                />
              </div>
            </div>
          </div>
        ) : (
          // Original vertical layout for other sizes
          <>
            {/* Sticker Sheet Preview */}
            <div className="mb-3">
              <div className={`${imageClasses[size]} bg-gray-100 rounded-lg mb-2 overflow-hidden relative`}>
                {order.isProcessed && order.originalImageUrl ? (
                  // Show sticker sheet centered with original as small thumbnail in bottom-left
                  <>
                    {/* Main sticker sheet - centered */}
                    <div className="flex items-center justify-center h-full">
                      <img 
                        src={order.stickerSheetUrl} 
                        alt="3-up Sticker Sheet"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {/* Original image thumbnail - bottom-left corner */}
                    <div className="absolute bottom-0 left-0 w-[50px] h-[50px] border-2 border-white rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={order.originalImageUrl} 
                        alt="Original Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </>
                ) : (
                  // Show single image (original or processed)
                  <div className="flex items-center justify-center h-full">
                    <img 
                      src={order.stickerSheetUrl} 
                      alt="Sticker Sheet Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end">
                {order.isProcessed && (
                  <Badge className="bg-green-100 text-green-700 text-xs px-1 py-0">
                    Processed
                  </Badge>
                )}
              </div>
            </div>

            {/* Envelope Preview */}
            <div className="mb-4">
              <div className="bg-gray-50 rounded-lg mb-2 flex items-center justify-center p-8 min-h-[600px]">
                <EnvelopeCanvas 
                  shippingAddress={order.shippingAddress}
                  width={700}
                  height={500}
                  className="rounded shadow-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* Order Details */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Email:</span>
            <span className="truncate ml-2">{order.userEmail}</span>
          </div>
          <div className="flex justify-between">
            <span>Model Run:</span>
            <span className="truncate ml-2">{order.modelRunId}</span>
          </div>
          {order.shippingAddress && (
            <div className="text-xs text-gray-500 mt-2">
              <p className="font-medium">Shipping:</p>
              <p className="truncate">{
                typeof order.shippingAddress === 'string' 
                  ? order.shippingAddress 
                  : formatShippingAddressMultiLine(order.shippingAddress)
              }</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for touch gestures
function useTouchGesture(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        onSwipeLeft(); // Swipe left (next)
      } else {
        onSwipeRight(); // Swipe right (previous)
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  return { handleTouchStart, handleTouchEnd };
}

export default function ActiveBatchPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('one-by-one');
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isCreatingStickers, setIsCreatingStickers] = useState(false);
  
  // Database batch state
  const [batches, setBatches] = useState<DatabaseBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [activeBatch, setActiveBatch] = useState<DatabaseBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load batches from database
  const loadBatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchBatchesFromDatabase();
      
      if (result.error) {
        setError(result.error);
        setBatches([]);
      } else {
        setBatches(result.batches);
        
        // Auto-select newest batch if available
        if (result.batches.length > 0 && !selectedBatchId) {
          const newestBatch = result.batches[0]; // Already sorted newest first
          setSelectedBatchId(newestBatch.batch_id);
          setActiveBatch(newestBatch);
          await loadBatchOrders(newestBatch.batch_id);
        }
      }
    } catch (err) {
      console.error('Error loading batches:', err);
      setError('Failed to load batches');
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBatchId]);

  // Load orders for a specific batch
  const loadBatchOrders = useCallback(async (batchId: string) => {
    try {
      const result = await fetchBatchOrders(batchId);
      
      if (result.error) {
        console.error('Error loading batch orders:', result.error);
        setOrders([]);
      } else {
        // Convert BatchOrder to Order format
        const convertedOrders: Order[] = result.orders.map((batchOrder, index) => ({
          id: batchOrder.id,
          stripePaymentId: batchOrder.stripe_payment_id,
          modelRunId: batchOrder.mr_id || `MR-${Date.now()}-${index}`,
          orderNumber: batchOrder.pmo_order_number || `ORD-${batchOrder.id}`,
          userEmail: batchOrder.pmo_email || `user${batchOrder.id}@example.com`,
          stickerSheetUrl: batchOrder.sticker_sheet_url || batchOrder.mr_original_output_image_url || batchOrder.mr_output_image_url || "/api/placeholder/400/500",
          originalImageUrl: batchOrder.mr_original_output_image_url || batchOrder.mr_output_image_url || "/api/placeholder/400/500",
          envelopeUrl: "/api/placeholder/300/200",
          status: batchOrder.pmo_status === "shipped" ? "Printed" : "Ready",
          isProcessed: !!batchOrder.sticker_sheet_url, // Mark as processed if sticker sheet URL exists
          shippingAddress: batchOrder.pmo_shipping_address
        }));
        
        setOrders(convertedOrders);
        setCurrentOrderIndex(0);
      }
    } catch (err) {
      console.error('Error loading batch orders:', err);
      setOrders([]);
    }
  }, []);

  // Select a specific batch
  const selectBatch = useCallback(async (batchId: string) => {
    const batch = batches.find(b => b.batch_id === batchId);
    if (batch) {
      setSelectedBatchId(batchId);
      setActiveBatch(batch);
      await loadBatchOrders(batchId);
    }
  }, [batches, loadBatchOrders]);

  // Load batches on component mount
  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Check if mobile on component mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: default to 1-by-1 view
  useEffect(() => {
    if (isMobile && viewMode !== 'one-by-one') {
      setViewMode('one-by-one');
    }
  }, [isMobile, viewMode]);

  const handleRemoveOrder = (id: string) => {
    setOrders(prev => prev.filter(order => order.id !== id));
    // Adjust current index if needed for one-by-one view
    if (viewMode === 'one-by-one' && currentOrderIndex >= orders.length - 1) {
      setCurrentOrderIndex(Math.max(0, orders.length - 2));
    }
  };

  const handleCreateStickerSheets = async () => {
    if (!activeBatch || !orders || orders.length === 0) {
      console.error('No active batch or orders found');
      alert('No batch or orders to process');
      return;
    }

    setIsCreatingStickers(true);
    
    try {
      console.log(`🎨 Creating sticker sheets for ${orders.length} orders...`);
      
      // Process each order that hasn't been processed yet
      const updatedOrders = await Promise.all(
        orders.map(async (order, index) => {
          if (order.isProcessed) {
            console.log(`⏭️ Skipping order ${order.orderNumber} - already processed`);
            return order;
          }
          
          try {
            console.log(`🎨 Processing order ${index + 1}/${orders.length}: ${order.orderNumber}`);
            
            // Call the sticker sheet creation API
            const response = await fetch('/api/create-sticker-sheet', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageUrl: order.originalImageUrl || order.stickerSheetUrl,
                orderNumber: order.orderNumber,
                modelRunId: order.modelRunId
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to create sticker sheet: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
              console.log(`✅ Created sticker sheet for order ${order.orderNumber}`);
              console.log(`🖼️ Sticker sheet image URL: ${result.outputImageUrl}`);
              
              // Save sticker sheet URL to database
              const dbResult = await updateStickerSheetUrl(order.stripePaymentId, result.outputImageUrl);
              if (dbResult.success) {
                console.log(`💾 Saved sticker sheet URL to database for order ${order.orderNumber}`);
              } else {
                console.error(`❌ Failed to save sticker sheet URL to database for order ${order.orderNumber}:`, dbResult.error);
              }
              
              return {
                ...order,
                stickerSheetUrl: result.outputImageUrl,
                isProcessed: true
              };
            } else {
              throw new Error(result.error || 'Unknown error');
            }
            
          } catch (error) {
            console.error(`❌ Failed to process order ${order.orderNumber}:`, error);
            // Return order unchanged if processing fails
            return order;
          }
        })
      );

      setOrders(updatedOrders);
      
      const processedCount = updatedOrders.filter(order => order.isProcessed).length;
      console.log(`✅ Successfully processed ${processedCount} sticker sheets`);
      
      if (processedCount > 0) {
        alert(`Successfully created ${processedCount} sticker sheets!`);
      } else {
        alert('No sticker sheets were created. Please check the console for errors.');
      }

    } catch (error) {
      console.error('❌ Error creating sticker sheets:', error);
      alert('An error occurred while creating sticker sheets. Please try again.');
    } finally {
      setIsCreatingStickers(false);
    }
  };

  const handleDownloadBatchImages = async () => {
    if (!activeBatch || !orders || orders.length === 0) {
      console.error('No active batch or orders found');
      alert('No batch or images to download');
      return;
    }

    try {
      const zip = new JSZip();
      let successCount = 0;
      let failCount = 0;

      console.log(`Starting download of ${orders.length} images...`);

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const imageUrl = order.stickerSheetUrl;
        
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
          try {
            console.log(`Downloading image ${i + 1}/${orders.length}: ${imageUrl}`);
            
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            const imageBlob = await response.blob();
            
            let extension = 'jpg';
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('png')) {
              extension = 'png';
            } else if (contentType?.includes('webp')) {
              extension = 'webp';
            } else if (imageUrl.includes('.png')) {
              extension = 'png';
            } else if (imageUrl.includes('.webp')) {
              extension = 'webp';
            }
            
            const filename = `order-${order.orderNumber}_sticker-sheet.${extension}`;
            zip.file(filename, imageBlob);
            successCount++;
            
            console.log(`✅ Added ${filename} to zip`);
            
          } catch (error) {
            console.error(`❌ Failed to download image for order ${order.orderNumber}:`, error);
            failCount++;
          }
        } else {
          console.warn(`⚠️ Skipping order ${order.orderNumber} - invalid image URL: ${imageUrl}`);
          failCount++;
        }
      }

      if (successCount === 0) {
        alert('No images could be downloaded. Please check the image URLs.');
        return;
      }

      console.log('Generating zip file...');
      const zipBlob = await zip.generateAsync({
        type: "blob",
        streamFiles: true
      });

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(zipBlob);
      link.download = `${activeBatch.name}_sticker_sheets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(link.href);

      console.log(`✅ Successfully downloaded ${successCount} images in zip file`);
      
      if (failCount > 0) {
        alert(`Download completed! ${successCount} images downloaded successfully. ${failCount} images failed to download.`);
      } else {
        alert(`Successfully downloaded all ${successCount} sticker sheet images!`);
      }

    } catch (error) {
      console.error('❌ Error creating zip download:', error);
      alert('An error occurred while creating the download. Please try again.');
    }
  };

  const nextOrder = useCallback(() => {
    setCurrentOrderIndex(prev => Math.min(prev + 1, orders.length - 1));
  }, [orders.length]);

  const prevOrder = useCallback(() => {
    setCurrentOrderIndex(prev => Math.max(prev - 1, 0));
  }, []);

  // Touch gesture support for mobile (defined after nextOrder and prevOrder)
  const { handleTouchStart, handleTouchEnd } = useTouchGesture(nextOrder, prevOrder);

  // Add touch event listeners
  useEffect(() => {
    if (isMobile && viewMode === 'one-by-one') {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile, viewMode, handleTouchStart, handleTouchEnd]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1500px] mx-auto p-4 sm:p-8">
          <div className="text-center py-16">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Loading Batches...</h1>
            <p className="text-gray-500 mb-8 text-base sm:text-lg">Fetching batches from database.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1500px] mx-auto p-4 sm:p-8">
          <div className="text-center py-16">
            <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4">Error Loading Batches</h1>
            <p className="text-gray-500 mb-8 text-base sm:text-lg">{error}</p>
            <Button 
              onClick={() => router.push('/orders')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1500px] mx-auto p-4 sm:p-8">
          <div className="text-center py-16">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">No Batches Found</h1>
            <p className="text-gray-500 mb-8 text-base sm:text-lg">Create a batch from the Orders tab to get started.</p>
            <Button 
              onClick={() => router.push('/orders')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1500px] mx-auto">
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Batch Selection Dropdown */}
            <div className="flex items-center gap-2">
              <Select 
                value={selectedBatchId} 
                onValueChange={(value: string) => selectBatch(value)}
              >
                <SelectTrigger className="w-[350px]">
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.batch_id} value={batch.batch_id}>
                      <div className="text-left">
                        <span className="font-medium text-sm">{batch.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {batch.order_count} orders
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2">
              {/* View Mode Selector */}
              {!isMobile && activeBatch && (
                <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                  <SelectTrigger className="w-auto px-2">
                    <Settings className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gallery">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-3 w-3" />
                        Gallery
                      </div>
                    </SelectItem>
                    <SelectItem value="horizontal">
                      <div className="flex items-center gap-2">
                        <MoreHorizontal className="h-3 w-3" />
                        Horizontal
                      </div>
                    </SelectItem>
                    <SelectItem value="one-by-one">
                      <div className="flex items-center gap-2">
                        <Maximize2 className="h-3 w-3" />
                        1-by-1
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {/* Create Sticker Sheets Button */}
              <Button
                onClick={handleCreateStickerSheets}
                disabled={!activeBatch || !orders || orders.length === 0 || isCreatingStickers}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                {isCreatingStickers ? 'Creating...' : 'Create Sticker Sheets'}
              </Button>
              
              {/* Download Button */}
              <Button
                onClick={handleDownloadBatchImages}
                disabled={!activeBatch || !orders || orders.length === 0}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All Images
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-8 relative">
          {/* Order Views - Only show when there's an active batch */}
          {activeBatch && orders.length > 0 && (
            <>
              {/* Horizontal Scroll View */}
              {viewMode === 'horizontal' && !isMobile && (
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-6 min-w-max">
                    {orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onRemove={handleRemoveOrder}
                        size="horizontal-large"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery View */}
              {viewMode === 'gallery' && !isMobile && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onRemove={handleRemoveOrder}
                      size="medium"
                      className="w-full"
                    />
                  ))}
                </div>
              )}

              {/* 1-by-1 View */}
              {(viewMode === 'one-by-one' || isMobile) && orders.length > 0 && (
                <div className="flex flex-col items-center">
                  {/* Navigation Info with Controls */}
                  <div className="mb-4 sm:mb-6 flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={prevOrder}
                      disabled={currentOrderIndex === 0}
                      size={isMobile ? "sm" : "default"}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
                    </Button>
                    
                    <div className="text-center">
                      <p className="text-gray-600 text-sm sm:text-base">
                        Order {currentOrderIndex + 1} of {orders.length}
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={nextOrder}
                      disabled={currentOrderIndex === orders.length - 1}
                      size={isMobile ? "sm" : "default"}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  {/* Single Order Card */}
                  <div className="mb-6 sm:mb-8 w-full max-w-md sm:max-w-none">
                    <OrderCard
                      order={orders[currentOrderIndex]}
                      onRemove={handleRemoveOrder}
                      size="one-by-one-huge"
                      className="mx-auto w-full sm:w-auto"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* No Active Batch Selected or No Orders in Batch */}
          {!activeBatch && batches.length > 0 && (
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Batch</h2>
              <p className="text-gray-500 mb-6">Choose a batch from the dropdown above to view its orders.</p>
            </div>
          )}

          {/* Active Batch with No Orders */}
          {activeBatch && orders.length === 0 && (
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">No Orders in Batch</h2>
              <p className="text-gray-500 mb-6">This batch appears to be empty or the order data couldn&apos;t be loaded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 