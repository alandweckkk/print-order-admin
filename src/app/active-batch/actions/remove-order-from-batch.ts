"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export async function removeOrderFromBatch(stripePaymentId: string) {
  try {
    const supabase = await createAdminClient();
    
    const { error } = await supabase
      .from('z_print_order_management')
      .update({ batch_id: 'unbatched' })
      .eq('stripe_payment_id', stripePaymentId);

    if (error) {
      console.error('Error removing order from batch:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Successfully removed order ${stripePaymentId} from batch (set to unbatched)`);
    return { success: true };
    
  } catch (err) {
    console.error('Error removing order from batch:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
} 