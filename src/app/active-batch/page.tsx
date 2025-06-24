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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { 
  MoreHorizontal, 
  Grid3X3, 
  Maximize2, 
  Download, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Settings,
  Edit3
} from "lucide-react";
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { formatShippingAddressMultiLine, ShippingAddress } from '@/lib/data-transformations';
import { fetchBatchesFromDatabase, DatabaseBatch } from './actions/fetch-batches';
import { fetchBatchOrders } from './actions/fetch-batch-orders';
import { updateStickerSheetUrl } from './actions/update-sticker-sheet-url';
import { removeOrderFromBatch } from './actions/remove-order-from-batch';
import { updateShippingAddress } from './actions/update-shipping-address';
import { updateOrderStatus } from './actions/update-order-status';

// Note: This page is temporarily disabled while transitioning to database-based batches
// TODO: Implement database-based batch loading to replace localStorage functionality

// Legacy batch interface (kept for backward compatibility but not currently used)
// interface Batch {
//   batch_id: string;
//   name: string;
//   created_at: string;
//   order_ids: string[]; // UUIDs
//   order_data?: OrderData[]; // Store actual order data (optional for backward compatibility)
//   processed_images?: { [orderId: string]: string }; // UUID keys
// }

// Legacy order data interface (kept for backward compatibility but not currently used)  
// interface OrderData {
//   id: string; // UUID
//   mr_id?: string;
//   order_number?: string;
//   pmo_order_number?: string;
//   pmo_email?: string;
//   user_id?: string;
//   original_output_image_url?: string;
//   mr_original_output_image_url?: string;
//   mr_output_image_url?: string;
//   output_image_url?: string;
//   pmo_status?: string;
//   shipping_address?: ShippingAddress;
//   pmo_shipping_address?: string;
// }

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
  onUpdateAddress?: (orderId: string, newAddress: ShippingAddress) => Promise<void>;
  onUpdateStatus?: (orderId: string, newStatus: string) => Promise<void>;
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
      x: 30, // Top-left positioning
      y: 40,
      fontSize: 14,
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
      y: height / 2, // Center-center positioning
      fontSize: 22,
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

function OrderCard({ order, onRemove, onUpdateAddress, onUpdateStatus, className = "", size = 'medium' }: OrderCardProps) {
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [editedAddress, setEditedAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  });

  // Parse current address for editing
  const parseCurrentAddress = useCallback((): ShippingAddress => {
    if (!order.shippingAddress) {
      return {
        name: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US'
      };
    }
    
    // If it's already a structured address object, use it
    if (typeof order.shippingAddress === 'object') {
      return {
        name: order.shippingAddress.name || '',
        line1: order.shippingAddress.line1 || '',
        line2: order.shippingAddress.line2 || '',
        city: order.shippingAddress.city || '',
        state: order.shippingAddress.state || '',
        postal_code: order.shippingAddress.postal_code || '',
        country: order.shippingAddress.country || 'US'
      };
    }
    
    // If it's a string, try to parse it (basic parsing)
    const lines = order.shippingAddress.split(',').map(line => line.trim());
    return {
      name: lines[0] || '',
      line1: lines[1] || '',
      line2: '',
      city: lines[2] || '',
      state: lines[3] || '',
      postal_code: lines[4] || '',
      country: 'US'
    };
  }, [order.shippingAddress]);

  const handleEditAddress = () => {
    setEditedAddress(parseCurrentAddress());
    setIsEditingAddress(true);
  };

  const handleSaveAddress = async () => {
    if (onUpdateAddress) {
      setIsSavingAddress(true);
      try {
        await onUpdateAddress(order.id, editedAddress);
        setIsEditingAddress(false);
      } catch (error) {
        // Error is already handled in onUpdateAddress, just keep dialog open
        console.error('Error in handleSaveAddress:', error);
      } finally {
        setIsSavingAddress(false);
      }
    }
  };

  const updateAddressField = (field: keyof ShippingAddress, value: string) => {
    setEditedAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
            <Select 
              value={order.status} 
              onValueChange={(newStatus) => onUpdateStatus?.(order.id, newStatus)}
            >
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue>
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      order.status === 'Approved Batchable' ? 'bg-green-500' :
                      order.status === 'Contact User' ? 'bg-blue-500' :
                      order.status === 'Alan Review' ? 'bg-yellow-500' :
                      order.status === 'Question' ? 'bg-purple-500' :
                      order.status === 'Hide' ? 'bg-red-500' :
                      order.status === 'Batch In Progress' ? 'bg-orange-500' :
                      order.status === 'Sticker Printed' ? 'bg-teal-500' :
                      order.status === 'Sticker Printing Ready' ? 'bg-cyan-500' :
                      order.status === 'Printed' ? 'bg-lime-500' :
                      order.status === 'Packaged - Contact User' ? 'bg-indigo-500' :
                      order.status === 'Packaged - User Contacted' ? 'bg-violet-500' :
                      order.status === 'Done' ? 'bg-emerald-500' :
                      order.status === 'No Status' ? 'bg-gray-300' :
                      'bg-gray-300'
                    }`}></span>
                    <span className="text-xs">{order.status}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: 'No Status', label: 'No Status' },
                  { value: 'Approved Batchable', label: 'Approved Batchable' },
                  { value: 'Contact User', label: 'Contact User' },
                  { value: 'Alan Review', label: 'Alan Review' },
                  { value: 'Question', label: 'Question' },
                  { value: 'Hide', label: 'Hide' },
                  { value: 'Batch In Progress', label: 'Batch In Progress' },
                  { value: 'Sticker Printed', label: 'Sticker Printed' },
                  { value: 'Sticker Printing Ready', label: 'Sticker Printing Ready' },
                  { value: 'Printed', label: 'Printed' },
                  { value: 'Packaged - Contact User', label: 'Packaged - Contact User' },
                  { value: 'Packaged - User Contacted', label: 'Packaged - User Contacted' },
                  { value: 'Done', label: 'Done' }
                ].map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        option.value === 'Approved Batchable' ? 'bg-green-500' :
                        option.value === 'Contact User' ? 'bg-blue-500' :
                        option.value === 'Alan Review' ? 'bg-yellow-500' :
                        option.value === 'Question' ? 'bg-purple-500' :
                        option.value === 'Hide' ? 'bg-red-500' :
                        option.value === 'Batch In Progress' ? 'bg-orange-500' :
                        option.value === 'Sticker Printed' ? 'bg-teal-500' :
                        option.value === 'Sticker Printing Ready' ? 'bg-cyan-500' :
                        option.value === 'Printed' ? 'bg-lime-500' :
                        option.value === 'Packaged - Contact User' ? 'bg-indigo-500' :
                        option.value === 'Packaged - User Contacted' ? 'bg-violet-500' :
                        option.value === 'Done' ? 'bg-emerald-500' :
                        option.value === 'No Status' ? 'bg-gray-300' :
                        'bg-gray-300'
                      }`}></span>
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isEditingAddress} onOpenChange={setIsEditingAddress}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditAddress}
                  disabled={isSavingAddress}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Edit Address</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Shipping Address</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={editedAddress.name}
                        onChange={(e) => updateAddressField('name', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="line1">Address Line 1</Label>
                      <Input
                        id="line1"
                        value={editedAddress.line1}
                        onChange={(e) => updateAddressField('line1', e.target.value)}
                        placeholder="123 Main Street"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                      <Input
                        id="line2"
                        value={editedAddress.line2}
                        onChange={(e) => updateAddressField('line2', e.target.value)}
                        placeholder="Apt 4B, Suite 200, etc."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={editedAddress.city}
                        onChange={(e) => updateAddressField('city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={editedAddress.state}
                          onChange={(e) => updateAddressField('state', e.target.value)}
                          placeholder="CA"
                        />
                      </div>
                      <div>
                        <Label htmlFor="postal_code">ZIP</Label>
                        <Input
                          id="postal_code"
                          value={editedAddress.postal_code}
                          onChange={(e) => updateAddressField('postal_code', e.target.value)}
                          placeholder="10001"
                        />
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={editedAddress.country}
                        onChange={(e) => updateAddressField('country', e.target.value)}
                        placeholder="US"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingAddress(false)}
                      disabled={isSavingAddress}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveAddress}
                      disabled={isSavingAddress}
                    >
                      {isSavingAddress ? 'Saving...' : 'Save Address'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<string>('Show All');

  // Status options matching the database values
  const statusOptions = [
    { value: 'No Status', label: 'No Status' },
    { value: 'Approved Batchable', label: 'Approved Batchable' },
    { value: 'Contact User', label: 'Contact User' },
    { value: 'Alan Review', label: 'Alan Review' },
    { value: 'Question', label: 'Question' },
    { value: 'Hide', label: 'Hide' },
    { value: 'Batch In Progress', label: 'Batch In Progress' },
    { value: 'Sticker Printed', label: 'Sticker Printed' },
    { value: 'Sticker Printing Ready', label: 'Sticker Printing Ready' },
    { value: 'Printed', label: 'Printed' },
    { value: 'Packaged - Contact User', label: 'Packaged - Contact User' },
    { value: 'Packaged - User Contacted', label: 'Packaged - User Contacted' },
    { value: 'Done', label: 'Done' }
  ];

  // Helper function to show toast
  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Handle status filter changes
  const handleStatusFilterChange = (newFilter: string) => {
    setStatusFilter(newFilter);
  };

  // Clear status filter
  const clearStatusFilter = () => {
    setStatusFilter('Show All');
  };

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
  const loadBatchOrders = useCallback(async (batchId: string, statusFilterValue?: string) => {
    try {
      const filterValue = statusFilterValue || statusFilter;
      const result = await fetchBatchOrders(batchId, filterValue === 'Show All' ? undefined : filterValue);
      
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
          status: batchOrder.status || 'No Status', // Use real status from z_print_order_management
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
  }, [statusFilter]);

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

  // Reload orders when status filter changes
  useEffect(() => {
    if (selectedBatchId) {
      loadBatchOrders(selectedBatchId);
    }
  }, [statusFilter, selectedBatchId, loadBatchOrders]);

  const handleRemoveOrder = async (id: string) => {
    // Find the order to get its stripe payment ID
    const orderToRemove = orders.find(order => order.id === id);
    if (!orderToRemove) {
      console.error('Order not found:', id);
      return;
    }

    try {
      // Update database to set batch_id to "unbatched"
      const result = await removeOrderFromBatch(orderToRemove.stripePaymentId);
      
      if (!result.success) {
        console.error('Failed to remove order from batch:', result.error);
        showToastMessage('Failed to remove order from batch. Please try again.', 'error');
        return;
      }

      // Remove from local state after successful database update
      setOrders(prev => prev.filter(order => order.id !== id));
      
      // Adjust current index if needed for one-by-one view
      if (viewMode === 'one-by-one' && currentOrderIndex >= orders.length - 1) {
        setCurrentOrderIndex(Math.max(0, orders.length - 2));
      }

      console.log(`✅ Order ${orderToRemove.orderNumber} removed from batch`);
      
    } catch (error) {
      console.error('Error removing order:', error);
      showToastMessage('An error occurred while removing the order. Please try again.', 'error');
    }
  };

  const handleUpdateAddress = async (orderId: string, newAddress: ShippingAddress) => {
    // Find the order to get its stripe payment ID
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      showToastMessage('Order not found. Please try again.', 'error');
      return;
    }

    try {
      console.log(`🔄 Updating shipping address for order ${order.orderNumber}...`);
      
      // Update Supabase with the new address
      const result = await updateShippingAddress(order.stripePaymentId, newAddress);
      
      if (!result.success) {
        console.error('Failed to update shipping address:', result.error);
        showToastMessage(`Failed to update address: ${result.error}`, 'error');
        return;
      }

      // Update local state on successful database update
      setOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, shippingAddress: newAddress }
          : o
      ));
      
      console.log(`✅ Successfully updated shipping address for order ${order.orderNumber}`);
      showToastMessage(`Address updated successfully for order ${order.orderNumber}!`, 'success');
      
    } catch (error) {
      console.error('Error updating address:', error);
      showToastMessage('An unexpected error occurred while updating the address. Please try again.', 'error');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    // Find the order to get its stripe payment ID
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      showToastMessage('Order not found. Please try again.', 'error');
      return;
    }

    try {
      console.log(`🔄 Updating status for order ${order.orderNumber} to "${newStatus}"...`);
      
      // Update Supabase with the new status
      const result = await updateOrderStatus(order.stripePaymentId, newStatus);
      
      if (!result.success) {
        console.error('Failed to update order status:', result.error);
        showToastMessage(`Failed to update status: ${result.error}`, 'error');
        return;
      }

      // Update local state on successful database update
      setOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, status: newStatus }
          : o
      ));
      
      console.log(`✅ Successfully updated status for order ${order.orderNumber} to "${newStatus}"`);
      showToastMessage(`Status updated to "${newStatus}" for order ${order.orderNumber}!`, 'success');
      
    } catch (error) {
      console.error('Error updating status:', error);
      showToastMessage('An unexpected error occurred while updating the status. Please try again.', 'error');
    }
  };

  const handleCreateStickerSheets = async () => {
    if (!activeBatch || !orders || orders.length === 0) {
      console.error('No active batch or orders found');
      showToastMessage('No batch or orders to process', 'error');
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
        showToastMessage(`Successfully created ${processedCount} sticker sheets!`, 'success');
      } else {
        showToastMessage('No sticker sheets were created. Please check the console for errors.', 'error');
      }

    } catch (error) {
      console.error('❌ Error creating sticker sheets:', error);
      showToastMessage('An error occurred while creating sticker sheets. Please try again.', 'error');
    } finally {
      setIsCreatingStickers(false);
    }
  };

  const handleDownloadBatchImages = async () => {
    if (!activeBatch || !orders || orders.length === 0) {
      console.error('No active batch or orders found');
      showToastMessage('No batch or images to download', 'error');
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
        showToastMessage('No images could be downloaded. Please check the image URLs.', 'error');
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
        showToastMessage(`Download completed! ${successCount} images downloaded successfully. ${failCount} images failed to download.`, 'success');
      } else {
        showToastMessage(`Successfully downloaded all ${successCount} sticker sheet images!`, 'success');
      }

    } catch (error) {
      console.error('❌ Error creating zip download:', error);
      showToastMessage('An error occurred while creating the download. Please try again.', 'error');
    }
  };

  const handleDownloadEnvelopeImages = async () => {
    if (!activeBatch || !orders || orders.length === 0) {
      console.error('No active batch or orders found');
      showToastMessage('No batch or envelopes to download', 'error');
      return;
    }

    try {
      const zip = new JSZip();
      let successCount = 0;
      let failCount = 0;

      console.log(`Starting download of ${orders.length} envelope images...`);

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        
        try {
          console.log(`Generating envelope ${i + 1}/${orders.length}: ${order.orderNumber}`);
          
                     // Create a temporary canvas to generate the envelope image (3x scale for high resolution)
           const canvas = document.createElement('canvas');
           canvas.width = 2100;  // 700 * 3
           canvas.height = 1500; // 500 * 3
           const ctx = canvas.getContext('2d');
           
           if (!ctx) {
             throw new Error('Could not get canvas context');
           }

           // Clear canvas and draw white background
           ctx.clearRect(0, 0, canvas.width, canvas.height);
           ctx.fillStyle = '#ffffff';
           ctx.fillRect(0, 0, canvas.width, canvas.height);

           // Helper function to get shipping address text
           const getShippingAddressText = () => {
             if (!order.shippingAddress) {
               return 'No Address Available';
             }
             
             if (typeof order.shippingAddress === 'string') {
               return order.shippingAddress.split(',').map(line => line.trim()).join('\n');
             }
             
             return formatShippingAddressMultiLine(order.shippingAddress).join('\n');
           };

           // Create text elements (3x scaled)
           const textElements = [
             {
               text: 'MakeMeASticker\n125 Cervantes Blvd\nSan Francisco, CA 94123',
               x: 90,    // 30 * 3
               y: 120,   // 40 * 3
               fontSize: 42, // 14 * 3
               fontFamily: 'Arial',
               color: '#000000',
               fontWeight: 'normal',
               fontStyle: 'normal',
               textAlign: 'left'
             },
             {
               text: getShippingAddressText(),
               x: canvas.width / 2,  // 1050
               y: canvas.height / 2, // 750
               fontSize: 66, // 22 * 3
               fontFamily: 'Arial',
               color: '#000000',
               fontWeight: 'bold',
               fontStyle: 'normal',
               textAlign: 'center'
             }
           ];

          // Draw text elements
          textElements.forEach(element => {
            ctx.save();
            
            ctx.translate(element.x, element.y);
            
            const fontStyle = element.fontStyle === 'italic' ? 'italic ' : '';
            const fontWeight = element.fontWeight === 'bold' ? 'bold ' : '';
            ctx.font = `${fontStyle}${fontWeight}${element.fontSize}px ${element.fontFamily}`;
            ctx.fillStyle = element.color;
            ctx.textAlign = element.textAlign as CanvasTextAlign;
            
            const lines = element.text.split('\n');
            const lineHeight = element.fontSize * 1.3;
            
            lines.forEach((line, index) => {
              const yOffset = index * lineHeight;
              ctx.fillText(line, 0, yOffset);
            });

            ctx.restore();
          });

          // Convert canvas to blob
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob from canvas'));
              }
            }, 'image/png');
          });
          
          const filename = `order-${order.orderNumber}_envelope.png`;
          zip.file(filename, blob);
          successCount++;
          
          console.log(`✅ Added ${filename} to zip`);
          
        } catch (error) {
          console.error(`❌ Failed to generate envelope for order ${order.orderNumber}:`, error);
          failCount++;
        }
      }

      if (successCount === 0) {
        showToastMessage('No envelope images could be generated.', 'error');
        return;
      }

      console.log('Generating zip file...');
      const zipBlob = await zip.generateAsync({
        type: "blob",
        streamFiles: true
      });

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(zipBlob);
      link.download = `${activeBatch.name}_envelopes.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(link.href);

      console.log(`✅ Successfully downloaded ${successCount} envelope images in zip file`);
      
      if (failCount > 0) {
        showToastMessage(`Download completed! ${successCount} envelope images downloaded successfully. ${failCount} envelopes failed to generate.`, 'success');
      } else {
        showToastMessage(`Successfully downloaded all ${successCount} envelope images!`, 'success');
      }

    } catch (error) {
      console.error('❌ Error creating envelope zip download:', error);
      showToastMessage('An error occurred while creating the envelope download. Please try again.', 'error');
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
            {/* Batch Selection and Status Filter */}
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

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-1">
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-[220px] h-9">
                    <SelectValue placeholder="Filter by status...">
                      {statusFilter && statusFilter !== 'Show All' && (
                        <div className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            statusFilter === 'Approved Batchable' ? 'bg-green-500' :
                            statusFilter === 'Contact User' ? 'bg-blue-500' :
                            statusFilter === 'Alan Review' ? 'bg-yellow-500' :
                            statusFilter === 'Question' ? 'bg-purple-500' :
                            statusFilter === 'Hide' ? 'bg-red-500' :
                            statusFilter === 'Batch In Progress' ? 'bg-orange-500' :
                            statusFilter === 'Sticker Printed' ? 'bg-teal-500' :
                            statusFilter === 'Sticker Printing Ready' ? 'bg-cyan-500' :
                            statusFilter === 'Printed' ? 'bg-lime-500' :
                            statusFilter === 'Packaged - Contact User' ? 'bg-indigo-500' :
                            statusFilter === 'Packaged - User Contacted' ? 'bg-violet-500' :
                            statusFilter === 'Done' ? 'bg-emerald-500' :
                            statusFilter === 'No Status' ? 'bg-gray-300' :
                            'bg-gray-300'
                          }`}></span>
                          {statusOptions.find(opt => opt.value === statusFilter)?.label || statusFilter}
                        </div>
                      )}
                      {(!statusFilter || statusFilter === 'Show All') && (
                        <span className="text-gray-500">Show All</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Show All">
                      <div className="flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-200"></span>
                        Show All
                      </div>
                    </SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            option.value === 'Approved Batchable' ? 'bg-green-500' :
                            option.value === 'Contact User' ? 'bg-blue-500' :
                            option.value === 'Alan Review' ? 'bg-yellow-500' :
                            option.value === 'Question' ? 'bg-purple-500' :
                            option.value === 'Hide' ? 'bg-red-500' :
                            option.value === 'Batch In Progress' ? 'bg-orange-500' :
                            option.value === 'Sticker Printed' ? 'bg-teal-500' :
                            option.value === 'Sticker Printing Ready' ? 'bg-cyan-500' :
                            option.value === 'Printed' ? 'bg-lime-500' :
                            option.value === 'Packaged - Contact User' ? 'bg-indigo-500' :
                            option.value === 'Packaged - User Contacted' ? 'bg-violet-500' :
                            option.value === 'Done' ? 'bg-emerald-500' :
                            option.value === 'No Status' ? 'bg-gray-300' :
                            'bg-gray-300'
                          }`}></span>
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Clear Filter Button - only show when filter is active */}
                {statusFilter && statusFilter !== 'Show All' && (
                  <button
                    onClick={clearStatusFilter}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Clear filter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
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
                Download All Sticker Sheet Images
              </Button>
              
              {/* Download Envelopes Button */}
              <Button
                onClick={handleDownloadEnvelopeImages}
                disabled={!activeBatch || !orders || orders.length === 0}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All Envelope Images
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
                        onUpdateAddress={handleUpdateAddress}
                        onUpdateStatus={handleUpdateStatus}
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
                      onUpdateAddress={handleUpdateAddress}
                      onUpdateStatus={handleUpdateStatus}
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
                      onUpdateAddress={handleUpdateAddress}
                      onUpdateStatus={handleUpdateStatus}
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

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded-md shadow-lg z-50 transition-all duration-300 ${
          toastType === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          <div className="flex items-center gap-2">
            {toastType === 'success' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
} 