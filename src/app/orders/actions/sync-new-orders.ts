"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface SyncResult {
  success: boolean;
  newRecords: number;
  totalChecked: number;
  error?: string;
}

export async function syncNewOrders(): Promise<SyncResult> {
  try {
    const supabase = await createAdminClient();

    // Step 1: Query stripe_captured_events for amount = 7.99 and extract payment IDs
    const { data: stripeEvents, error: stripeError } = await supabase
      .from('stripe_captured_events')
      .select('payload')
      .eq('amount', 7.99);

    if (stripeError) {
      console.error('Error fetching stripe events:', stripeError);
      return {
        success: false,
        newRecords: 0,
        totalChecked: 0,
        error: `Failed to fetch stripe events: ${stripeError.message}`
      };
    }

    if (!stripeEvents || stripeEvents.length === 0) {
      return {
        success: true,
        newRecords: 0,
        totalChecked: 0
      };
    }

    // Step 2: Extract payment intent IDs from payload JSONB
    const paymentIds = stripeEvents
      .map(event => {
        try {
          const payload = event.payload as { data?: { object?: { id?: string } } };
          return payload?.data?.object?.id;
        } catch (e) {
          console.warn('Failed to parse payload for event:', e);
          return null;
        }
      })
      .filter(id => id !== null && id !== undefined) as string[];

    if (paymentIds.length === 0) {
      return {
        success: true,
        newRecords: 0,
        totalChecked: stripeEvents.length
      };
    }

    // Step 3: Check which payment IDs already exist in z_print_order_management
    const { data: existingRecords, error: existingError } = await supabase
      .from('z_print_order_management')
      .select('stripe_payment_id')
      .in('stripe_payment_id', paymentIds);

    if (existingError) {
      console.error('Error checking existing records:', existingError);
      return {
        success: false,
        newRecords: 0,
        totalChecked: paymentIds.length,
        error: `Failed to check existing records: ${existingError.message}`
      };
    }

    // Step 4: Find missing payment IDs
    const existingPaymentIds = new Set(
      (existingRecords || []).map(record => record.stripe_payment_id)
    );
    
    const missingPaymentIds = paymentIds.filter(id => !existingPaymentIds.has(id));

    if (missingPaymentIds.length === 0) {
      return {
        success: true,
        newRecords: 0,
        totalChecked: paymentIds.length
      };
    }

    // Step 5: Insert missing records
    const recordsToInsert = missingPaymentIds.map(paymentId => ({
      stripe_payment_id: paymentId
    }));

    const { error: insertError } = await supabase
      .from('z_print_order_management')
      .insert(recordsToInsert);

    if (insertError) {
      console.error('Error inserting new records:', insertError);
      return {
        success: false,
        newRecords: 0,
        totalChecked: paymentIds.length,
        error: `Failed to insert new records: ${insertError.message}`
      };
    }

    console.log(`✅ Sync completed: ${missingPaymentIds.length} new records added`);
    
    return {
      success: true,
      newRecords: missingPaymentIds.length,
      totalChecked: paymentIds.length
    };

  } catch (error) {
    console.error('Unexpected error during sync:', error);
    return {
      success: false,
      newRecords: 0,
      totalChecked: 0,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
} 