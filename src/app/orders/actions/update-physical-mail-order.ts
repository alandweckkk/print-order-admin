"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export async function updatePhysicalMailOrder(
  paymentIntentId: string, 
  fieldName: 'order_number' | 'shipping_address' | 'email',
  newValue: string
) {
  console.log('🔧 updatePhysicalMailOrder server action called:', { paymentIntentId, fieldName, newValue });
  
  try {
    const supabase = await createAdminClient();
    console.log('📡 Supabase admin client created');
    
    // Update the field in the physical_mail_orders table
    const updateData = { [fieldName]: newValue };
    const { data, error } = await supabase
      .from('physical_mail_orders')
      .update(updateData)
      .eq('payment_intent_id', paymentIntentId)
      .select();

    console.log('🗃️ Supabase update result:', { data, error });

    if (error) {
      console.error('❌ Supabase error updating physical mail order:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Successfully updated physical mail order in database:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception in updatePhysicalMailOrder:', error);
    return { success: false, error: 'Failed to update physical mail order' };
  }
} 