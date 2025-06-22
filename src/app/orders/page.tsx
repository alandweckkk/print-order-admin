"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PopoverCutoffText } from "@/components/ui/popover-cutoff-text";
import { TableImagePopover } from "@/components/TableImagePopover";
import { EditableField } from "@/components/ui/editable-field";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { fetchPhysicalStripeEvents, fetchStripeEventColumns, fetchPhysicalMailOrderColumns, fetchModelRunsColumns, CombinedOrderEvent } from './actions/pull-orders-from-supabase';
import { getCurrentAdminDefaults, saveCurrentAdminDefaults, ColumnConfig } from './actions/admin-profiles';
import { createBatch } from './actions/create-batch';
import { updateOrderStatus } from './actions/update-order-status';
import { updateOrderVisibility } from './actions/update-order-visibility';
import { updateOrderNotes } from './actions/update-order-notes';
import { updateBatchId } from './actions/update-batch-id';
import { updatePhysicalMailOrder } from './actions/update-physical-mail-order';
import { updateModelRun } from './actions/update-model-run';
import { updateStripeEvent } from './actions/update-stripe-event';

export default function OrdersPage() {
  const [events, setEvents] = useState<CombinedOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [stripeColumns, setStripeColumns] = useState<string[]>([]);
  const [physicalMailColumns, setPhysicalMailColumns] = useState<string[]>([]);
  const [modelRunsColumns, setModelRunsColumns] = useState<string[]>([]);
  const [batchColumns] = useState<string[]>([]);

  const [visibleColumns, setVisibleColumns] = useState<ColumnConfig[]>([]);
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [currentAdminName, setCurrentAdminName] = useState<string>('Joey');
  const popoverRef = useRef<HTMLDivElement>(null);
  const eventsPerPage = 50;


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

  // Add drag and drop state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Add simple header click width editing
  const [showWidthPopover, setShowWidthPopover] = useState<string | null>(null);
  const [headerTempWidth, setHeaderTempWidth] = useState<string>('');

  // Add batch status editing state  
  const [editingStatus, setEditingStatus] = useState<number | null>(null); // Track which row status is being edited

  // Add notes state for each row
  const [rowNotes, setRowNotes] = useState<Record<number, string>>({});

  // Add inline editing state for modal fields
  const [editingField, setEditingField] = useState<{
    fieldName: string;
    tempValue: string;
    originalValue: string;
    // Field-specific IDs for different tables
    stripePaymentId?: string;  // For z_print_order_management
    paymentIntentId?: string;  // For physical_mail_orders  
    modelRunId?: string;       // For model_runs
    stripeEventId?: number;    // For stripe_captured_events
  } | null>(null);
  
  const [isSavingField, setIsSavingField] = useState(false);

  // Add toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Add view details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<CombinedOrderEvent | null>(null);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(-1);

  // Status options matching the database values
  const statusOptions = [
    { value: 'No Status', label: 'No Status' },
    { value: 'Approved Batchable', label: 'Approved Batchable' },
    { value: 'Contact User', label: 'Contact User' },
    { value: 'Alan Review', label: 'Alan Review' },
    { value: 'Question', label: 'Question' },
    { value: 'Hide', label: 'Hide' }
  ];

  // Batch management functions
  // const getBatches = (): Batch[] => {
  //   if (typeof window === 'undefined') return [];
  //   const stored = localStorage.getItem('print_order_batches');
  //   return stored ? JSON.parse(stored) : [];
  // };

  // const saveBatches = (batches: Batch[]) => {
  //   if (typeof window === 'undefined') return;
  //   localStorage.setItem('print_order_batches', JSON.stringify(batches));
  // };

  const handleCreateBatch = async () => {
    if (!batchName.trim()) return;
    
    setIsCreatingBatch(true);
    
    try {
      // Get only the specific fields needed for batch from selected items
      const selectedOrderData = events
        .filter(event => selectedItems.has(event.id))
        .map(event => ({
          id: event.id,
          stripe_payment_id: event.stripe_payment_id,
          original_output_image_url: event.mr_original_output_image_url,
          order_number: event.pmo_order_number,
          shipping_address: event.pmo_shipping_address
        }));
      
      // Create batch by updating database records
      const result = await createBatch(selectedOrderData, batchName.trim());
      
      if (result.success && result.updatedCount) {
        console.log(`Successfully updated ${result.updatedCount} orders with batch_id: ${batchName}`);
        
        // Reset state
        setSelectedItems(new Set());
        setBatchName('');
        setShowBatchModal(false);
        
        // Show success message
        setToastMessage(`Batch "${batchName}" created with ${result.updatedCount} orders!`);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        console.error('Failed to create batch:', result.error);
        setToastMessage(result.error || 'Failed to create batch');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      setToastMessage('Error creating batch');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const handleCreateBatchClick = () => {
    if (selectedItems.size < 2) return; // Require at least 2 items
    
    // Auto-fill with current EST date and time
    const now = new Date();
    const estTime = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2})/, 'Batch_$3-$1-$2_$4-$5');
    
    setBatchName(estTime);
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



  // Calculate total pages
  const totalPages = Math.ceil(totalEvents / eventsPerPage);

  // Helper function to get default column width based on column type
  const getDefaultColumnWidth = (columnName: string): number => {
    // ID columns - narrow
    if (columnName === 'id' || columnName.endsWith('_id')) {
      return 80;
    }
    
    // Image URL columns - wider for better visibility
    if (columnName.includes('image_url')) {
      return 120;
    }
    
    // Status columns - medium width
    if (columnName.includes('status')) {
      return 100;
    }
    
    // Address/shipping columns - wider for readability
    if (columnName.includes('address') || columnName.includes('shipping')) {
      return 200;
    }
    
    // Email columns - wider
    if (columnName.includes('email')) {
      return 180;
    }
    
    // Timestamp columns - wider for date/time display
    if (columnName.includes('timestamp') || columnName.includes('_at')) {
      return 140;
    }
    
    // Metadata/payload columns - wider for JSON content
    if (columnName.includes('metadata') || columnName.includes('payload')) {
      return 150;
    }
    
    // Order number columns
    if (columnName.includes('order_number')) {
      return 120;
    }
    
    // Batch management columns - wider for readability
    if (columnName.startsWith('batch_')) {
      return 120;
    }
    
    // Order notes column - wider for notes input
    if (columnName === 'order_notes') {
      return 200;
    }
    
    // Default width for other columns
    return 100;
  };

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
        
        // Helper function to convert old string array to new ColumnConfig array
        const convertToColumnConfigs = (columns: string[] | ColumnConfig[]): ColumnConfig[] => {
          if (columns.length === 0) return [];
          
          // Check if it's already in new format
          if (typeof columns[0] === 'object' && 'name' in columns[0]) {
            return columns as ColumnConfig[];
          }
          
          // Convert old string array to new format with default widths
          return (columns as string[]).map(columnName => ({
            name: columnName,
            width: getDefaultColumnWidth(columnName)
          }));
        };

        // Use Joey's saved defaults or fallback to hardcoded defaults
        let defaultColumnConfigs: ColumnConfig[];
        if (adminDefaults.success && adminDefaults.data.default_column_arrays.length > 0) {
          defaultColumnConfigs = convertToColumnConfigs(adminDefaults.data.default_column_arrays);
          setCurrentAdminName(adminDefaults.data.admin_name);
          console.log(`✅ Loaded column defaults for ${adminDefaults.data.admin_name}:`, defaultColumnConfigs);
        } else {
          // Fallback to hardcoded defaults if no admin defaults found
          const fallbackColumns = [
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
            'mr_input_image_url',
            // Batch management columns (now persistent)
            'batch_status',
            'order_notes'
          ];
          defaultColumnConfigs = convertToColumnConfigs(fallbackColumns);
          console.log('⚠️ No admin defaults found, using fallback columns:', defaultColumnConfigs);
        }
        
        // Remove the unwanted batch columns that were deleted and now-hardcoded columns
        const unwantedBatchColumns = ['batch_address_approved', 'batch_artwork_approved', 'batch_no_red_flags', 'batch_has_other_orders', 'batch_notes', 'batch_id', 'batch_status', 'order_notes'];
        const cleanedColumnConfigs = defaultColumnConfigs.filter(col => !unwantedBatchColumns.includes(col.name));
        
        // Additional immediate cleanup of hardcoded columns
        const finalCleanedConfigs = cleanedColumnConfigs.filter(col => 
          !['batch_status', 'order_notes', 'batch_id'].includes(col.name)
        );
        
        setVisibleColumns(finalCleanedConfigs);
        
        // If we removed any columns, save the cleaned up defaults
        if (cleanedColumnConfigs.length !== defaultColumnConfigs.length) {
          console.log('🧹 Cleaning up removed batch columns from admin defaults');
          saveCurrentAdminDefaults(
            cleanedColumnConfigs,
            `Cleaned up removed batch columns at ${new Date().toLocaleString()}`
          );
        }
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
          'mr_input_image_url',
          'batch_status',
          'order_notes'
        ];
        const fallbackColumnConfigs = fallbackColumns.map(columnName => ({
          name: columnName,
          width: getDefaultColumnWidth(columnName)
        }));
        setVisibleColumns(fallbackColumnConfigs);
      }
    };

    loadData();
  }, []);

  // Clean up any unwanted batch columns from visible columns
  useEffect(() => {
    const unwantedBatchColumns = ['batch_address_approved', 'batch_artwork_approved', 'batch_no_red_flags', 'batch_has_other_orders', 'batch_notes', 'batch_id', 'batch_status', 'order_notes'];
    
          setVisibleColumns(prev => {
        // More aggressive cleanup - remove all hardcoded columns
        const filtered = prev.filter(col => 
          !unwantedBatchColumns.includes(col.name) && 
          !['batch_status', 'order_notes', 'batch_id'].includes(col.name)
        );
        
        // If we filtered out columns, log it and save immediately
        if (filtered.length !== prev.length) {
          console.log('🧹 Aggressively removed unwanted batch columns from visible columns');
          console.log('Removed:', prev.filter(col => !filtered.includes(col)).map(col => col.name));
          
          // Auto-save the cleaned up state immediately
          setTimeout(() => {
            saveCurrentAdminDefaults(
              filtered,
              `Aggressively cleaned hardcoded columns at ${new Date().toLocaleString()}`
            );
          }, 500);
        }
        
        return filtered;
      });
  }, []);

  // Separate effect for loading page data
  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      try {
        const { events: stripeEvents, total } = await fetchPhysicalStripeEvents(currentPage, eventsPerPage);
        setEvents(stripeEvents);
        setTotalEvents(total);
        
        // Initialize rowNotes with order_notes from database
        const initialNotes: Record<number, string> = {};
        stripeEvents.forEach(event => {
          if (event.order_notes) {
            initialNotes[event.id] = event.order_notes;
          }
        });
        setRowNotes(initialNotes);
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
      
      // Cancel status editing when clicking outside
      if (editingStatus !== null) {
        const target = event.target as HTMLElement;
        const isStatusField = target.closest('[data-status-field]') || target.closest('[role="combobox"]') || target.closest('[role="listbox"]');
        if (!isStatusField) {
          setEditingStatus(null);
        }
      }

      // Cancel width popover when clicking outside
      if (showWidthPopover !== null) {
        const target = event.target as HTMLElement;
        const isWidthPopover = target.closest('[data-width-popover]');
        if (!isWidthPopover) {
          setShowWidthPopover(null);
        }
      }

      // Cancel inline editing when clicking outside modal
      if (editingField !== null && !showDetailsModal) {
        setEditingField(null);
        setIsSavingField(false);
      }
    };

    if (showColumnPopover || editingStatus !== null || showWidthPopover !== null || editingField !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnPopover, editingStatus, showWidthPopover, editingField, showDetailsModal]);

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
    // Prevent hardcoded columns from being added back
    if (['batch_status', 'order_notes', 'batch_id'].includes(columnName)) {
      return;
    }
    
    setVisibleColumns(prev => {
      const existingIndex = prev.findIndex(col => col.name === columnName);
      if (existingIndex !== -1) {
        return prev.filter(col => col.name !== columnName);
      } else {
        return [...prev, { name: columnName, width: getDefaultColumnWidth(columnName) }];
      }
    });
  };

  const saveAsDefaults = async () => {
    setIsSavingDefaults(true);
    try {
      const result = await saveCurrentAdminDefaults(
        visibleColumns, // Now saving ColumnConfig[] array with names and widths
        `Column defaults updated at ${new Date().toLocaleString()}`
      );
      
      if (result.success) {
        console.log(`✅ Saved column defaults for ${currentAdminName}:`, visibleColumns);
        setToastMessage('Saved');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } else {
        console.error('Failed to save column defaults:', result.error);
        setToastMessage('Save failed');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (error) {
      console.error('Error saving column defaults:', error);
      setToastMessage('Save error');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const formatColumnHeader = (columnName: string) => {
    // Remove pmo_, mr_, or batch_ prefix for display
    let displayName = columnName;
    if (columnName.startsWith('pmo_')) {
      displayName = columnName.substring(4);
    } else if (columnName.startsWith('mr_')) {
      displayName = columnName.substring(3);
    } else if (columnName.startsWith('batch_')) {
      displayName = columnName.substring(6);
    }
    
    // Special handling for order_notes
    if (columnName === 'order_notes') {
      displayName = 'notes';
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
    } else if (columnName.startsWith('batch_') || columnName === 'order_notes') {
      return 'text-orange-600'; // Orange for batch management
    }
    return 'text-blue-600'; // Blue for stripe captured events
  };

  // Drag and drop handlers for column reordering
  const handleDragStart = (e: React.DragEvent, columnName: string) => {
    setDraggedColumn(columnName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', columnName);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnName);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnName: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedColumn || draggedColumn === targetColumnName) {
      setDraggedColumn(null);
      return;
    }

    // Create new column order
    const newVisibleColumns = [...visibleColumns];
    const draggedIndex = newVisibleColumns.findIndex(col => col.name === draggedColumn);
    const targetIndex = newVisibleColumns.findIndex(col => col.name === targetColumnName);
    
    // Remove dragged column from its current position
    const [draggedCol] = newVisibleColumns.splice(draggedIndex, 1);
    
    // Insert it at the new position
    newVisibleColumns.splice(targetIndex, 0, draggedCol);
    
    // Update local state immediately
    setVisibleColumns(newVisibleColumns);
    setDraggedColumn(null);
    
    // Save to Supabase in the background (no need to wait or read back)
    try {
      await saveCurrentAdminDefaults(
        newVisibleColumns,
        `Column order updated at ${new Date().toLocaleString()}`
      );
      console.log('✅ Column order saved to Supabase:', newVisibleColumns);
    } catch (error) {
      console.error('❌ Failed to save column order:', error);
      // Could show a toast notification here if desired
    }
  };



  // Simple header click width editing handlers
  const handleHeaderWidthClick = (columnName: string) => {
    const currentColumn = visibleColumns.find(col => col.name === columnName);
    if (currentColumn) {
      setHeaderTempWidth(currentColumn.width.toString());
      setShowWidthPopover(columnName);
    }
  };

  const handleHeaderWidthSave = async () => {
    if (!showWidthPopover) return;
    
    const newWidth = parseInt(headerTempWidth);
    if (isNaN(newWidth) || newWidth < 50) {
      setShowWidthPopover(null);
      setHeaderTempWidth('');
      return;
    }

    // Update the column width
    const newVisibleColumns = visibleColumns.map(col => 
      col.name === showWidthPopover 
        ? { ...col, width: newWidth }
        : col
    );
    
    setVisibleColumns(newVisibleColumns);
    setShowWidthPopover(null);
    setHeaderTempWidth('');
    
    // Save to Supabase in the background
    try {
      await saveCurrentAdminDefaults(
        newVisibleColumns,
        `Column widths updated at ${new Date().toLocaleString()}`
      );
      console.log('✅ Column widths saved to Supabase:', newVisibleColumns);
    } catch (error) {
      console.error('❌ Failed to save column widths:', error);
    }
  };

  const handleHeaderWidthCancel = () => {
    setShowWidthPopover(null);
    setHeaderTempWidth('');
  };

  // View details modal handlers
  const handleViewDetails = (event: CombinedOrderEvent, index: number) => {
    setSelectedEventDetails(event);
    setSelectedEventIndex(index);
    setShowDetailsModal(true);
  };

  const navigateToNextRecord = () => {
    if (selectedEventIndex < filteredData.length - 1) {
      const newIndex = selectedEventIndex + 1;
      // Use events state to get the most up-to-date data (including any edits)
      const updatedEvent = events.find(e => e.id === filteredData[newIndex].id) || filteredData[newIndex];
      setSelectedEventDetails(updatedEvent);
      setSelectedEventIndex(newIndex);
    }
  };

  const navigateToPreviousRecord = () => {
    if (selectedEventIndex > 0) {
      const newIndex = selectedEventIndex - 1;
      // Use events state to get the most up-to-date data (including any edits)
      const updatedEvent = events.find(e => e.id === filteredData[newIndex].id) || filteredData[newIndex];
      setSelectedEventDetails(updatedEvent);
      setSelectedEventIndex(newIndex);
    }
  };

  // Handle inline field editing
  const handleStartEditing = (
    fieldName: string, 
    currentValue: string,
    additionalIds: {
      stripePaymentId?: string;
      paymentIntentId?: string; 
      modelRunId?: string;
      stripeEventId?: number;
    } = {}
  ) => {
    console.log('✏️ Starting inline edit:', { fieldName, currentValue, additionalIds });
    setEditingField({
      fieldName,
      tempValue: currentValue,
      originalValue: currentValue,
      ...additionalIds
    });
  };

  const handleCancelEditing = () => {
    console.log('❌ Canceling inline edit');
    setEditingField(null);
    setIsSavingField(false);
  };

  const handleSaveInlineEdit = async () => {
    if (!editingField || !selectedEventDetails) return;
    
    setIsSavingField(true);
    console.log('💾 Saving inline edit:', editingField);
    
    try {
      const success = await handleSaveField(
        selectedEventDetails.id,
        editingField.fieldName,
        editingField.tempValue,
        {
          stripePaymentId: editingField.stripePaymentId,
          paymentIntentId: editingField.paymentIntentId,
          modelRunId: editingField.modelRunId,
          stripeEventId: editingField.stripeEventId
        }
      );
      
      if (success) {
        // Update the selected event details to reflect the change
        setSelectedEventDetails(prev => prev ? {
          ...prev,
          [editingField.fieldName]: editingField.tempValue
        } : null);
        setEditingField(null);
      }
    } catch (error) {
      console.error('❌ Error saving inline edit:', error);
    } finally {
      setIsSavingField(false);
    }
  };

  const handleTempValueChange = (newValue: string) => {
    if (editingField) {
      setEditingField({
        ...editingField,
        tempValue: newValue
      });
    }
  };

  const handleSaveField = async (
    eventId: number, 
    fieldName: string, 
    newValue: string,
    fieldIds: {
      stripePaymentId?: string;
      paymentIntentId?: string; 
      modelRunId?: string;
      stripeEventId?: number;
    }
  ): Promise<boolean> => {
    console.log('💾 handleSaveField called:', { eventId, fieldName, newValue, fieldIds });
    
    try {
      let result;
      
      // Route to appropriate server action based on field name
      switch (fieldName) {
        case 'batch_id':
        case 'batch_status':
        case 'order_notes':
          if (!fieldIds.stripePaymentId) {
            console.error('❌ Missing stripePaymentId for batch management field');
            return false;
          }
          if (fieldName === 'batch_id') {
            result = await updateBatchId(fieldIds.stripePaymentId, newValue);
          } else if (fieldName === 'batch_status') {
            result = await updateOrderStatus(fieldIds.stripePaymentId, newValue);
          } else {
            result = await updateOrderNotes(fieldIds.stripePaymentId, newValue);
          }
          break;
          
        case 'pmo_order_number':
        case 'pmo_shipping_address':
        case 'pmo_email':
          if (!fieldIds.paymentIntentId) {
            console.error('❌ Missing paymentIntentId for physical mail order field');
            return false;
          }
          const pmoFieldName = fieldName.replace('pmo_', '') as 'order_number' | 'shipping_address' | 'email';
          result = await updatePhysicalMailOrder(fieldIds.paymentIntentId, pmoFieldName, newValue);
          break;
          
        case 'mr_original_output_image_url':
          if (!fieldIds.modelRunId) {
            console.error('❌ Missing modelRunId for model run field');
            return false;
          }
          result = await updateModelRun(fieldIds.modelRunId, 'original_output_image_url', newValue);
          break;
          
        case 'created_timestamp_est':
          if (!fieldIds.stripeEventId) {
            console.error('❌ Missing stripeEventId for stripe event field');
            return false;
          }
          result = await updateStripeEvent(fieldIds.stripeEventId, 'created_timestamp_est', newValue);
          break;
          
        default:
          console.error('❌ Unknown field name:', fieldName);
          return false;
      }
      
      console.log(`🔄 Update ${fieldName} result:`, result);
      
      if (result.success) {
        // Update the local state to reflect the change
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === eventId 
              ? { ...event, [fieldName]: newValue }
              : event
          )
        );
        console.log(`✅ Successfully updated ${fieldName} locally`);
        return true;
      } else {
        console.error(`❌ Failed to update ${fieldName}:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error updating ${fieldName}:`, error);
      return false;
    }
  };



  // Management status editing handlers
  const handleStatusChange = async (eventId: number, newStatus: string) => {
    console.log(`Changing status for event ${eventId} to:`, newStatus);
    
    // Find the event to get the stripe payment ID
    const event = events.find(e => e.id === eventId);
    if (!event) {
      console.error('Event not found');
      return;
    }

    // Extract the stripe payment ID - this could be from different sources
    const payload = event.payload as { data?: { object?: { id?: string } }; payment_intent_id?: string };
    const stripePaymentId = payload?.data?.object?.id || 
                           payload?.payment_intent_id ||
                           event.transaction_id;

    if (!stripePaymentId) {
      console.error('No stripe payment ID found for event');
      return;
    }

    try {
      // Update in database
      const result = await updateOrderStatus(stripePaymentId, newStatus);
      
      if (result.success) {
        // Update local state on success
        setEvents(prev => prev.map(e => 
          e.id === eventId 
            ? { ...e, batch_status: newStatus }
            : e
        ));
        
        setToastMessage(`Status updated to "${newStatus}"`);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } else {
        console.error('Failed to update status:', result.error);
        setToastMessage(`Failed to update status: ${result.error}`);
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setToastMessage('Error updating status');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
    
    setEditingStatus(null);
  };

  // Delete/hide order handler
  const handleDeleteOrder = async (eventId: number) => {
    console.log(`Hiding order with event ID: ${eventId}`);
    
    // Find the event to get the stripe payment ID
    const event = events.find(e => e.id === eventId);
    if (!event) {
      console.error('Event not found');
      return;
    }

    // Extract the stripe payment ID
    const payload = event.payload as { data?: { object?: { id?: string } }; payment_intent_id?: string };
    const stripePaymentId = payload?.data?.object?.id || 
                           payload?.payment_intent_id ||
                           event.transaction_id;

    if (!stripePaymentId) {
      console.error('No stripe payment ID found for event');
      return;
    }

    try {
      // Update visibility in database
      const result = await updateOrderVisibility(stripePaymentId, false);
      
      if (result.success) {
        // Remove from local state (since it's now hidden)
        setEvents(prev => prev.filter(e => e.id !== eventId));
        
        // Update total count
        setTotalEvents(prev => prev - 1);
        
        setToastMessage('Order hidden successfully');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } else {
        console.error('Failed to hide order:', result.error);
        setToastMessage(`Failed to hide order: ${result.error}`);
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (error) {
      console.error('Error hiding order:', error);
      setToastMessage('Error hiding order');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
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
      return <PopoverCutoffText text={textValue} className="font-mono" />;
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
        return <PopoverCutoffText text={duration} className="whitespace-nowrap" />;
      case 'mr_credits_used':
        const credits = value ? String(value) : '-';
        return <PopoverCutoffText text={credits} className="whitespace-nowrap" />;
      case 'payment_source':
        return (
          <Badge className={getPaymentSourceColor(value as string)}>
            <PopoverCutoffText text={String(value || '-')} />
          </Badge>
        );
      case 'pack_type':
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <PopoverCutoffText text={String(value || '-')} />
          </Badge>
        );
      case 'pmo_status':
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <PopoverCutoffText text={String(value || '-')} />
          </Badge>
        );
      case 'mr_status':
        return (
          <Badge className="bg-green-100 text-green-800">
            <PopoverCutoffText text={String(value || '-')} />
          </Badge>
        );

      case 'pmo_shipping_address':
        // Shipping address - show full text without truncation
        if (value) {
          const addressText = String(value);
          return <div className="text-xs">{addressText}</div>;
        }
        return <span className="text-gray-400">-</span>;
      case 'payload':
      case 'pmo_items':
      case 'pmo_metadata':
      case 'mr_input_data':
      case 'mr_output_data':
      case 'mr_metadata':
      case 'mr_output_images':
        const payloadStr = value ? JSON.stringify(value) : '-';
        return <PopoverCutoffText text={payloadStr} className="font-mono whitespace-nowrap" />;
      case 'created_timestamp':
        if (!value) return <PopoverCutoffText text="-" className="whitespace-nowrap" />;
        const timestamp = typeof value === 'number' ? value * 1000 : new Date(value as string).getTime();
        const formattedTimestamp = new Date(timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return <PopoverCutoffText text={formattedTimestamp} className="whitespace-nowrap" />;
      case 'created_timestamp_est':
        // Remove year from created_timestamp_est display
        if (!value) return <PopoverCutoffText text="-" className="whitespace-nowrap" />;
        const estDate = new Date(value as string);
        const estFormatted = estDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return <PopoverCutoffText text={estFormatted} className="whitespace-nowrap" />;
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
        return <PopoverCutoffText text={idText} className="font-mono whitespace-nowrap" />;
      case 'id':
        const idValue = value ? String(value) : '-';
        return <PopoverCutoffText text={idValue} className="font-mono whitespace-nowrap" />;
      default:
        const defaultText = value ? String(value) : '-';
        return <PopoverCutoffText text={defaultText} className="whitespace-nowrap" />;
    }
  };

  return (
    <div className="p-8">
      <style>{`
        .orders-table td {
          font-size: 12px;
        }
      `}</style>
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
                  style={{ width: '1200px', minHeight: '900px' }}
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
                                ...prev.filter(col => !stripeColumns.includes(col.name)),
                                ...stripeColumns.map(columnName => ({
                                  name: columnName,
                                  width: getDefaultColumnWidth(columnName)
                                }))
                              ]);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            All
                          </button>
                          <span className="text-xs text-gray-400">|</span>
                          <button
                            onClick={() => {
                              setVisibleColumns(prev => prev.filter(col => !stripeColumns.includes(col.name)));
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
                                checked={visibleColumns.some(col => col.name === column)}
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
                                ...prev.filter(col => !pmoColumns.includes(col.name)),
                                ...pmoColumns.map(columnName => ({
                                  name: columnName,
                                  width: getDefaultColumnWidth(columnName)
                                }))
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
                              setVisibleColumns(prev => prev.filter(col => !pmoColumns.includes(col.name)));
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
                                  checked={visibleColumns.some(col => col.name === prefixedColumn)}
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
                                ...prev.filter(col => !mrColumns.includes(col.name)),
                                ...mrColumns.map(columnName => ({
                                  name: columnName,
                                  width: getDefaultColumnWidth(columnName)
                                }))
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
                              setVisibleColumns(prev => prev.filter(col => !mrColumns.includes(col.name)));
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
                                  checked={visibleColumns.some(col => col.name === prefixedColumn)}
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

                      {/* Batch Management Column */}
                      <div style={{ width: '245px' }} className="flex-shrink-0 pl-6">
                        <h4 className="text-base font-medium text-orange-600 mb-2">Batch Management</h4>
                        <div className="flex gap-1 mb-4">
                          <button
                            onClick={() => {
                              const batchColumnsWithPrefix = batchColumns.map(col => col === 'status' ? 'batch_status' : col);
                              setVisibleColumns(prev => [
                                ...prev.filter(col => !batchColumnsWithPrefix.includes(col.name)),
                                ...batchColumnsWithPrefix.map(columnName => ({
                                  name: columnName,
                                  width: getDefaultColumnWidth(columnName)
                                }))
                              ]);
                            }}
                            className="text-xs text-orange-600 hover:text-orange-800 hover:underline"
                          >
                            All
                          </button>
                          <span className="text-xs text-gray-400">|</span>
                          <button
                            onClick={() => {
                              const batchColumnsWithPrefix = batchColumns.map(col => col === 'status' ? 'batch_status' : col);
                              setVisibleColumns(prev => prev.filter(col => !batchColumnsWithPrefix.includes(col.name)));
                            }}
                            className="text-xs text-orange-600 hover:text-orange-800 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="space-y-2">
                          {batchColumns.map((column) => {
                            const prefixedColumn = column === 'status' ? 'batch_status' : column;
                            return (
                              <label key={prefixedColumn} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.some(col => col.name === prefixedColumn)}
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
                </div>
              )}
              </div>

              {/* Add new dropdown between eye icon and Create Batch */}
              <Select value={filterDropdownValue} onValueChange={setFilterDropdownValue}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved Batchable">Approved Batchable</SelectItem>
                  <SelectItem value="Contact User">Contact User</SelectItem>
                  <SelectItem value="Alan Review">Alan Review</SelectItem>
                  <SelectItem value="Question">Question</SelectItem>
                  <SelectItem value="Hide">Hide</SelectItem>
                </SelectContent>
              </Select>

              {/* Add search bar */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search all data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[250px] h-9 pl-8"
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
                <Button
                  onClick={saveAsDefaults}
                  disabled={isSavingDefaults}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center w-8 h-8 p-0"
                  title={`Save current column visibility and widths as default for ${currentAdminName}`}
                >
                  {isSavingDefaults ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
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
                <table className="w-full border-collapse orders-table">
                  <thead>
                    <tr className="border-b">
                      <th className="w-12 p-3 text-left">
                        <input
                          type="checkbox"
                          checked={false}
                          readOnly
                          className="rounded border-gray-300 cursor-default"
                        />
                      </th>
                      <th className="text-center p-0.5 font-normal text-gray-300 whitespace-nowrap" style={{ width: '15px', fontSize: '8px' }}>#</th>
                      {visibleColumns.map((columnConfig, index) => (
                        <th 
                          key={columnConfig.name} 
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, columnConfig.name)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, columnConfig.name)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, columnConfig.name)}
                          className={`text-left p-3 font-medium whitespace-nowrap cursor-move select-none transition-all duration-200 ${getColumnHeaderColor(columnConfig.name)} ${
                            dragOverColumn === columnConfig.name ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                          } ${
                            draggedColumn === columnConfig.name ? 'opacity-50' : ''
                          }`}
                          style={{ 
                            width: index === visibleColumns.length - 1 ? 'auto' : `${columnConfig.width}px`,
                            fontSize: '10px'
                          }}
                          title={`Drag to reorder: ${formatColumnHeader(columnConfig.name)}`}
                        >
                          <div className="flex items-center gap-2">
                            <svg 
                              className="w-3 h-3 text-gray-400 opacity-60" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M4 6h16M4 12h16M4 18h16" 
                              />
                            </svg>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleHeaderWidthClick(columnConfig.name);
                                }}
                                className="hover:bg-gray-100 px-1 py-0.5 rounded text-left"
                                title={`Click to adjust width (${columnConfig.width}px)`}
                              >
                                <PopoverCutoffText 
                                  text={formatColumnHeader(columnConfig.name)} 
                                  className="whitespace-nowrap"
                                />
                              </button>
                              
                              {/* Width adjustment popover */}
                              {showWidthPopover === columnConfig.name && (
                                <div 
                                  data-width-popover
                                  className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-3 min-w-[200px]"
                                >
                                  <div className="text-xs font-medium text-gray-700 mb-2">
                                    Adjust Width: {formatColumnHeader(columnConfig.name)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={headerTempWidth}
                                      onChange={(e) => setHeaderTempWidth(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleHeaderWidthSave();
                                        if (e.key === 'Escape') handleHeaderWidthCancel();
                                      }}
                                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      min="50"
                                      placeholder="Width"
                                      autoFocus
                                    />
                                    <span className="text-xs text-gray-500">px</span>
                                  </div>
                                  <div className="flex gap-1 mt-2">
                                    <button
                                      onClick={handleHeaderWidthSave}
                                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleHeaderWidthCancel}
                                      className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="text-left p-3 font-medium text-orange-600 whitespace-nowrap" style={{ width: '200px', fontSize: '10px' }}>Status</th>
                      <th className="text-left p-3 font-medium text-orange-600 whitespace-nowrap" style={{ width: '200px', fontSize: '10px' }}>Notes</th>
                      <th className="text-left p-3 font-medium text-orange-600 whitespace-nowrap" style={{ width: '200px', fontSize: '10px' }}>Batch Id</th>
                      <th className="text-center p-3 font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: '60px', fontSize: '8px' }}>Actions</th>
                      <th className="text-center p-3 font-medium text-xs whitespace-nowrap text-red-600" style={{ width: '60px', fontSize: '8px' }}>Delete</th>
                      <th className="text-center p-3 font-medium text-xs whitespace-nowrap" style={{ width: '60px', fontSize: '8px' }}>Send</th>
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
                          <div className="text-gray-300" style={{ fontSize: '8px' }}>{((currentPage - 1) * eventsPerPage) + index + 1}</div>
                        </td>
                        {visibleColumns.map((columnConfig, colIndex) => (
                          <td 
                            key={columnConfig.name} 
                            className="p-3 align-middle" 
                            style={{ 
                              width: colIndex === visibleColumns.length - 1 ? 'auto' : `${columnConfig.width}px`
                            }}
                          >
                            {renderCellContent(event, columnConfig.name)}
                          </td>
                        ))}
                        <td className="p-3 align-middle" style={{ width: '200px' }}>
                          <div data-status-field>
                            <Select
                              value={event.batch_status ? String(event.batch_status) : 'No Status'}
                              onValueChange={(newStatus) => handleStatusChange(event.id, newStatus)}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue>
                                                 <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                   (event.batch_status === 'Approved Batchable') ? 'bg-green-500' :
                                   (event.batch_status === 'Contact User') ? 'bg-blue-500' :
                                   (event.batch_status === 'Alan Review') ? 'bg-yellow-500' :
                                   (event.batch_status === 'Question') ? 'bg-purple-500' :
                                   (event.batch_status === 'Hide') ? 'bg-red-500' :
                                   'bg-gray-300'
                                 }`}></span>
                                {statusOptions.find(opt => opt.value === (event.batch_status || 'No Status'))?.label || 'No Status'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center">
                                                         <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                       option.value === 'Approved Batchable' ? 'bg-green-500' :
                                       option.value === 'Contact User' ? 'bg-blue-500' :
                                       option.value === 'Alan Review' ? 'bg-yellow-500' :
                                       option.value === 'Question' ? 'bg-purple-500' :
                                       option.value === 'Hide' ? 'bg-red-500' :
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
                        </td>
                        <td className="p-3 align-middle" style={{ width: '200px' }}>
                          <input
                            type="text"
                            value={rowNotes[event.id] || event.order_notes || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setRowNotes(prev => ({ ...prev, [event.id]: newValue }));
                              
                                             // Debounced save to database
                               const windowWithTimeouts = window as unknown as Window & { [key: string]: NodeJS.Timeout };
                               clearTimeout(windowWithTimeouts[`notesTimeout_${event.id}`]);
                               windowWithTimeouts[`notesTimeout_${event.id}`] = setTimeout(async () => {
                                 const payload = event.payload as { data?: { object?: { id?: string } }; payment_intent_id?: string };
                                 const stripePaymentId = payload?.data?.object?.id || 
                                                        payload?.payment_intent_id ||
                                                        event.transaction_id;
                                
                                if (stripePaymentId) {
                                  try {
                                    const result = await updateOrderNotes(stripePaymentId, newValue);
                                    if (!result.success) {
                                      console.error('Failed to save notes:', result.error);
                                    }
                                  } catch (error) {
                                    console.error('Error saving notes:', error);
                                  }
                                }
                              }, 1000); // Save after 1 second of no typing
                            }}
                            placeholder="Write notes..."
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="p-3 align-middle" style={{ width: '200px' }}>
                          <div 
                            className="text-xs text-gray-600 font-mono cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                const textToCopy = event.batch_id || '';
                                await navigator.clipboard.writeText(textToCopy);
                                console.log('✅ Copied batch ID to clipboard:', textToCopy);
                              } catch (err) {
                                console.error('❌ Failed to copy batch ID:', err);
                              }
                            }}

                            title="Click to copy • Double-click to edit batch ID"
                          >
                            {event.batch_id || <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="text-center p-3 align-middle" style={{ width: '60px' }}>
                          <button
                            onClick={() => handleViewDetails(event, index)}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                            title="View details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                        <td className="text-center p-3 align-middle" style={{ width: '60px' }}>
                          <button
                            onClick={() => handleDeleteOrder(event.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Hide this order"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
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
                      handleCreateBatch();
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
                onClick={handleCreateBatch}
                disabled={!batchName.trim() || isCreatingBatch}
              >
                {isCreatingBatch ? 'Creating...' : 'Create Batch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <DialogTitle className="text-xl font-semibold">
                Order Details - ID: {selectedEventDetails?.id}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToPreviousRecord}
                  disabled={selectedEventIndex <= 0}
                  className="h-8 w-8 p-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <span className="text-sm text-gray-500 min-w-[80px] text-center">
                  {selectedEventIndex + 1} / {filteredData.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToNextRecord}
                  disabled={selectedEventIndex >= filteredData.length - 1}
                  className="h-8 w-8 p-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </DialogHeader>
            
            {selectedEventDetails && (
              <div className="space-y-6">
                {/* Editable Fields Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column - Order Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-purple-800 mb-4">Order Information</h3>
                    
                    {/* Order Number */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-purple-700 block mb-2">Order Number</label>
                      <div className="bg-white rounded px-3 py-2 border">
                        <EditableField
                          fieldName="pmo_order_number"
                          value={selectedEventDetails.pmo_order_number || ''}
                          isEditing={editingField?.fieldName === 'pmo_order_number'}
                          tempValue={editingField?.tempValue || ''}
                          onStartEdit={() => {
                            const paymentIntentId = selectedEventDetails.pmo_payment_intent_id ||
                                                    selectedEventDetails.stripe_payment_id;
                            if (!paymentIntentId) {
                              console.error('❌ No payment intent ID found');
                              return;
                            }
                            handleStartEditing('pmo_order_number', selectedEventDetails.pmo_order_number || '', { paymentIntentId });
                          }}
                          onCancelEdit={handleCancelEditing}
                          onSaveEdit={handleSaveInlineEdit}
                          onTempValueChange={handleTempValueChange}
                          isSaving={isSavingField}
                          placeholder="No order number"
                        />
                      </div>
                    </div>

                    {/* Created Time */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-purple-700 block mb-2">Created Time</label>
                      <div className="bg-white rounded px-3 py-2 border">
                        <EditableField
                          fieldName="created_timestamp_est"
                          value={selectedEventDetails.created_timestamp_est || ''}
                          isEditing={editingField?.fieldName === 'created_timestamp_est'}
                          tempValue={editingField?.tempValue || ''}
                          onStartEdit={() => {
                            handleStartEditing('created_timestamp_est', selectedEventDetails.created_timestamp_est || '', { stripeEventId: selectedEventDetails.id });
                          }}
                          onCancelEdit={handleCancelEditing}
                          onSaveEdit={handleSaveInlineEdit}
                          onTempValueChange={handleTempValueChange}
                          isSaving={isSavingField}
                          placeholder="No timestamp"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-purple-700 block mb-2">Email</label>
                      <div className="bg-white rounded px-3 py-2 border">
                        <EditableField
                          fieldName="pmo_email"
                          value={selectedEventDetails.pmo_email || ''}
                          isEditing={editingField?.fieldName === 'pmo_email'}
                          tempValue={editingField?.tempValue || ''}
                          onStartEdit={() => {
                            const paymentIntentId = selectedEventDetails.pmo_payment_intent_id ||
                                                    selectedEventDetails.stripe_payment_id;
                            if (!paymentIntentId) {
                              console.error('❌ No payment intent ID found');
                              return;
                            }
                            handleStartEditing('pmo_email', selectedEventDetails.pmo_email || '', { paymentIntentId });
                          }}
                          onCancelEdit={handleCancelEditing}
                          onSaveEdit={handleSaveInlineEdit}
                          onTempValueChange={handleTempValueChange}
                          isSaving={isSavingField}
                          placeholder="No email"
                        />
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-purple-700 block mb-2">Shipping Address</label>
                      <div className="bg-white rounded px-3 py-2 border">
                        <EditableField
                          fieldName="pmo_shipping_address"
                          value={selectedEventDetails.pmo_shipping_address || ''}
                          isEditing={editingField?.fieldName === 'pmo_shipping_address'}
                          tempValue={editingField?.tempValue || ''}
                          onStartEdit={() => {
                            const paymentIntentId = selectedEventDetails.pmo_payment_intent_id ||
                                                    selectedEventDetails.stripe_payment_id;
                            if (!paymentIntentId) {
                              console.error('❌ No payment intent ID found');
                              return;
                            }
                            handleStartEditing('pmo_shipping_address', selectedEventDetails.pmo_shipping_address || '', { paymentIntentId });
                          }}
                          onCancelEdit={handleCancelEditing}
                          onSaveEdit={handleSaveInlineEdit}
                          onTempValueChange={handleTempValueChange}
                          isSaving={isSavingField}
                          placeholder="No shipping address"
                          multiline={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Technical & Management */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-green-800 mb-4">Technical & Management</h3>
                    
                    {/* Original Output Image URL */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-green-700 block mb-2">Original Image URL</label>
                      <div className="bg-white rounded px-3 py-2 border">
                        <EditableField
                          fieldName="mr_original_output_image_url"
                          value={selectedEventDetails.mr_original_output_image_url || ''}
                          isEditing={editingField?.fieldName === 'mr_original_output_image_url'}
                          tempValue={editingField?.tempValue || ''}
                          onStartEdit={() => {
                            const modelRunId = selectedEventDetails.mr_id ||
                                             selectedEventDetails.model_run_id;
                            if (!modelRunId) {
                              console.error('❌ No model run ID found');
                              return;
                            }
                            handleStartEditing('mr_original_output_image_url', selectedEventDetails.mr_original_output_image_url || '', { modelRunId });
                          }}
                          onCancelEdit={handleCancelEditing}
                          onSaveEdit={handleSaveInlineEdit}
                          onTempValueChange={handleTempValueChange}
                          isSaving={isSavingField}
                          placeholder="No image URL"
                          displayClassName="font-mono text-xs break-all"
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="bg-orange-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-orange-700 block mb-2">Status</label>
                      <div className="bg-white rounded px-3 py-2 border">
                        <EditableField
                          fieldName="batch_status"
                          value={selectedEventDetails.batch_status || ''}
                          isEditing={editingField?.fieldName === 'batch_status'}
                          tempValue={editingField?.tempValue || ''}
                          onStartEdit={() => {
                            const payload = selectedEventDetails.payload as { data?: { object?: { id?: string } }; payment_intent_id?: string };
                            const stripePaymentId = selectedEventDetails.stripe_payment_id ||
                                                   payload?.data?.object?.id || 
                                                   payload?.payment_intent_id ||
                                                   selectedEventDetails.transaction_id;
                            if (!stripePaymentId) {
                              console.error('❌ No stripe payment ID found');
                              return;
                            }
                            handleStartEditing('batch_status', selectedEventDetails.batch_status || '', { stripePaymentId });
                          }}
                          onCancelEdit={handleCancelEditing}
                          onSaveEdit={handleSaveInlineEdit}
                          onTempValueChange={handleTempValueChange}
                          isSaving={isSavingField}
                          placeholder="No status"
                          displayClassName="flex items-center"
                          customDisplay={
                            selectedEventDetails.batch_status ? (
                              <div className="flex items-center">
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                  (selectedEventDetails.batch_status === 'Approved Batchable') ? 'bg-green-500' :
                                  (selectedEventDetails.batch_status === 'Contact User') ? 'bg-blue-500' :
                                  (selectedEventDetails.batch_status === 'Alan Review') ? 'bg-yellow-500' :
                                  (selectedEventDetails.batch_status === 'Question') ? 'bg-purple-500' :
                                  (selectedEventDetails.batch_status === 'Hide') ? 'bg-red-500' :
                                  'bg-gray-300'
                                }`}></span>
                                <span className="text-sm">{selectedEventDetails.batch_status}</span>
                              </div>
                            ) : null
                          }
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-orange-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-orange-700 block mb-2">Notes</label>
                      <div className="bg-white rounded px-3 py-2 border">
                        <EditableField
                          fieldName="order_notes"
                          value={selectedEventDetails.order_notes || ''}
                          isEditing={editingField?.fieldName === 'order_notes'}
                          tempValue={editingField?.tempValue || ''}
                          onStartEdit={() => {
                            const payload = selectedEventDetails.payload as { data?: { object?: { id?: string } }; payment_intent_id?: string };
                            const stripePaymentId = selectedEventDetails.stripe_payment_id ||
                                                   payload?.data?.object?.id || 
                                                   payload?.payment_intent_id ||
                                                   selectedEventDetails.transaction_id;
                            if (!stripePaymentId) {
                              console.error('❌ No stripe payment ID found');
                              return;
                            }
                            handleStartEditing('order_notes', selectedEventDetails.order_notes || '', { stripePaymentId });
                          }}
                          onCancelEdit={handleCancelEditing}
                          onSaveEdit={handleSaveInlineEdit}
                          onTempValueChange={handleTempValueChange}
                          isSaving={isSavingField}
                          placeholder="No notes"
                          multiline={true}
                        />
                      </div>
                    </div>

                    {/* Batch ID */}
                    <div className="bg-orange-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-orange-700 block mb-2">Batch ID</label>
                      <div className="bg-white rounded px-3 py-2 border">
                        <EditableField
                          fieldName="batch_id"
                          value={selectedEventDetails.batch_id || ''}
                          isEditing={editingField?.fieldName === 'batch_id'}
                          tempValue={editingField?.tempValue || ''}
                          onStartEdit={() => {
                            const payload = selectedEventDetails.payload as { data?: { object?: { id?: string } }; payment_intent_id?: string };
                            const stripePaymentId = selectedEventDetails.stripe_payment_id ||
                                                   payload?.data?.object?.id || 
                                                   payload?.payment_intent_id ||
                                                   selectedEventDetails.transaction_id;
                            if (!stripePaymentId) {
                              console.error('❌ No stripe payment ID found');
                              return;
                            }
                            handleStartEditing('batch_id', selectedEventDetails.batch_id || '', { stripePaymentId });
                          }}
                          onCancelEdit={handleCancelEditing}
                          onSaveEdit={handleSaveInlineEdit}
                          onTempValueChange={handleTempValueChange}
                          isSaving={isSavingField}
                          placeholder="No batch ID"
                          displayClassName="font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Section */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Original Output Image</h3>
                  <div className="flex justify-center">
                    {selectedEventDetails.mr_original_output_image_url ? (
                      <div className="text-center">
                        <img
                          src={selectedEventDetails.mr_original_output_image_url}
                          alt="Original Output"
                          className="rounded-lg border shadow-sm hover:shadow-md transition-shadow mx-auto"
                          style={{ maxWidth: '600px', maxHeight: '400px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <p>No original output image available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
    </div>
  );
}
