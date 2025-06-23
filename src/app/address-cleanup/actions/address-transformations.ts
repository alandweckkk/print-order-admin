import { PhysicalMailOrder } from './fetch-physical-mail-orders';

// State mapping - full names and variations to standard 2-letter codes
const STATE_MAPPING: Record<string, string> = {
  // Full state names
  'alabama': 'AL',
  'alaska': 'AK', 
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
};

function normalizeState(state: string): string {
  const trimmed = state.trim();
  const normalized = trimmed.toLowerCase();
  
  // If it's already a 2-letter code, just uppercase it
  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  
  // Look up full state name
  const mapped = STATE_MAPPING[normalized];
  if (mapped) {
    return mapped;
  }
  
  // If no mapping found, just uppercase and trim
  return trimmed.toUpperCase();
}

function toCamelCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      
      // Handle special cases like "McGowan", "O'Brien", etc.
      if (word.includes("'")) {
        return word.split("'").map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join("'");
      }
      
      // Handle "Mc" prefix
      if (word.toLowerCase().startsWith('mc') && word.length > 2) {
        return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3);
      }
      
      // Handle "Mac" prefix
      if (word.toLowerCase().startsWith('mac') && word.length > 3) {
        return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4);
      }
      
      // Standard camel case
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function smartCamelCaseAddress(address: string): string {
  // Handle special address patterns
  const trimmed = address.trim();
  
  // Don't transform if it's mostly numbers or has specific patterns
  if (/^\d+/.test(trimmed)) {
    // For addresses starting with numbers, be more conservative
    return trimmed
      .split(' ')
      .map((word, index) => {
        // Keep first word (number) as-is
        if (index === 0 && /^\d+$/.test(word)) return word;
        
        // Handle directional abbreviations
        if (['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'].includes(word.toUpperCase())) {
          return word.toUpperCase();
        }
        
        // Handle street types
        if (['ST', 'AVE', 'RD', 'DR', 'LN', 'CT', 'PL', 'WAY', 'BLVD'].includes(word.toUpperCase())) {
          return toCamelCase(word);
        }
        
        return toCamelCase(word);
      })
      .join(' ');
  }
  
  return toCamelCase(trimmed);
}

function standardizeApartment(line2: string | null): string | null {
  if (!line2 || line2.trim() === '') return null;
  
  const trimmed = line2.trim();
  
  // Standardize apartment formats
  const aptPattern = /^(apt|apartment)\s*(.+)$/i;
  const match = trimmed.match(aptPattern);
  
  if (match) {
    return `APT ${match[2].toUpperCase()}`;
  }
  
  // If it's just a number or letter, assume it's an apartment
  if (/^[A-Z0-9]+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  
  return trimmed;
}

export interface TransformationResult {
  transformed: PhysicalMailOrder['shipping_address'];
  changes: string[];
  needsChange: boolean;
}

export function transformAddress(address: PhysicalMailOrder['shipping_address']): TransformationResult {
  const changes: string[] = [];
  const transformed = { ...address };
  
  // Trim all string fields and track changes
  Object.keys(transformed).forEach(key => {
    const typedKey = key as keyof typeof transformed;
    const value = transformed[typedKey];
    if (typeof value === 'string' && value !== value.trim()) {
      (transformed as Record<string, unknown>)[key] = value.trim();
      changes.push(`Trimmed spaces from ${key}`);
    }
  });
  
  // Transform state
  const newState = normalizeState(address.state);
  if (newState !== address.state) {
    transformed.state = newState;
    changes.push(`State: "${address.state}" → "${newState}"`);
  }
  
  // Transform name to camel case
  const newName = toCamelCase(address.name);
  if (newName !== address.name) {
    transformed.name = newName;
    changes.push(`Name: "${address.name}" → "${newName}"`);
  }
  
  // Transform city to camel case
  const newCity = toCamelCase(address.city);
  if (newCity !== address.city) {
    transformed.city = newCity;
    changes.push(`City: "${address.city}" → "${newCity}"`);
  }
  
  // Transform line1 with smart camel case
  const newLine1 = smartCamelCaseAddress(address.line1);
  if (newLine1 !== address.line1) {
    transformed.line1 = newLine1;
    changes.push(`Address: "${address.line1}" → "${newLine1}"`);
  }
  
  // Standardize line2 (apartment)
  const newLine2 = standardizeApartment(address.line2);
  if (newLine2 !== address.line2) {
    transformed.line2 = newLine2;
    if (address.line2 && newLine2) {
      changes.push(`Apt: "${address.line2}" → "${newLine2}"`);
    } else if (address.line2 && !newLine2) {
      changes.push(`Removed empty line2`);
    }
  }
  
  // Country should be uppercase
  if (address.country !== address.country.toUpperCase()) {
    transformed.country = address.country.toUpperCase();
    changes.push(`Country: "${address.country}" → "${transformed.country}"`);
  }
  
  return {
    transformed,
    changes: changes.map(change => `• ${change}`), // Format as bullet points
    needsChange: changes.length > 0
  };
} 