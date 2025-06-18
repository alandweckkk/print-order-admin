"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PopoverCutoffText } from "@/components/ui/popover-cutoff-text";

import { fetchPhysicalStripeEvents, fetchStripeEventColumns, fetchPhysicalMailOrderColumns, fetchModelRunsColumns, CombinedOrderEvent } from './actions';

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
  const popoverRef = useRef<HTMLDivElement>(null);
  const eventsPerPage = 100;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load columns metadata (only needed once)
        const [stripeEventColumns, physicalMailOrderColumns, modelRunsColumns] = await Promise.all([
          fetchStripeEventColumns(),
          fetchPhysicalMailOrderColumns(),
          fetchModelRunsColumns()
        ]);
        
        setStripeColumns(stripeEventColumns);
        setPhysicalMailColumns(physicalMailOrderColumns);
        setModelRunsColumns(modelRunsColumns);
        
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
          'pmo_email'
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
    }
    return 'text-blue-600'; // Blue for stripe captured events
  };

  const renderCellContent = (event: CombinedOrderEvent, columnName: string) => {
    const value = event[columnName as keyof CombinedOrderEvent];
    
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
        return <PopoverCutoffText text={duration} className="text-sm whitespace-nowrap" />;
      case 'mr_credits_used':
        const credits = value ? String(value) : '-';
        return <PopoverCutoffText text={credits} className="text-sm whitespace-nowrap" />;
      case 'payment_source':
        return (
          <Badge className={getPaymentSourceColor(value as string)}>
            {truncateText(value || '-')}
          </Badge>
        );
      case 'pack_type':
        return (
          <Badge className="bg-purple-100 text-purple-800">
            {truncateText(value || '-')}
          </Badge>
        );
      case 'pmo_status':
        return (
          <Badge className="bg-orange-100 text-orange-800">
            {truncateText(value || '-')}
          </Badge>
        );
      case 'mr_status':
        return (
          <Badge className="bg-green-100 text-green-800">
            {truncateText(value || '-')}
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
        return <div className="text-xs font-mono whitespace-nowrap overflow-hidden text-ellipsis">{truncateText(payloadStr)}</div>;
      case 'created_timestamp':
        if (!value) return <div className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">-</div>;
        const timestamp = typeof value === 'number' ? value * 1000 : new Date(value as string).getTime();
        const formattedTimestamp = new Date(timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return <div className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">{truncateText(formattedTimestamp)}</div>;
      case 'created_timestamp_est':
      case 'pmo_shipped_at':
      case 'pmo_delivered_at':
      case 'pmo_created_at':
      case 'pmo_updated_at':
      case 'mr_created_at':
      case 'mr_updated_at':
        const dateFormatted = formatDate(value as string);
        return <div className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">{truncateText(dateFormatted)}</div>;
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
      case 'mr_output_image_url':
        const idText = value ? String(value) : '-';
        return (
          <div className="font-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis">
            {truncateText(idText)}
          </div>
        );
      case 'id':
        const idValue = value ? String(value) : '-';
        return <div className="font-mono text-sm whitespace-nowrap overflow-hidden text-ellipsis">{truncateText(idValue)}</div>;
      default:
        const defaultText = value ? String(value) : '-';
        return <div className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">{truncateText(defaultText)}</div>;
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalEvents / eventsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[2000px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Stripe Captured Events (Physical)</h1>
          <p className="text-gray-600">Payment events for physical mail sticker orders</p>
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
                  className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-6"
                  style={{ width: '900px', minHeight: '850px' }}
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Show/Hide Columns</h3>
                  
                  <div className="grid grid-cols-3 gap-8">
                    {/* Stripe Captured Events Column */}
                    <div style={{ width: '280px' }}>
                      <h4 className="text-base font-medium text-blue-600 mb-4">Stripe Captured Events</h4>
                      <div className="space-y-2">
                        {stripeColumns.map((column) => (
                          <label key={column} className="flex items-center space-x-3 cursor-pointer">
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

                    {/* Physical Mail Orders Column */}
                    <div style={{ width: '280px' }}>
                      <h4 className="text-base font-medium text-purple-600 mb-4">Physical Mail Orders</h4>
                      <div className="space-y-2">
                        {physicalMailColumns.map((column) => {
                          const prefixedColumn = `pmo_${column}`;
                          return (
                            <label key={prefixedColumn} className="flex items-center space-x-3 cursor-pointer">
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

                    {/* Model Runs Column */}
                    <div style={{ width: '280px' }}>
                      <h4 className="text-base font-medium text-green-600 mb-4">Model Runs</h4>
                      <div className="space-y-2">
                        {modelRunsColumns.map((column) => {
                          const prefixedColumn = `mr_${column}`;
                          return (
                            <label key={prefixedColumn} className="flex items-center space-x-3 cursor-pointer">
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
                      <th className="text-left p-3 font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: '80px', fontSize: '12px' }}>#</th>
                      {visibleColumns.map((column, index) => (
                        <th 
                          key={column} 
                          className={`text-left p-3 font-medium whitespace-nowrap overflow-hidden text-ellipsis ${getColumnHeaderColor(column)}`}
                          style={{ 
                            width: index === visibleColumns.length - 1 ? 'auto' : '80px',
                            fontSize: '12px'
                          }}
                        >
                          {formatColumnHeader(column)}
                        </th>
                      ))}
                      <th className="text-left p-3 font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: '80px', fontSize: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event, index) => (
                      <tr key={event.id} className="border-b hover:bg-gray-50">
                        <td className="p-3" style={{ width: '80px' }}>
                          <div className="text-sm text-gray-600">{((currentPage - 1) * eventsPerPage) + index + 1}</div>
                        </td>
                        {visibleColumns.map((column, colIndex) => (
                          <td 
                            key={column} 
                            className="p-3" 
                            style={{ 
                              width: colIndex === visibleColumns.length - 1 ? 'auto' : '80px' 
                            }}
                          >
                            {renderCellContent(event, column)}
                          </td>
                        ))}
                        <td className="p-3" style={{ width: '80px' }}>
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
