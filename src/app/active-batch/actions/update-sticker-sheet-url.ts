"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export async function updateStickerSheetUrl(
  stripePaymentId: string, 
  stickerSheetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient();
    
    console.log(`💾 Updating sticker sheet URL for payment ${stripePaymentId}`);
    
    const { data, error } = await supabase
      .from('z_print_order_management')
      .update({ sticker_sheet_url: stickerSheetUrl })
      .eq('stripe_payment_id', stripePaymentId)
      .select();

    if (error) {
      console.error('❌ Error updating sticker sheet URL:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.error('❌ No record found to update');
      return { success: false, error: 'No record found to update' };
    }

    console.log(`✅ Successfully updated sticker sheet URL for payment ${stripePaymentId}`);
    return { success: true };

  } catch (error) {
    console.error('❌ Error in updateStickerSheetUrl:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 