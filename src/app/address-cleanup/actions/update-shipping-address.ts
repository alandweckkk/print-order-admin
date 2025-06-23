"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { PhysicalMailOrder } from './fetch-physical-mail-orders';

export async function updateShippingAddress(
  recordId: string, 
  newShippingAddress: PhysicalMailOrder['shipping_address']
) {
  try {
    const supabase = await createAdminClient();
    
    // Update the shipping_address JSONB column with the transformed data
    const { data, error } = await supabase
      .from('physical_mail_orders')
      .update({ 
        shipping_address: newShippingAddress  // This will be stored as proper JSONB, not stringified
      })
      .eq('id', recordId)
      .select('id, shipping_address');

    if (error) {
      console.error('Error updating shipping address:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    if (!data || data.length === 0) {
      return { 
        success: false, 
        error: 'No record found with that ID' 
      };
    }

    console.log(`✅ Successfully updated shipping address for record ${recordId}`);
    
    return { 
      success: true, 
      data: data[0],
      message: `Updated record ${recordId.slice(0, 8)}...`
    };

  } catch (error) {
    console.error('Error in updateShippingAddress:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 