"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export async function updateOrderStatus(stripePaymentId: string, newStatus: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createAdminClient();
    
    const { error } = await supabase
      .from('z_print_order_management')
      .update({ status: newStatus })
      .eq('stripe_payment_id', stripePaymentId);

    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Successfully updated status to "${newStatus}" for order ${stripePaymentId}`);
    return { 
      success: true, 
      message: `Status updated to "${newStatus}"` 
    };

  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 