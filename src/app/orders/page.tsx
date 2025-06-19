"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PopoverCutoffText } from "@/components/ui/popover-cutoff-text";
import { TableImagePopover } from "@/components/TableImagePopover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { fetchPhysicalStripeEvents, fetchStripeEventColumns, fetchPhysicalMailOrderColumns, fetchModelRunsColumns, fetchPhysicalMailOrderRetoolColumns, CombinedOrderEvent, updateRetoolField } from './actions/pull-orders-from-supabase';

export default function OrdersPage() {
  const [events, setEvents] = useState<CombinedOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [stripeColumns, setStripeColumns] = useState<string[]>([]);
  const [physicalMailColumns, setPhysicalMailColumns] = useState<string[]>([]);
  const [modelRunsColumns, setModelRunsColumns] = useState<string[]>([]);
  const [retoolColumns, setRetoolColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const eventsPerPage = 100;
  
  // Add state for editing cells
  const [editingCell, setEditingCell] = useState<{eventId: number; field: string} | null>(null);
  const [editValue, setEditValue] = useState<any>(null);

  // Handle saving edits
  const handleSaveEdit = async (eventId: number, field: string, value: any) => {
    const result = await updateRetoolField(eventId, field, value);
    
    if (result.success) {
      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId ? { ...event, [field]: value } : event
        )
      );
      setEditingCell(null);
      setEditValue(null);
    } else {
      console.error('Failed to update field:', result.error);
      alert(`Failed to update: ${result.error}`);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load columns metadata (only needed once)
        const [stripeEventColumns, physicalMailOrderColumns, modelRunsColumns, retoolColumns] = await Promise.all([
          fetchStripeEventColumns(),
          fetchPhysicalMailOrderColumns(),
          fetchModelRunsColumns(),
          fetchPhysicalMailOrderRetoolColumns()
        ]);
        
        setStripeColumns(stripeEventColumns);
        setPhysicalMailColumns(physicalMailOrderColumns);
        setModelRunsColumns(modelRunsColumns);
        setRetoolColumns(retoolColumns);
        
        // Set default visible columns (currently displayed ones)
        const defaultColumns = [
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
        setVisibleColumns(defaultColumns);
      } catch (error) {
        console.error('Error loading columns:', error);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    } else if (columnName.startsWith('pmor_')) {
      return 'text-orange-600'; // Orange for retool catch-all
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
      case 'pmor_dashboard_status':
        if (editingCell?.eventId === event.id && editingCell?.field === columnName) {
          return (
            <Select
              value={editValue || ''}
              onValueChange={(newValue) => {
                handleSaveEdit(event.id, columnName, newValue);
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingCell(null);
                  setEditValue(null);
                }
              }}
              defaultOpen={true}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="printed">Printed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge 
            className="bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200"
            onClick={() => {
              setEditingCell({ eventId: event.id, field: columnName });
              setEditValue(value);
            }}
          >
            <PopoverCutoffText text={value || 'Click to set'} />
          </Badge>
        );
      case 'pmor_assigned_to':
        if (editingCell?.eventId === event.id && editingCell?.field === columnName) {
          return (
            <Select
              value={editValue || ''}
              onValueChange={(newValue) => {
                handleSaveEdit(event.id, columnName, newValue);
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingCell(null);
                  setEditValue(null);
                }
              }}
              defaultOpen={true}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Joey Hububalerto">Joey Hububalerto</SelectItem>
                <SelectItem value="Alan">Alan</SelectItem>
                <SelectItem value="Other / see notes">Other / see notes</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge 
            className="bg-indigo-100 text-indigo-800 cursor-pointer hover:bg-indigo-200"
            onClick={() => {
              setEditingCell({ eventId: event.id, field: columnName });
              setEditValue(value);
            }}
          >
            <PopoverCutoffText text={value || 'Click to assign'} />
          </Badge>
        );
      case 'pmor_priority_level':
        if (editingCell?.eventId === event.id && editingCell?.field === columnName) {
          return (
            <Select
              value={String(editValue || 0)}
              onValueChange={(newValue) => {
                handleSaveEdit(event.id, columnName, parseInt(newValue));
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingCell(null);
                  setEditValue(null);
                }
              }}
              defaultOpen={true}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">P0 - Normal</SelectItem>
                <SelectItem value="1">P1 - High</SelectItem>
                <SelectItem value="2">P2 - Urgent</SelectItem>
                <SelectItem value="3">P3 - Critical</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        const priorityColor = value === 3 ? 'bg-red-100 text-red-800' : 
                            value === 2 ? 'bg-orange-100 text-orange-800' : 
                            value === 1 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800';
        return (
          <Badge 
            className={`${priorityColor} cursor-pointer hover:opacity-80`}
            onClick={() => {
              setEditingCell({ eventId: event.id, field: columnName });
              setEditValue(value || 0);
            }}
          >
            <PopoverCutoffText text={value !== null && value !== undefined ? `P${value}` : 'Set priority'} />
          </Badge>
        );
      case 'pmor_custom_tags':
        if (editingCell?.eventId === event.id && editingCell?.field === columnName) {
          return (
            <div className="flex flex-col gap-1">
              <Input
                type="text"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const tags = editValue.split(',').map((tag: string) => tag.trim()).filter(Boolean);
                    handleSaveEdit(event.id, columnName, tags);
                  } else if (e.key === 'Escape') {
                    setEditingCell(null);
                    setEditValue(null);
                  }
                }}
                placeholder="Enter tags separated by commas"
                className="w-[200px] h-8 text-xs"
                autoFocus
              />
              <span className="text-[10px] text-gray-500">Press Enter to save, Esc to cancel</span>
            </div>
          );
        }
        if (Array.isArray(value) && value.length > 0) {
          return (
            <div 
              className="flex gap-1 flex-wrap cursor-pointer hover:opacity-80"
              onClick={() => {
                setEditingCell({ eventId: event.id, field: columnName });
                setEditValue(value.join(', '));
              }}
            >
              {value.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} className="bg-blue-100 text-blue-800" style={{ fontSize: '10px' }}>
                  {tag}
                </Badge>
              ))}
              {value.length > 2 && (
                <Badge className="bg-gray-100 text-gray-800" style={{ fontSize: '10px' }}>
                  +{value.length - 2}
                </Badge>
              )}
            </div>
          );
        }
        return (
          <div 
            className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
            onClick={() => {
              setEditingCell({ eventId: event.id, field: columnName });
              setEditValue('');
            }}
          >
            <PopoverCutoffText text="Click to add tags" className="whitespace-nowrap text-gray-500" style={{ fontSize: '12px' }} />
          </div>
        );
      case 'pmor_internal_notes':
        if (editingCell?.eventId === event.id && editingCell?.field === columnName) {
          return (
            <div className="flex flex-col gap-1">
              <Textarea
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSaveEdit(event.id, columnName, editValue);
                  } else if (e.key === 'Escape') {
                    setEditingCell(null);
                    setEditValue(null);
                  }
                }}
                placeholder="Enter internal notes..."
                className="w-[300px] min-h-[60px] text-xs"
                autoFocus
              />
              <span className="text-[10px] text-gray-500">Ctrl+Enter to save, Esc to cancel</span>
            </div>
          );
        }
        return (
          <div 
            className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
            onClick={() => {
              setEditingCell({ eventId: event.id, field: columnName });
              setEditValue(value || '');
            }}
          >
            <PopoverCutoffText 
              text={value || 'Click to add notes'} 
              className={`font-mono whitespace-nowrap ${!value ? 'text-gray-500' : ''}`} 
              style={{ fontSize: '10px' }} 
            />
          </div>
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
      case 'pmor_last_updated':
        const dateFormatted = formatDate(value as string);
        return <PopoverCutoffText text={dateFormatted} className="whitespace-nowrap" style={{ fontSize: '12px' }} />;
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

  // Calculate total pages
  const totalPages = Math.ceil(totalEvents / eventsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[3000px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2"></h1>
          <p className="text-gray-600"></p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
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
                  style={{ width: '1500px', minHeight: '900px' }}
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Show/Hide Columns</h3>
                  
                  <div className="flex gap-6 overflow-x-auto" style={{ maxHeight: '800px' }}>
                    {/* Original Data Sources */}
                    <div className="flex gap-0 flex-shrink-0">
                      {/* Stripe Captured Events Column */}
                      <div style={{ width: '320px' }} className="flex-shrink-0 pr-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-base font-medium text-blue-600">Stripe Captured Events</h4>
                          <div className="flex gap-1">
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
                      <div style={{ width: '320px' }} className="flex-shrink-0 px-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-base font-medium text-purple-600">Physical Mail Orders</h4>
                          <div className="flex gap-1">
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
                      <div style={{ width: '320px' }} className="flex-shrink-0 pl-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-base font-medium text-green-600">Model Runs</h4>
                          <div className="flex gap-1">
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

                    {/* Divider Section */}
                    <div className="flex items-stretch flex-shrink-0">
                      <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
                        
                        {/* Center Badge */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-8">
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                            <span className="text-xs text-gray-500 font-medium writing-mode-vertical transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
                              TRANSFORMED DATA
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Spacer */}
                      <div style={{ width: '40px' }} />
                    </div>

                    {/* Physical Mail Orders Retool Column - Transformed Data */}
                    <div className="relative flex-shrink-0">
                      <div 
                        className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border border-orange-200 shadow-sm"
                        style={{ width: '360px' }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-orange-700">Physical Mail Orders Retool</h4>
                            <p className="text-xs text-orange-600 mt-0.5">Aggregated & Transformed Data</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const pmorColumns = retoolColumns.map(col => `pmor_${col}`);
                                setVisibleColumns(prev => [
                                  ...prev.filter(col => !pmorColumns.includes(col)),
                                  ...pmorColumns
                                ]);
                              }}
                              className="text-xs text-orange-600 hover:text-orange-800 hover:underline"
                            >
                              All
                            </button>
                            <span className="text-xs text-gray-400">|</span>
                            <button
                              onClick={() => {
                                const pmorColumns = retoolColumns.map(col => `pmor_${col}`);
                                setVisibleColumns(prev => prev.filter(col => !pmorColumns.includes(col)));
                              }}
                              className="text-xs text-orange-600 hover:text-orange-800 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {retoolColumns.map((column) => {
                            const prefixedColumn = `pmor_${column}`;
                            return (
                              <label 
                                key={prefixedColumn} 
                                className="flex items-center space-x-3 cursor-pointer hover:bg-orange-100/50 p-2 rounded-md transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.includes(prefixedColumn)}
                                  onChange={() => toggleColumnVisibility(prefixedColumn)}
                                  className="rounded border-orange-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                                />
                                <span className="text-gray-800 font-mono text-xs flex-1">{column}</span>
                                {/* Add icons for specific column types */}
                                {column === 'dashboard_status' && (
                                  <span className="text-orange-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </span>
                                )}
                                {column === 'internal_notes' && (
                                  <span className="text-orange-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </span>
                                )}
                                {column === 'priority_level' && (
                                  <span className="text-orange-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  </span>
                                )}
                                {column === 'custom_tags' && (
                                  <span className="text-orange-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                        
                        {/* Info Box */}
                        <div className="mt-4 p-3 bg-orange-100/50 rounded-md border border-orange-200">
                          <p className="text-xs text-orange-700 leading-relaxed">
                            <span className="font-semibold">Note:</span> This data is aggregated from multiple sources and may include calculations, summaries, and manual annotations.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event, index) => (
                      <tr key={event.id} className="border-b hover:bg-gray-50" style={{ height: '60px' }}>
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
      </div>
    </div>
  );
}
