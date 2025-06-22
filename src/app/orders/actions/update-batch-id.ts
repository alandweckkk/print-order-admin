"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export async function updateBatchId(stripePaymentId: string, newBatchId: string) {
  console.log('🔧 updateBatchId server action called:', { stripePaymentId, newBatchId });
  
  try {
    const supabase = await createAdminClient();
    console.log('📡 Supabase admin client created');
    
    // Update the batch_id in the z_print_order_management table
    const { data, error } = await supabase
      .from('z_print_order_management')
      .update({ batch_id: newBatchId })
      .eq('stripe_payment_id', stripePaymentId)
      .select();

    console.log('🗃️ Supabase update result:', { data, error });

    if (error) {
      console.error('❌ Supabase error updating batch ID:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Successfully updated batch ID in database:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception in updateBatchId:', error);
    return { success: false, error: 'Failed to update batch ID' };
  }
} 