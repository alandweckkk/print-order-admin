"use server";

import { createAdminClient } from '@/lib/supabase/admin';

interface UpdateNotesResult {
  success: boolean;
  error?: string;
}

export async function updateOrderNotes(stripePaymentId: string, notes: string): Promise<UpdateNotesResult> {
  try {
    const supabase = await createAdminClient();

    // Convert empty string to null for cleaner database storage
    const noteValue = notes.trim() === '' ? null : notes;

    const { error } = await supabase
      .from('z_print_order_management')
      .update({ order_notes: noteValue })
      .eq('stripe_payment_id', stripePaymentId);

    if (error) {
      console.error('Error updating order notes:', error);
      return {
        success: false,
        error: `Failed to update notes: ${error.message}`
      };
    }

    console.log(`✅ Updated notes for payment ${stripePaymentId}${noteValue === null ? ' (cleared to NULL)' : ''}`);
    
    return {
      success: true
    };

  } catch (error) {
    console.error('Unexpected error updating order notes:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
} 