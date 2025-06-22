import { CombinedOrderEvent } from '@/app/orders/actions/pull-orders-from-supabase';

// ============================================================================
// TYPE DEFINITIONS
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
  [key: string]: string | number | boolean | null | undefined; // For any additional fields
}

export interface OrderItem {
  name?: string;
  description?: string;
  quantity?: number;
  price?: number;
  image_url?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface MetadataObject {
  [key: string]: string | number | boolean | null | undefined;
}

export interface StripePayload {
  type?: string;
  data?: {
    object?: {
      amount?: number;
      currency?: string;
      status?: string;
      payment_method_types?: string[];
    };
  };
  [key: string]: unknown;
}

export interface ModelRunData {
  prompt?: string;
  image_url?: string;
  [key: string]: unknown;
}

// ============================================================================
// SHIPPING ADDRESS TRANSFORMATIONS
// ============================================================================

/**
 * Formats a shipping address object into a human-readable string
 */
export function formatShippingAddress(address: ShippingAddress | string | null | undefined): string {
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
export function formatShippingAddressCompact(address: ShippingAddress | string | null | undefined): string {
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
export function formatShippingAddressMultiLine(address: ShippingAddress | string | null | undefined): string[] {
  if (!address || typeof address !== 'object') {
    return ['-'];
  }

  const lines: string[] = [];
  
  if (address.name) {
    lines.push(address.name);
  }

  // Combine line1 and line2 on the same line if both exist
  if (address.line1) {
    let addressLine = address.line1;
    if (address.line2) {
      addressLine += ` ${address.line2}`;
    }
    lines.push(addressLine);
  } else if (address.line2) {
    // If only line2 exists (unusual case)
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

/**
 * Formats order items for display
 */
export function formatOrderItems(items: OrderItem[] | OrderItem | string | null | undefined): string {
  if (!items) return '-';
  
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items) as OrderItem[] | OrderItem;
    } catch {
      return String(items);
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

  const itemStrings = items.map((item: OrderItem) => {
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
export function formatMetadata(metadata: MetadataObject | string | null | undefined): string {
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
export function formatStripePayload(payload: StripePayload | string | null | undefined): string {
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

    if (false) { // Removed pmor_internal_notes functionality
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
  value: unknown
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
      const addressLines = formatShippingAddressMultiLine(value as ShippingAddress);
      return {
        displayValue: formatShippingAddressCompact(value as ShippingAddress),
        isMultiLine: addressLines.length > 1,
        lines: addressLines
      };

    case 'pmo_items':
      return {
        displayValue: formatOrderItems(value as OrderItem[]),
        shouldTruncate: true,
        maxLength: 60
      };

    case 'payload':
      return {
        displayValue: formatStripePayload(value as StripePayload),
        shouldTruncate: true,
        maxLength: 80
      };

    case 'pmo_metadata':
    case 'mr_metadata':
      return {
        displayValue: formatMetadata(value as MetadataObject),
        shouldTruncate: true,
        maxLength: 100
      };

    case 'mr_input_data':
    case 'mr_output_data':
      if (typeof value === 'object' && value !== null) {
        const modelData = value as ModelRunData;
        // Try to extract meaningful info from model run data
        if (modelData.prompt) {
          return {
            displayValue: `Prompt: ${modelData.prompt}`,
            shouldTruncate: true,
            maxLength: 60
          };
        }
        if (modelData.image_url) {
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
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
} 