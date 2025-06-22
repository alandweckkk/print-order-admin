"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface UpdateStatusResult {
  success: boolean;
  error?: string;
}

export async function updateOrderStatus(stripePaymentId: string, status: string): Promise<UpdateStatusResult> {
  try {
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from('z_print_order_management')
      .update({ status })
      .eq('stripe_payment_id', stripePaymentId);

    if (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: `Failed to update status: ${error.message}`
      };
    }

    console.log(`✅ Updated status for payment ${stripePaymentId} to: ${status}`);
    
    return {
      success: true
    };

  } catch (error) {
    console.error('Unexpected error updating order status:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
} 