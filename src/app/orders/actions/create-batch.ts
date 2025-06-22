"use server";

import { createAdminClient } from '@/lib/supabase/admin';

interface CombinedOrderEvent {
  id: number;
  stripe_payment_id?: string | null;
  mr_original_output_image_url?: string | null;
  mr_output_image_url?: string | null;
  pmo_order_number?: string | null;
  pmo_email?: string | null;
  pmo_status?: string | null;
  [key: string]: string | number | null | undefined;
}

export async function createBatch(
  selectedOrderData: CombinedOrderEvent[],
  batchName: string
): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
  console.log('🔥 SERVER ACTION CALLED! createBatch');
  console.log('🔥 Batch name:', batchName);
  console.log('🔥 Order count:', selectedOrderData?.length);
  
  try {
    const supabase = await createAdminClient();
    
    // Extract the stripe payment IDs from selected data
    const stripePaymentIds = selectedOrderData
      .map(order => order.stripe_payment_id)
      .filter(id => id !== null && id !== undefined);
    
    if (stripePaymentIds.length === 0) {
      return {
        success: false,
        error: 'No valid stripe payment IDs found in selected orders'
      };
    }
    
    console.log(`🚀 Updating batch_id for stripe payment IDs: ${stripePaymentIds.join(', ')}`);
    
    // Update all selected orders with the batch_id in z_print_order_management table
    const { data, error } = await supabase
      .from('z_print_order_management')
      .update({ batch_id: batchName.trim() })
      .in('stripe_payment_id', stripePaymentIds)
      .select('id, stripe_payment_id');
    
    if (error) {
      console.error('❌ Supabase error updating batch_id:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }
    
    const updatedCount = data?.length || 0;
    console.log(`✅ Successfully updated ${updatedCount} orders with batch_id: ${batchName}`);
    console.log('Updated records:', data);
    
    return {
      success: true,
      updatedCount
    };
    
  } catch (error) {
    console.error('❌ Error creating batch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 