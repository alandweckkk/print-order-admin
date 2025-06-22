"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export async function updateStripeEvent(
  eventId: number, 
  fieldName: 'created_timestamp_est',
  newValue: string
) {
  console.log('🔧 updateStripeEvent server action called:', { eventId, fieldName, newValue });
  
  try {
    const supabase = await createAdminClient();
    console.log('📡 Supabase admin client created');
    
    // Update the field in the stripe_captured_events table
    const updateData = { [fieldName]: newValue };
    const { data, error } = await supabase
      .from('stripe_captured_events')
      .update(updateData)
      .eq('id', eventId)
      .select();

    console.log('🗃️ Supabase update result:', { data, error });

    if (error) {
      console.error('❌ Supabase error updating stripe event:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Successfully updated stripe event in database:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception in updateStripeEvent:', error);
    return { success: false, error: 'Failed to update stripe event' };
  }
} 