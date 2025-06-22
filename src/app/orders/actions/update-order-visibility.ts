"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface UpdateVisibilityResult {
  success: boolean;
  error?: string;
}

export async function updateOrderVisibility(stripePaymentId: string, visible: boolean): Promise<UpdateVisibilityResult> {
  try {
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from('z_print_order_management')
      .update({ visible })
      .eq('stripe_payment_id', stripePaymentId);

    if (error) {
      console.error('Error updating order visibility:', error);
      return {
        success: false,
        error: `Failed to update visibility: ${error.message}`
      };
    }

    console.log(`✅ Updated visibility for payment ${stripePaymentId} to: ${visible}`);
    
    return {
      success: true
    };

  } catch (error) {
    console.error('Unexpected error updating order visibility:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
} 