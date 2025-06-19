"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Mock data for demonstration
const mockOrders = [
  {
    id: 1,
    modelRunId: "MR-2024-001",
    orderNumber: "ORD-789123",
    userEmail: "sarah@example.com",
    stickerSheetUrl: "/api/placeholder/400/500",
    envelopeUrl: "/api/placeholder/300/200",
    status: "Ready"
  },
  {
    id: 2,
    modelRunId: "MR-2024-002", 
    orderNumber: "ORD-789124",
    userEmail: "michael.chen@example.com",
    stickerSheetUrl: "/api/placeholder/400/500",
    envelopeUrl: "/api/placeholder/300/200",
    status: "Printed"
  },
  {
    id: 3,
    modelRunId: "MR-2024-003",
    orderNumber: "ORD-789125", 
    userEmail: "emma.rodriguez@example.com",
    stickerSheetUrl: "/api/placeholder/400/500",
    envelopeUrl: "/api/placeholder/300/200",
    status: "Ready"
  },
  // Add more mock orders for demonstration
  ...Array.from({ length: 22 }, (_, i) => ({
    id: i + 4,
    modelRunId: `MR-2024-${String(i + 4).padStart(3, '0')}`,
    orderNumber: `ORD-${789125 + i + 1}`,
    userEmail: `user${i + 4}@example.com`,
    stickerSheetUrl: "/api/placeholder/400/500",
    envelopeUrl: "/api/placeholder/300/200",
    status: i % 3 === 0 ? "Printed" : "Ready"
  }))
];

type ViewMode = 'horizontal' | 'gallery' | 'one-by-one';

interface OrderCardProps {
  order: typeof mockOrders[0];
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
    "one-by-one-huge": "w-288"   // 200% wider (3x) for one-by-one view
  };

  const imageClasses = {
    small: "h-32",
    medium: "h-48",
    large: "h-64 sm:h-48 md:h-64",
    "horizontal-large": "h-96", // 50% taller for horizontal view  
    "one-by-one-huge": "h-96"   // Keep proportional height for one-by-one
  };

  return (
    <Card className={`${sizeClasses[size]} ${className} flex-shrink-0 shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        {/* Sticker Sheet Preview */}
        <div className="mb-3">
          <div className={`${imageClasses[size]} bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden`}>
            <img 
              src={order.stickerSheetUrl} 
              alt="Sticker Sheet Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-gray-500 font-medium">Sticker Sheet</p>
        </div>

        {/* Envelope Preview */}
        <div className="mb-4">
          <div className="h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
            <img 
              src={order.envelopeUrl} 
              alt="Envelope Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-gray-500 font-medium">Mailing Label</p>
        </div>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div>
            <p className="text-xs text-gray-500">Model Run ID</p>
            <p className="text-sm font-medium">{order.modelRunId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Order Number</p>
            <p className="text-sm font-medium">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">User Email</p>
            <p className="text-sm font-medium text-blue-600 truncate">{order.userEmail}</p>
          </div>
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

export default function ActiveBatchPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('horizontal');
  const [orders, setOrders] = useState(mockOrders);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

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

  const handlePrintLabels = () => {
    // TODO: Implement print labels functionality
    console.log('Printing labels for batch...');
  };

  const handleExportZip = () => {
    // TODO: Implement export ZIP functionality
    console.log('Exporting batch as ZIP...');
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

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1500px] mx-auto p-4 sm:p-8">
          <div className="text-center py-16">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">No Active Batch</h1>
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
        {/* Header */}
        <div className="p-4 sm:p-8 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Active Batch</h1>
          <p className="text-gray-600 text-base sm:text-lg">
            You're now working on a batch of sticker orders. Review each, print labels, or remove any before production.
          </p>
        </div>

        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* View Toggle Buttons - Hide on mobile, auto-switch to 1-by-1 */}
            {!isMobile && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={viewMode === 'horizontal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('horizontal')}
                  className={viewMode === 'horizontal' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Horizontal Scroll</span>
                  <span className="sm:hidden">Scroll</span>
                </Button>
                <Button
                  variant={viewMode === 'gallery' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('gallery')}
                  className={viewMode === 'gallery' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Gallery View</span>
                  <span className="sm:hidden">Gallery</span>
                </Button>
                <Button
                  variant={viewMode === 'one-by-one' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('one-by-one')}
                  className={viewMode === 'one-by-one' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">1-by-1 View</span>
                  <span className="sm:hidden">1-by-1</span>
                </Button>
              </div>
            )}

            {/* Mobile indicator */}
            {isMobile && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Maximize2 className="h-4 w-4" />
                1-by-1 View (Mobile)
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handlePrintLabels}
                className="border-gray-300"
                size={isMobile ? "sm" : "default"}
              >
                <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Print Labels</span>
                <span className="sm:hidden">Print</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleExportZip}
                className="border-gray-300"
                size={isMobile ? "sm" : "default"}
              >
                <Download className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export ZIP</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/orders')}
                className="border-gray-300"
                size={isMobile ? "sm" : "default"}
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Return to Orders</span>
                <span className="sm:hidden">Orders</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-8">
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
        </div>
      </div>
    </div>
  );
} 