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
  Printer, 
  Download, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Mail 
} from "lucide-react";
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { formatShippingAddressMultiLine } from '@/lib/data-transformations';

// Batch interface  
interface Batch {
  batch_id: string;
  name: string;
  created_at: string;
  order_ids: number[];
  order_data?: any[]; // Store actual order data (optional for backward compatibility)
}

// Order interface for typed state
interface Order {
  id: number;
  modelRunId: string;
  orderNumber: string;
  userEmail: string;
  stickerSheetUrl: string;
  originalImageUrl?: string; // Store original image URL for comparison
  envelopeUrl: string;
  status: string;
  isProcessed?: boolean; // Whether the sticker sheet is a processed blob URL
  shippingAddress?: any; // Add shipping address data
}

type ViewMode = 'horizontal' | 'gallery' | 'one-by-one';

interface OrderCardProps {
  order: Order;
  onRemove: (id: number) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'horizontal-large' | 'one-by-one-huge';
}

function OrderCard({ order, onRemove, className = "", size = 'medium' }: OrderCardProps) {
  const sizeClasses = {
    small: "w-64",
    medium: "w-80", 
    large: "w-96 sm:w-80 md:w-96",
    "horizontal-large": "w-144", // 50% wider for horizontal view
    "one-by-one-huge": "w-[800px] max-w-[800px]"   // Exactly 800px max width for one-by-one view
  };

  const imageClasses = {
    small: "h-[328px]",         // 128px + 200px = 328px
    medium: "h-[392px]",        // 192px + 200px = 392px
    large: "h-[456px] sm:h-[392px] md:h-[456px]", // 256px + 200px = 456px, responsive
    "horizontal-large": "h-[584px]", // 384px + 200px = 584px for horizontal view  
    "one-by-one-huge": "h-[684px]"   // 484px + 200px = 684px for one-by-one
  };

  return (
    <Card className={`${sizeClasses[size]} ${className} flex-shrink-0 shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        {/* Sticker Sheet Preview */}
        <div className="mb-3">
          <div className={`${imageClasses[size]} bg-gray-100 rounded-lg mb-2 overflow-hidden relative ${size === 'one-by-one-huge' ? 'py-2.5' : ''}`}>
            {order.isProcessed && order.originalImageUrl ? (
              // Show sticker sheet centered with original as small thumbnail in bottom-left
              <>
                {/* Main sticker sheet - centered */}
                <div className="flex items-center justify-center h-full">
                  <img 
                    src={order.stickerSheetUrl} 
                    alt="3-up Sticker Sheet"
                    className={size === 'one-by-one-huge' ? 'h-full w-auto object-contain' : 'w-full h-full object-contain'}
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
                  className={size === 'one-by-one-huge' ? 'h-full w-auto object-contain' : 'w-full h-full object-contain'}
                />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">
              {order.isProcessed ? 'Original | 3-up Layout' : 'Sticker Sheet'}
            </p>
            {order.isProcessed && (
              <Badge className="bg-green-100 text-green-700 text-xs px-1 py-0">
                Processed
              </Badge>
            )}
          </div>
        </div>

        {/* Envelope Preview */}
        <div className="mb-4">
          <div className="h-32 bg-gray-50 rounded-lg mb-2 flex items-center justify-center">
            <EnvelopeCanvas 
              shippingAddress={order.shippingAddress}
              width={300}
              height={120}
              className="rounded"
            />
          </div>
          <p className="text-xs text-gray-500 font-medium">Mailing Label</p>
        </div>



        {/* Status and Remove Button */}
        <div className="flex items-center justify-between">
          <Badge 
            variant={order.status === "Ready" ? "default" : "secondary"}
            className={order.status === "Ready" ? "bg-green-100 text-green-800" : ""}
          >
            {order.status}
          </Badge>
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
  shippingAddress: any;
  className?: string;
  width?: number;
  height?: number;
}

function EnvelopeCanvas({ shippingAddress, className = "", width = 350, height = 250 }: EnvelopeCanvasProps) {
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
      x: 25,
      y: 40,
      fontSize: 10,
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
      y: height / 2,
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
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

export default function ActiveBatchPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('one-by-one');
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Batch management state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  
  // Sticker sheet processing state
  const [isProcessingStickerSheets, setIsProcessingStickerSheets] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  // Batch management functions
  const loadBatches = () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('print_order_batches');
    const loadedBatches = stored ? JSON.parse(stored) : [];
    setBatches(loadedBatches);
    
    // Auto-select newest batch if available and none selected
    if (loadedBatches.length > 0 && !selectedBatchId) {
      // Sort batches by created_at in descending order (newest first)
      const sortedBatches = [...loadedBatches].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      // Use the newest batch directly since batches state hasn't updated yet
      selectBatchDirectly(sortedBatches[0]);
    }
  };

  const selectBatchDirectly = (batch: Batch) => {
    setSelectedBatchId(batch.batch_id);
    setActiveBatch(batch);
    setCurrentOrderIndex(0); // Reset to first order
    
    // Load actual order data from the batch
    if (batch.order_data && batch.order_data.length > 0) {
      // Convert order data to the format expected by OrderCard
      const convertedOrders = batch.order_data.map((order: any, index: number) => {
        // Use original image URL 
        const originalImageUrl = order.original_output_image_url || order.mr_original_output_image_url || order.mr_output_image_url || order.output_image_url || "/api/placeholder/400/500";
        const stickerSheetUrl = originalImageUrl;
        
        return {
          id: order.id,
          modelRunId: order.mr_id || `MR-${Date.now()}-${index}`,
          orderNumber: order.order_number || order.pmo_order_number || `ORD-${order.id}`,
          userEmail: order.pmo_email || order.user_id || `user${order.id}@example.com`,
          stickerSheetUrl: stickerSheetUrl,
          originalImageUrl: originalImageUrl, // Store original for comparison view
          envelopeUrl: "/api/placeholder/300/200", // Default envelope
          status: order.pmo_status === "shipped" ? "Printed" : "Ready",
          shippingAddress: order.shipping_address || order.pmo_shipping_address || null
        };
      });
      setOrders(convertedOrders);
    } else {
      // Fallback to empty orders if no data
      setOrders([]);
    }
  };

  const selectBatch = (batchId: string) => {
    const batch = batches.find(b => b.batch_id === batchId);
    if (batch) {
      setSelectedBatchId(batchId);
      setActiveBatch(batch);
      setCurrentOrderIndex(0); // Reset to first order
      
      // Load actual order data from the batch
      if (batch.order_data && batch.order_data.length > 0) {
        // Convert order data to the format expected by OrderCard
        const convertedOrders = batch.order_data.map((order: any, index: number) => {
          // Use processed blob URL if available, otherwise fallback to original image
          const processedBlobUrl = (batch as any).processed_images?.[order.id];
          const originalImageUrl = order.original_output_image_url || order.mr_output_image_url || order.output_image_url || "/api/placeholder/400/500";
          const stickerSheetUrl = processedBlobUrl || originalImageUrl;
          
          return {
            id: order.id,
            modelRunId: order.mr_id || `MR-${Date.now()}-${index}`,
            orderNumber: order.order_number || order.pmo_order_number || `ORD-${order.id}`,
            userEmail: order.pmo_email || order.user_id || `user${order.id}@example.com`,
            stickerSheetUrl: stickerSheetUrl,
            originalImageUrl: originalImageUrl, // Store original for comparison view
            envelopeUrl: "/api/placeholder/300/200", // Default envelope
            status: order.pmo_status === "shipped" ? "Printed" : "Ready",
            // Add processed status for display
            isProcessed: !!processedBlobUrl,
            shippingAddress: order.shipping_address || order.pmo_shipping_address || null
          };
        });
        setOrders(convertedOrders);
      } else {
        // Fallback to empty orders if no data
        setOrders([]);
      }
    }
  };

  // Load batches on component mount
  useEffect(() => {
    loadBatches();
  }, []);

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

  const handleRemoveOrder = (id: number) => {
    setOrders(prev => prev.filter(order => order.id !== id));
    // Adjust current index if needed for one-by-one view
    if (viewMode === 'one-by-one' && currentOrderIndex >= orders.length - 1) {
      setCurrentOrderIndex(Math.max(0, orders.length - 2));
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

      // Show progress
      console.log(`Starting download of ${orders.length} images...`);

      // Process each order's sticker sheet image
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const imageUrl = order.stickerSheetUrl;
        
        if (imageUrl && imageUrl.startsWith('http')) {
          try {
            console.log(`Downloading image ${i + 1}/${orders.length}: ${imageUrl}`);
            
            // Fetch image as blob
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            const imageBlob = await response.blob();
            
            // Determine file extension from content type or URL
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
            
            // Create filename: order-{orderNumber}_sticker-sheet.{extension}
            const filename = `order-${order.orderNumber}_sticker-sheet.${extension}`;
            
            // Add image to zip
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

      // Generate zip file
      console.log('Generating zip file...');
      const zipBlob = await zip.generateAsync({
        type: "blob",
        streamFiles: true
      });

      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(zipBlob);
      link.download = `${activeBatch.name}_sticker_sheets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
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



  const handleCreateStickerSheets = async () => {
    if (!activeBatch || !activeBatch.order_data) {
      console.error('No active batch or order data found');
      return;
    }

    setIsProcessingStickerSheets(true);
    setProcessingProgress({ current: 0, total: activeBatch.order_data.length });

    try {
      const processedImages: { [orderId: number]: string } = {};
      
      // Process each image in the batch
      for (let i = 0; i < activeBatch.order_data.length; i++) {
        const order = activeBatch.order_data[i];
        setProcessingProgress({ current: i + 1, total: activeBatch.order_data.length });
        
        if (order.original_output_image_url) {
          try {
            console.log(`Processing image ${i + 1}/${activeBatch.order_data.length}: ${order.original_output_image_url}`);
            
            const response = await fetch('/api/create-sticker-sheet', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ imageUrl: order.original_output_image_url }),
            });

            const result = await response.json();

            if (result.success && result.outputImageUrl) {
              processedImages[order.id] = result.outputImageUrl;
              console.log(`✅ Processed order ${order.id}: ${result.outputImageUrl}`);
            } else {
              console.error(`❌ Failed to process order ${order.id}:`, result.error);
            }
          } catch (error) {
            console.error(`❌ Error processing order ${order.id}:`, error);
          }
        }
      }

      // Update the batch with processed images
      const updatedBatch = {
        ...activeBatch,
        processed_images: processedImages
      };

      // Update localStorage
      const currentBatches = batches.map(batch => 
        batch.batch_id === activeBatch.batch_id ? updatedBatch : batch
      );
      
      localStorage.setItem('print_order_batches', JSON.stringify(currentBatches));
      setBatches(currentBatches);
      setActiveBatch(updatedBatch);

      // Refresh the orders to show processed images
      selectBatch(activeBatch.batch_id);

      console.log(`✅ Successfully processed ${Object.keys(processedImages).length} sticker sheets`);
      alert(`Successfully processed ${Object.keys(processedImages).length} sticker sheets!`);

    } catch (error) {
      console.error('❌ Error during sticker sheet processing:', error);
      alert('An error occurred while processing sticker sheets');
    } finally {
      setIsProcessingStickerSheets(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  };

  const nextOrder = useCallback(() => {
    setCurrentOrderIndex(prev => Math.min(prev + 1, orders.length - 1));
  }, [orders.length]);

  const prevOrder = useCallback(() => {
    setCurrentOrderIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const markAsPrinted = (id: number) => {
    setOrders(prev => prev.map(order => 
      order.id === id ? { ...order, status: "Printed" } : order
    ));
  };

  // Touch gesture support for 1-by-1 view
  const { handleTouchStart, handleTouchEnd } = useTouchGesture(nextOrder, prevOrder);

  // Add touch listeners to document in 1-by-1 view
  useEffect(() => {
    if (viewMode === 'one-by-one') {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [viewMode, handleTouchStart, handleTouchEnd]);

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
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.batch_id} value={batch.batch_id}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">{batch.name}</span>
                          <span className="text-xs text-gray-500">
                            {batch.order_ids.length} orders • {new Date(batch.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handleDownloadBatchImages}
                className="border-gray-300"
                size={isMobile ? "sm" : "default"}
                disabled={!activeBatch || !orders || orders.length === 0}
              >
                <Download className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Download Batch Images</span>
                <span className="sm:hidden">Download</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Active Batch Info Bar */}
        {activeBatch && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-8 py-3 relative">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Active Batch: {activeBatch.name}</h4>
                <p className="text-sm text-blue-700">
                  {activeBatch.order_ids.length} orders • Created {new Date(activeBatch.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-800">
                  Active
                </Badge>
                {/* View Mode Selector for active batch */}
                {!isMobile && (
                  <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
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
              </div>
            </div>
            
            {/* Centered Green Button */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Button 
                onClick={handleCreateStickerSheets}
                disabled={isProcessingStickerSheets || !activeBatch?.order_data?.length}
                className="bg-green-500 hover:bg-green-600 text-white pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: '200px', height: '50px' }}
              >
                {isProcessingStickerSheets ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm">
                      Processing {processingProgress.current}/{processingProgress.total}
                    </span>
                  </div>
                ) : (
                  'Create Sticker Sheets'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-8 relative">
          {/* Centered Layout All in Batch Image */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img 
              src="/layout-all-in-batch.png" 
              alt="Layout All in Batch"
              className="max-w-full max-h-full object-contain opacity-10"
            />
          </div>

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
              {/* Navigation Info */}
              <div className="mb-4 sm:mb-6 text-center">
                <p className="text-gray-600 text-sm sm:text-base">
                  Order {currentOrderIndex + 1} of {orders.length}
                </p>
                {isMobile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Swipe left/right to navigate
                  </p>
                )}
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

              {/* Navigation Controls */}
              <div className="flex items-center gap-2 sm:gap-4 mb-8 w-full max-w-md sm:max-w-none justify-center">
                <Button
                  variant="outline"
                  onClick={prevOrder}
                  disabled={currentOrderIndex === 0}
                  size={isMobile ? "default" : "lg"}
                  className="flex-1 sm:flex-none"
                >
                  <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                
                <Button
                  onClick={() => markAsPrinted(orders[currentOrderIndex].id)}
                  disabled={orders[currentOrderIndex].status === "Printed"}
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  size={isMobile ? "default" : "lg"}
                >
                  <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Mark as Printed</span>
                  <span className="sm:hidden">Print</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={nextOrder}
                  disabled={currentOrderIndex === orders.length - 1}
                  size={isMobile ? "default" : "lg"}
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
                </Button>
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
              <p className="text-gray-500 mb-6">This batch appears to be empty or the order data couldn't be loaded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 