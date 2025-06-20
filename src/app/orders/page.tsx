"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PopoverCutoffText } from "@/components/ui/popover-cutoff-text";
import { TableImagePopover } from "@/components/TableImagePopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { fetchPhysicalStripeEvents, fetchStripeEventColumns, fetchPhysicalMailOrderColumns, fetchModelRunsColumns, CombinedOrderEvent } from './actions/pull-orders-from-supabase';
import { getCurrentAdminDefaults, saveCurrentAdminDefaults } from './actions/admin-profiles';

// Add batch interfaces
interface Batch {
  batch_id: string;
  name: string;
  created_at: string;
  order_ids: number[];
  order_data: CombinedOrderEvent[]; // Store actual order data
}

export default function OrdersPage() {
  const [events, setEvents] = useState<CombinedOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [stripeColumns, setStripeColumns] = useState<string[]>([]);
  const [physicalMailColumns, setPhysicalMailColumns] = useState<string[]>([]);
  const [modelRunsColumns, setModelRunsColumns] = useState<string[]>([]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [currentAdminName, setCurrentAdminName] = useState<string>('Joey');
  const popoverRef = useRef<HTMLDivElement>(null);
  const eventsPerPage = 100;


  // Add state for bulk selection
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Add batch creation state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Add dropdown state for the new filter dropdown
  const [filterDropdownValue, setFilterDropdownValue] = useState<string>('');

  // Add search state
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Batch management functions
  const getBatches = (): Batch[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('print_order_batches');
    return stored ? JSON.parse(stored) : [];
  };

  const saveBatches = (batches: Batch[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('print_order_batches', JSON.stringify(batches));
  };

  const createBatch = () => {
    if (!batchName.trim()) return;
    
    setIsCreatingBatch(true);
    
    // Get the actual order data for selected items
    const selectedOrderData = events.filter(event => selectedItems.has(event.id));
    
    // Create batch with timestamp ID
    const batch_id = Date.now().toString();
    const newBatch: Batch = {
      batch_id,
      name: batchName.trim(),
      created_at: new Date().toISOString(),
      order_ids: Array.from(selectedItems),
      order_data: selectedOrderData // Store the actual order data
    };

    // Save to localStorage
    const currentBatches = getBatches();
    const updatedBatches = [...currentBatches, newBatch];
    saveBatches(updatedBatches);

    console.log('Batch created:', newBatch);
    
    // Reset state
    setSelectedItems(new Set());
    setBatchName('');
    setShowBatchModal(false);
    setIsCreatingBatch(false);
    
    // Optional: Show success message or redirect
    alert(`Batch "${newBatch.name}" created with ${newBatch.order_ids.length} orders!`);
  };

  const handleCreateBatchClick = () => {
    if (selectedItems.size < 2) return; // Require at least 2 items
    setShowBatchModal(true);
  };

  // Handle selecting/deselecting individual items
  const handleItemSelect = (eventId: number, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(eventId);
      } else {
        newSet.delete(eventId);
      }
      return newSet;
    });
  };

  // Handle select all/deselect all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allEventIds = filteredData.map(event => event.id);
      setSelectedItems(new Set(allEventIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalEvents / eventsPerPage);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return events;
    
    return events.filter((item) => {
      // Search across all fields in the item
      const searchableText = Object.values(item)
        .map(value => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        })
        .join(' ')
        .toLowerCase();
      
      return searchableText.includes(searchTerm.toLowerCase());
    });
  }, [events, searchTerm]);





  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load columns metadata and admin defaults in parallel
        const [stripeEventColumns, physicalMailOrderColumns, modelRunsColumns, adminDefaults] = await Promise.all([
          fetchStripeEventColumns(),
          fetchPhysicalMailOrderColumns(),
          fetchModelRunsColumns(),
          getCurrentAdminDefaults()
        ]);
        
        setStripeColumns(stripeEventColumns);
        setPhysicalMailColumns(physicalMailOrderColumns);
        setModelRunsColumns(modelRunsColumns);
        
        // Use Joey's saved defaults or fallback to hardcoded defaults
        let defaultColumns: string[];
        if (adminDefaults.success && adminDefaults.data.default_column_arrays.length > 0) {
          defaultColumns = adminDefaults.data.default_column_arrays;
          setCurrentAdminName(adminDefaults.data.admin_name);
          console.log(`✅ Loaded column defaults for ${adminDefaults.data.admin_name}:`, defaultColumns);
        } else {
          // Fallback to hardcoded defaults if no admin defaults found
          defaultColumns = [
            // Stripe captured events columns
            'id',
            'created_timestamp_est',
            'user_id',
            'model_run_id',
            // Physical mail orders columns (with pmo_ prefix)
            'pmo_shipping_address',
            'pmo_status',
            'pmo_order_number',
            'pmo_email',
            // Model runs columns (with mr_ prefix)
            'mr_original_output_image_url',
            'mr_output_image_url',
            'mr_input_image_url'
          ];
          console.log('⚠️ No admin defaults found, using fallback columns:', defaultColumns);
        }
        
        setVisibleColumns(defaultColumns);
      } catch (error) {
        console.error('Error loading columns:', error);
        // Fallback to hardcoded defaults on error
        const fallbackColumns = [
          'id',
          'created_timestamp_est',
          'user_id',
          'model_run_id',
          'pmo_shipping_address',
          'pmo_status',
          'pmo_order_number',
          'pmo_email',
          'mr_original_output_image_url',
          'mr_output_image_url',
          'mr_input_image_url'
        ];
        setVisibleColumns(fallbackColumns);
      }
    };

    loadData();
  }, []);

  // Separate effect for loading page data
  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      try {
        const { events: stripeEvents, total } = await fetchPhysicalStripeEvents(currentPage, eventsPerPage);
        setEvents(stripeEvents);
        setTotalEvents(total);
      } catch (error) {
        console.error('Error loading page data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [currentPage]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowColumnPopover(false);
      }
    };

    if (showColumnPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnPopover]);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };



  const getPaymentSourceColor = (source: string | null) => {
    switch (source) {
      case 'physical_mail': return 'bg-blue-100 text-blue-800';
      case 'paywall_screen': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleColumnVisibility = (columnName: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(col => col !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  const saveAsDefaults = async () => {
    setIsSavingDefaults(true);
    try {
      const result = await saveCurrentAdminDefaults(
        visibleColumns,
        `Column defaults updated at ${new Date().toLocaleString()}`
      );
      
      if (result.success) {
        console.log(`✅ Saved column defaults for ${currentAdminName}:`, visibleColumns);
        alert(`Column defaults saved successfully for ${currentAdminName}!`);
      } else {
        console.error('Failed to save column defaults:', result.error);
        alert(`Failed to save defaults: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving column defaults:', error);
      alert('An error occurred while saving defaults');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const formatColumnHeader = (columnName: string) => {
    // Remove pmo_ or mr_ prefix for display
    let displayName = columnName;
    if (columnName.startsWith('pmo_')) {
      displayName = columnName.substring(4);
    } else if (columnName.startsWith('mr_')) {
      displayName = columnName.substring(3);
    }
    const formatted = displayName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Truncate to 12 characters with ellipsis
    return formatted.length > 12 ? formatted.substring(0, 12) + '...' : formatted;
  };

  const getColumnHeaderColor = (columnName: string) => {
    if (columnName.startsWith('pmo_')) {
      return 'text-purple-600'; // Purple for physical mail orders
    } else if (columnName.startsWith('mr_')) {
      return 'text-green-600'; // Green for model runs
    }
    return 'text-blue-600'; // Blue for stripe captured events
  };

  const renderCellContent = (event: CombinedOrderEvent, columnName: string) => {
    const value = event[columnName as keyof CombinedOrderEvent];
    
    // Check if this is an image URL column and the value is a valid URL
    if (columnName.includes('image_url') && value) {
      let imageUrl: string | null = null;
      
      // Handle arrays of image URLs (like mr_output_image_url which can be an array)
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].startsWith('http')) {
        imageUrl = value[0]; // Use the first image URL if it's an array
      } else if (typeof value === 'string' && value.startsWith('http')) {
        imageUrl = value;
      }
      
      if (imageUrl) {
        return <TableImagePopover imageUrl={imageUrl} alt="Order image" />;
      }
      
      // If no valid image URL found, render as text
      const textValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
      return <PopoverCutoffText text={textValue} className="font-mono" style={{ fontSize: '10px' }} />;
    }
    
    switch (columnName) {
      case 'amount':
      case 'pmo_amount':
      case 'mr_cost':
        if (columnName === 'pmo_amount') {
          // Physical mail order amounts are in cents
          const amountInDollars = value ? (value as number) / 100 : null;
          const formatted = formatCurrency(amountInDollars);
          return <PopoverCutoffText text={formatted} className="font-medium whitespace-nowrap" />;
        }
        const formatted = formatCurrency(value as number);
        return <PopoverCutoffText text={formatted} className="font-medium whitespace-nowrap" />;
      case 'mr_duration_ms':
        const duration = value ? `${value}ms` : '-';
        return <PopoverCutoffText text={duration} className="whitespace-nowrap" style={{ fontSize: '12px' }} />;
      case 'mr_credits_used':
        const credits = value ? String(value) : '-';
        return <PopoverCutoffText text={credits} className="whitespace-nowrap" style={{ fontSize: '12px' }} />;
      case 'payment_source':
        return (
          <Badge className={getPaymentSourceColor(value as string)}>
            <PopoverCutoffText text={value || '-'} />
          </Badge>
        );
      case 'pack_type':
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <PopoverCutoffText text={value || '-'} />
          </Badge>
        );
      case 'pmo_status':
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <PopoverCutoffText text={value || '-'} />
          </Badge>
        );
      case 'mr_status':
        return (
          <Badge className="bg-green-100 text-green-800">
            <PopoverCutoffText text={value || '-'} />
          </Badge>
        );

      case 'payload':
      case 'pmo_shipping_address':
      case 'pmo_items':
      case 'pmo_metadata':
      case 'mr_input_data':
      case 'mr_output_data':
      case 'mr_metadata':
      case 'mr_output_images':
        const payloadStr = value ? JSON.stringify(value) : '-';
        return <PopoverCutoffText text={payloadStr} className="font-mono whitespace-nowrap" style={{ fontSize: '10px' }} />;
      case 'created_timestamp':
        if (!value) return <PopoverCutoffText text="-" className="whitespace-nowrap" style={{ fontSize: '12px' }} />;
        const timestamp = typeof value === 'number' ? value * 1000 : new Date(value as string).getTime();
        const formattedTimestamp = new Date(timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return <PopoverCutoffText text={formattedTimestamp} className="whitespace-nowrap" style={{ fontSize: '12px' }} />;
      case 'created_timestamp_est':
        // Remove year from created_timestamp_est display
        if (!value) return <PopoverCutoffText text="-" className="whitespace-nowrap" style={{ fontSize: '12px' }} />;
        const estDate = new Date(value as string);
        const estFormatted = estDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return <PopoverCutoffText text={estFormatted} className="whitespace-nowrap" style={{ fontSize: '12px' }} />;
      case 'pmo_shipped_at':
      case 'pmo_delivered_at':
      case 'pmo_created_at':
      case 'pmo_updated_at':
      case 'mr_created_at':
      case 'mr_updated_at':

      case 'transaction_id':
      case 'user_id':
      case 'model_run_id':
      case 'pmo_id':
      case 'pmo_payment_intent_id':
      case 'pmo_user_id':
      case 'pmo_model_run_id':
      case 'pmo_tracking_number':
      case 'pmo_order_number':
      case 'mr_id':
      case 'mr_user_id':
      case 'mr_model_name':
      case 'mr_model_version':
      case 'mr_prompt':
      case 'mr_error':
        const idText = value ? String(value) : '-';
        return <PopoverCutoffText text={idText} className="font-mono whitespace-nowrap" style={{ fontSize: '10px' }} />;
      case 'id':
        const idValue = value ? String(value) : '-';
        return <PopoverCutoffText text={idValue} className="font-mono whitespace-nowrap" style={{ fontSize: '12px' }} />;
      default:
        const defaultText = value ? String(value) : '-';
        return <PopoverCutoffText text={defaultText} className="whitespace-nowrap" style={{ fontSize: '12px' }} />;
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-[3000px] mx-auto">
        <div className="mb-8">
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColumnPopover(!showColumnPopover)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Button>
              
              {/* Column Visibility Popover */}
              {showColumnPopover && (
                <div 
                  ref={popoverRef}
                  className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-6 overflow-hidden"
                  style={{ width: '1900px', minHeight: '900px' }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Show/Hide Columns</h3>
                    <span className="text-sm text-gray-600">Admin: <span className="font-medium text-blue-600">{currentAdminName}</span></span>
                  </div>
                  
                  <div className="flex gap-6 overflow-x-auto" style={{ maxHeight: '800px' }}>
                    {/* Original Data Sources */}
                    <div className="flex gap-0 flex-shrink-0">
                      {/* Stripe Captured Events Column */}
                      <div style={{ width: '245px' }} className="flex-shrink-0 pr-6">
                        <h4 className="text-base font-medium text-blue-600 mb-2">Stripe Captured Events</h4>
                        <div className="flex gap-1 mb-4">
                          <button
                            onClick={() => {
                              setVisibleColumns(prev => [
                                ...prev.filter(col => !stripeColumns.includes(col)),
                                ...stripeColumns
                              ]);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            All
                          </button>
                          <span className="text-xs text-gray-400">|</span>
                          <button
                            onClick={() => {
                              setVisibleColumns(prev => prev.filter(col => !stripeColumns.includes(col)));
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="space-y-2">
                          {stripeColumns.map((column) => (
                            <label key={column} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={visibleColumns.includes(column)}
                                onChange={() => toggleColumnVisibility(column)}
                                className="rounded border-gray-300 w-4 h-4"
                              />
                              <span className="text-gray-700 font-mono" style={{ fontSize: '10px' }}>{column}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Vertical Divider */}
                      <div className="w-px bg-gray-200 mx-3 flex-shrink-0" />

                      {/* Physical Mail Orders Column */}
                      <div style={{ width: '245px' }} className="flex-shrink-0 px-6">
                        <h4 className="text-base font-medium text-purple-600 mb-2">Physical Mail Orders</h4>
                        <div className="flex gap-1 mb-4">
                          <button
                            onClick={() => {
                              const pmoColumns = physicalMailColumns.map(col => `pmo_${col}`);
                              setVisibleColumns(prev => [
                                ...prev.filter(col => !pmoColumns.includes(col)),
                                ...pmoColumns
                              ]);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
                          >
                            All
                          </button>
                          <span className="text-xs text-gray-400">|</span>
                          <button
                            onClick={() => {
                              const pmoColumns = physicalMailColumns.map(col => `pmo_${col}`);
                              setVisibleColumns(prev => prev.filter(col => !pmoColumns.includes(col)));
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="space-y-2">
                          {physicalMailColumns.map((column) => {
                            const prefixedColumn = `pmo_${column}`;
                            return (
                              <label key={prefixedColumn} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.includes(prefixedColumn)}
                                  onChange={() => toggleColumnVisibility(prefixedColumn)}
                                  className="rounded border-gray-300 w-4 h-4"
                                />
                                <span className="text-gray-700 font-mono" style={{ fontSize: '10px' }}>{column}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Vertical Divider */}
                      <div className="w-px bg-gray-200 mx-3 flex-shrink-0" />

                      {/* Model Runs Column */}
                      <div style={{ width: '245px' }} className="flex-shrink-0 pl-6">
                        <h4 className="text-base font-medium text-green-600 mb-2">Model Runs</h4>
                        <div className="flex gap-1 mb-4">
                          <button
                            onClick={() => {
                              const mrColumns = modelRunsColumns.map(col => `mr_${col}`);
                              setVisibleColumns(prev => [
                                ...prev.filter(col => !mrColumns.includes(col)),
                                ...mrColumns
                              ]);
                            }}
                            className="text-xs text-green-600 hover:text-green-800 hover:underline"
                          >
                            All
                          </button>
                          <span className="text-xs text-gray-400">|</span>
                          <button
                            onClick={() => {
                              const mrColumns = modelRunsColumns.map(col => `mr_${col}`);
                              setVisibleColumns(prev => prev.filter(col => !mrColumns.includes(col)));
                            }}
                            className="text-xs text-green-600 hover:text-green-800 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="space-y-2">
                          {modelRunsColumns.map((column) => {
                            const prefixedColumn = `mr_${column}`;
                            return (
                              <label key={prefixedColumn} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.includes(prefixedColumn)}
                                  onChange={() => toggleColumnVisibility(prefixedColumn)}
                                  className="rounded border-gray-300 w-4 h-4"
                                />
                                <span className="text-gray-700 font-mono" style={{ fontSize: '10px' }}>{column}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>



                    {/* 5th Column - Selected Columns Summary */}
                    <div className="relative flex-shrink-0">
                      <div 
                        className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200 shadow-sm"
                        style={{ width: '320px' }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-gray-700">Selected Columns Summary</h4>
                            <p className="text-xs text-gray-600 mt-0.5">Currently Visible Columns</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Stripe Captured Events - Selected */}
                          {(() => {
                            const selectedStripeColumns = visibleColumns.filter(col => stripeColumns.includes(col));
                            return selectedStripeColumns.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-blue-600 mb-2">Stripe Captured Events</h5>
                                <div className="space-y-1 pl-2">
                                  {selectedStripeColumns.map(column => (
                                    <div key={column} className="flex items-center gap-2">
                                      <span className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0"></span>
                                      <span className="text-blue-600 font-mono text-xs">{column}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Physical Mail Orders - Selected */}
                          {(() => {
                            const selectedPmoColumns = visibleColumns.filter(col => col.startsWith('pmo_'));
                            return selectedPmoColumns.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-purple-600 mb-2">Physical Mail Orders</h5>
                                <div className="space-y-1 pl-2">
                                  {selectedPmoColumns.map(column => (
                                    <div key={column} className="flex items-center gap-2">
                                      <span className="w-1 h-1 bg-purple-500 rounded-full flex-shrink-0"></span>
                                      <span className="text-purple-600 font-mono text-xs">{column.substring(4)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Model Runs - Selected */}
                          {(() => {
                            const selectedMrColumns = visibleColumns.filter(col => col.startsWith('mr_'));
                            return selectedMrColumns.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-green-600 mb-2">Model Runs</h5>
                                <div className="space-y-1 pl-2">
                                  {selectedMrColumns.map(column => (
                                    <div key={column} className="flex items-center gap-2">
                                      <span className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></span>
                                      <span className="text-green-600 font-mono text-xs">{column.substring(3)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Empty state */}
                          {(() => {
                            const totalSelected = visibleColumns.filter(col => 
                              stripeColumns.includes(col) || 
                              col.startsWith('pmo_') || 
                              col.startsWith('mr_')
                            ).length;
                            return totalSelected === 0 && (
                              <div className="text-center py-8">
                                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p className="text-xs text-gray-500">No columns selected from<br/>the three sections</p>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Info Box */}
                        <div className="mt-4 p-3 bg-gray-100/50 rounded-md border border-gray-200">
                          <p className="text-xs text-gray-600 leading-relaxed mb-2">
                            <span className="font-semibold">Summary:</span> Currently visible columns from Stripe, Physical Mail Orders, and Model Runs sections.
                          </p>
                          <p className="text-xs text-green-600 leading-relaxed">
                            <span className="font-semibold">💾 Admin Defaults:</span> Column visibility loaded from {currentAdminName}'s profile. Use the green "Save Column Defaults" button in the header to persist changes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Add new dropdown between eye icon and Create Batch */}
              <Select value={filterDropdownValue} onValueChange={setFilterDropdownValue}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved-batchable">Approved Batachable</SelectItem>
                  <SelectItem value="contact-user">Contact User</SelectItem>
                  <SelectItem value="alan-review">Alan Review</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="hide">Hide</SelectItem>
                </SelectContent>
              </Select>

              {/* Add search bar */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search all data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[200px] h-9 pl-8"
                />
                <svg className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <Button 
                variant={selectedItems.size > 1 ? "default" : "outline"}
                size="sm"
                disabled={selectedItems.size < 2}
                onClick={handleCreateBatchClick}
                className={`transition-all duration-200 ${
                  selectedItems.size > 1 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
                }`}
              >
                Create Batch
                {selectedItems.size > 0 && selectedItems.size < 2 && (
                  <span className="ml-1 text-xs">({selectedItems.size}/2 min)</span>
                )}
              </Button>

              <Button
                onClick={saveAsDefaults}
                disabled={isSavingDefaults}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                title={`Save current column visibility as default for ${currentAdminName}`}
              >
                {isSavingDefaults ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Save Column Defaults ({currentAdminName})
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * eventsPerPage) + 1}-{Math.min(currentPage * eventsPerPage, totalEvents)} of {totalEvents.toLocaleString()} events
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p>Loading orders...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="w-12 p-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.size > 0 && selectedItems.size === filteredData.length}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-center p-0.5 font-normal text-gray-300 whitespace-nowrap" style={{ width: '15px', fontSize: '8px' }}>#</th>
                      {visibleColumns.map((column, index) => (
                        <th 
                          key={column} 
                          className={`text-left p-3 font-medium whitespace-nowrap ${getColumnHeaderColor(column)}`}
                          style={{ 
                            width: index === visibleColumns.length - 1 ? 'auto' : '80px',
                            fontSize: '10px'
                          }}
                        >
                          <PopoverCutoffText 
                            text={formatColumnHeader(column)} 
                            className="whitespace-nowrap" 
                            style={{ fontSize: '10px' }}
                          />
                        </th>
                      ))}
                      <th className="text-left p-3 font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: '80px', fontSize: '10px' }}>Actions</th>
                      <th className="text-center p-3 font-medium text-xs whitespace-nowrap" style={{ width: '60px', fontSize: '10px' }}>Send</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((event, index) => (
                      <tr key={event.id} className="border-b hover:bg-gray-50" style={{ height: '60px' }}>
                        <td className="text-center p-2 align-middle" style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(event.id)}
                            onChange={(e) => handleItemSelect(event.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                        </td>
                        <td className="text-center p-0.5 align-middle" style={{ width: '15px' }}>
                          <div className="text-gray-300" style={{ fontSize: '10px' }}>{((currentPage - 1) * eventsPerPage) + index + 1}</div>
                        </td>
                        {visibleColumns.map((column, colIndex) => (
                          <td 
                            key={column} 
                            className="p-3 align-middle" 
                            style={{ 
                              width: colIndex === visibleColumns.length - 1 ? 'auto' : '80px' 
                            }}
                          >
                            {renderCellContent(event, column)}
                          </td>
                        ))}
                        <td className="p-3 align-middle" style={{ width: '80px' }}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // TODO: Implement view details functionality
                              console.log('View details for event:', event.id);
                            }}
                          >
                            View Details
                          </Button>
                        </td>
                        <td className="text-center p-3 align-middle" style={{ width: '60px' }}>
                          <svg 
                            className="w-4 h-4 text-gray-400 mx-auto" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                            />
                          </svg>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Footer */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-2 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch Creation Modal */}
        <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="batch-name" className="text-sm font-medium">
                  Batch Name
                </label>
                <Input
                  id="batch-name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Enter batch name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && batchName.trim()) {
                      createBatch();
                    }
                  }}
                />
              </div>
              <div className="text-sm text-gray-500">
                Creating batch with {selectedItems.size} selected orders
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBatchModal(false);
                  setBatchName('');
                }}
                disabled={isCreatingBatch}
              >
                Cancel
              </Button>
              <Button
                onClick={createBatch}
                disabled={!batchName.trim() || isCreatingBatch}
              >
                {isCreatingBatch ? 'Creating...' : 'Create Batch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
