"use server";

import { createAdminClient } from '@/lib/supabase/admin';
import { ShippingAddress } from '@/lib/data-transformations';

export async function updateShippingAddress(stripePaymentId: string, newAddress: ShippingAddress) {
  try {
    const supabase = await createAdminClient();
    
    // Sanitize the address - convert empty strings to undefined for optional fields
    const sanitizedAddress: ShippingAddress = {
      ...newAddress,
      line2: newAddress.line2?.trim() === '' ? undefined : newAddress.line2,
      // Also trim whitespace from other fields for consistency
      name: newAddress.name?.trim() || '',
      line1: newAddress.line1?.trim() || '',
      city: newAddress.city?.trim() || '',
      state: newAddress.state?.trim() || '',
      postal_code: newAddress.postal_code?.trim() || '',
      country: newAddress.country?.trim() || 'US'
    };
    
    // Update the shipping_address in physical_mail_orders table
    // Using payment_intent_id to identify the record
    const { data, error } = await supabase
      .from('physical_mail_orders')
      .update({
        shipping_address: sanitizedAddress,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', stripePaymentId)
      .select('id, order_number, shipping_address');

    if (error) {
      console.error('Error updating shipping address:', error);
      return {
        success: false,
        error: error.message
      };
    }

    if (!data || data.length === 0) {
      console.error('No order found with payment_intent_id:', stripePaymentId);
      return {
        success: false,
        error: `No order found with payment ID: ${stripePaymentId}`
      };
    }

    console.log(`✅ Successfully updated shipping address for order ${data[0].order_number}`);
    console.log('Updated address:', data[0].shipping_address);

    return {
      success: true,
      data: data[0],
      message: `Shipping address updated for order ${data[0].order_number}`
    };

  } catch (error) {
    console.error('Error in updateShippingAddress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 