import { CombinedOrderEvent } from '@/app/orders/actions/pull-orders-from-supabase';

// ============================================================================
// SHIPPING ADDRESS TRANSFORMATIONS
// ============================================================================

export interface ShippingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  [key: string]: any; // For any additional fields
}

/**
 * Formats a shipping address object into a human-readable string
 */
export function formatShippingAddress(address: any): string {
  if (!address || typeof address !== 'object') {
    return '-';
  }

  const parts: string[] = [];
  
  // Name
  if (address.name) {
    parts.push(address.name);
  }

  // Address lines
  if (address.line1) {
    parts.push(address.line1);
  }
  if (address.line2) {
    parts.push(address.line2);
  }

  // City, State, Postal Code
  const cityStateZip: string[] = [];
  if (address.city) cityStateZip.push(address.city);
  if (address.state) cityStateZip.push(address.state);
  if (address.postal_code) cityStateZip.push(address.postal_code);
  
  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(', '));
  }

  // Country (if not US)
  if (address.country && address.country.toUpperCase() !== 'US' && address.country.toUpperCase() !== 'USA') {
    parts.push(address.country);
  }

  // Phone (optional)
  if (address.phone) {
    parts.push(`📞 ${address.phone}`);
  }

  return parts.length > 0 ? parts.join(' • ') : '-';
}

/**
 * Formats a shipping address for compact display (single line)
 */
export function formatShippingAddressCompact(address: any): string {
  if (!address || typeof address !== 'object') {
    return '-';
  }

  const parts: string[] = [];
  
  if (address.name) parts.push(address.name);
  if (address.city && address.state) parts.push(`${address.city}, ${address.state}`);
  else if (address.city) parts.push(address.city);
  else if (address.state) parts.push(address.state);

  return parts.length > 0 ? parts.join(' → ') : '-';
}

/**
 * Formats a shipping address for multi-line display
 */
export function formatShippingAddressMultiLine(address: any): string[] {
  if (!address || typeof address !== 'object') {
    return ['-'];
  }

  const lines: string[] = [];
  
  if (address.name) {
    lines.push(address.name);
  }

  if (address.line1) {
    lines.push(address.line1);
  }
  if (address.line2) {
    lines.push(address.line2);
  }

  const cityStateZip: string[] = [];
  if (address.city) cityStateZip.push(address.city);
  if (address.state) cityStateZip.push(address.state);
  if (address.postal_code) cityStateZip.push(address.postal_code);
  
  if (cityStateZip.length > 0) {
    lines.push(cityStateZip.join(', '));
  }

  if (address.country && address.country.toUpperCase() !== 'US') {
    lines.push(address.country);
  }

  return lines.length > 0 ? lines : ['-'];
}

// ============================================================================
// ORDER ITEMS TRANSFORMATIONS
// ============================================================================

export interface OrderItem {
  name?: string;
  description?: string;
  quantity?: number;
  price?: number;
  image_url?: string;
  [key: string]: any;
}

/**
 * Formats order items for display
 */
export function formatOrderItems(items: any): string {
  if (!items) return '-';
  
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      return items;
    }
  }

  if (!Array.isArray(items)) {
    if (typeof items === 'object' && items.quantity) {
      // Single item as object
      const name = items.name || items.description || 'Item';
      const qty = items.quantity || 1;
      return `${qty}x ${name}`;
    }
    return JSON.stringify(items).substring(0, 50) + '...';
  }

  const itemStrings = items.map((item: any) => {
    const name = item.name || item.description || 'Item';
    const qty = item.quantity || 1;
    return `${qty}x ${name}`;
  });

  if (itemStrings.length <= 2) {
    return itemStrings.join(', ');
  }

  return `${itemStrings.slice(0, 2).join(', ')} +${itemStrings.length - 2} more`;
}

// ============================================================================
// METADATA TRANSFORMATIONS
// ============================================================================

/**
 * Formats metadata objects for human-readable display
 */
export function formatMetadata(metadata: any): string {
  if (!metadata || typeof metadata !== 'object') {
    return '-';
  }

  const importantKeys = ['customer_id', 'order_id', 'source', 'campaign', 'referrer'];
  const displayPairs: string[] = [];

  // Show important keys first
  importantKeys.forEach(key => {
    if (metadata[key]) {
      displayPairs.push(`${key}: ${metadata[key]}`);
    }
  });

  // Add other keys (limit to avoid clutter)
  const otherKeys = Object.keys(metadata).filter(key => 
    !importantKeys.includes(key) && 
    metadata[key] !== null && 
    metadata[key] !== undefined && 
    metadata[key] !== ''
  );

  const remainingSlots = Math.max(0, 3 - displayPairs.length);
  otherKeys.slice(0, remainingSlots).forEach(key => {
    const value = typeof metadata[key] === 'object' 
      ? JSON.stringify(metadata[key]).substring(0, 20) + '...'
      : String(metadata[key]).substring(0, 20);
    displayPairs.push(`${key}: ${value}`);
  });

  if (displayPairs.length === 0) {
    return `${Object.keys(metadata).length} fields`;
  }

  const result = displayPairs.join(' • ');
  const totalKeys = Object.keys(metadata).length;
  
  if (totalKeys > displayPairs.length) {
    return `${result} (+${totalKeys - displayPairs.length} more)`;
  }

  return result;
}

// ============================================================================
// PAYLOAD TRANSFORMATIONS
// ============================================================================

/**
 * Extracts key information from Stripe payload
 */
export function formatStripePayload(payload: any): string {
  if (!payload || typeof payload !== 'object') {
    return '-';
  }

  const parts: string[] = [];

  // Event type
  if (payload.type) {
    parts.push(`Event: ${payload.type}`);
  }

  // Payment intent or charge info
  if (payload.data?.object) {
    const obj = payload.data.object;
    
    if (obj.amount && obj.currency) {
      const amount = (obj.amount / 100).toFixed(2);
      parts.push(`$${amount} ${obj.currency.toUpperCase()}`);
    }

    if (obj.status) {
      parts.push(`Status: ${obj.status}`);
    }

    if (obj.payment_method_types && Array.isArray(obj.payment_method_types)) {
      parts.push(`Payment: ${obj.payment_method_types.join(', ')}`);
    }
  }

  return parts.length > 0 ? parts.join(' • ') : 'Stripe Event';
}

// ============================================================================
// ROW HEIGHT OPTIMIZATION
// ============================================================================

/**
 * Determines optimal row height based on content complexity
 */
export function getOptimalRowHeight(event: CombinedOrderEvent, visibleColumns: string[]): 'compact' | 'standard' | 'expanded' {
  let contentComplexity = 0;

  visibleColumns.forEach(column => {
    const value = event[column as keyof CombinedOrderEvent];
    
    // Check for complex data types that need more space
    if (column === 'pmo_shipping_address' && value) {
      contentComplexity += 2;
    }
    
    if (column === 'pmo_items' && value) {
      try {
        const items = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(items) && items.length > 1) {
          contentComplexity += 1;
        }
      } catch {
        // ignore parsing errors
      }
    }

    if (['payload', 'pmo_metadata', 'mr_input_data', 'mr_output_data'].includes(column) && value) {
      contentComplexity += 1;
    }

    if (column === 'pmor_internal_notes' && value && String(value).length > 50) {
      contentComplexity += 2;
    }
  });

  if (contentComplexity >= 4) return 'expanded';
  if (contentComplexity >= 2) return 'standard';
  return 'compact';
}

/**
 * Gets row height class names based on height type
 */
export function getRowHeightClasses(heightType: 'compact' | 'standard' | 'expanded'): string {
  switch (heightType) {
    case 'compact':
      return 'h-12'; // 48px
    case 'standard':
      return 'h-16'; // 64px
    case 'expanded':
      return 'h-20'; // 80px
    default:
      return 'h-16';
  }
}

// ============================================================================
// COMPREHENSIVE CELL CONTENT TRANSFORMER
// ============================================================================

/**
 * Main transformation function for cell content
 * This replaces the complex switch statement in renderCellContent
 */
export function transformCellContent(
  event: CombinedOrderEvent, 
  columnName: string, 
  value: any
): {
  displayValue: string;
  isMultiLine?: boolean;
  lines?: string[];
  shouldTruncate?: boolean;
  maxLength?: number;
} {
  
  if (value === null || value === undefined) {
    return { displayValue: '-' };
  }

  switch (columnName) {
    case 'pmo_shipping_address':
      const addressLines = formatShippingAddressMultiLine(value);
      return {
        displayValue: formatShippingAddressCompact(value),
        isMultiLine: addressLines.length > 1,
        lines: addressLines
      };

    case 'pmo_items':
      return {
        displayValue: formatOrderItems(value),
        shouldTruncate: true,
        maxLength: 60
      };

    case 'payload':
      return {
        displayValue: formatStripePayload(value),
        shouldTruncate: true,
        maxLength: 80
      };

    case 'pmo_metadata':
    case 'mr_metadata':
      return {
        displayValue: formatMetadata(value),
        shouldTruncate: true,
        maxLength: 100
      };

    case 'mr_input_data':
    case 'mr_output_data':
      if (typeof value === 'object') {
        // Try to extract meaningful info from model run data
        if (value.prompt) {
          return {
            displayValue: `Prompt: ${value.prompt}`,
            shouldTruncate: true,
            maxLength: 60
          };
        }
        if (value.image_url) {
          return {
            displayValue: 'Image data',
            shouldTruncate: false
          };
        }
      }
      return {
        displayValue: typeof value === 'string' ? value : JSON.stringify(value),
        shouldTruncate: true,
        maxLength: 40
      };

    case 'mr_output_images':
      if (Array.isArray(value)) {
        return {
          displayValue: `${value.length} image${value.length === 1 ? '' : 's'}`,
          shouldTruncate: false
        };
      }
      return {
        displayValue: typeof value === 'string' ? value : JSON.stringify(value),
        shouldTruncate: true,
        maxLength: 40
      };

    default:
      // For all other fields, return as-is with basic formatting
      return {
        displayValue: String(value),
        shouldTruncate: columnName.includes('id') || columnName.includes('url'),
        maxLength: columnName.includes('id') ? 12 : 50
      };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Truncates text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Checks if a value represents empty/null data
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(value: any): any {
  if (typeof value !== 'string') return value;
  
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
} 