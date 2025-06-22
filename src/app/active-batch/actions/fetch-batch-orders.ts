"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export interface BatchOrder {
  id: string; // UUID string
  stripe_payment_id: string;
  batch_id: string;
  sticker_sheet_url?: string | null;
  // Order data from joined tables
  pmo_order_number?: string | null;
  pmo_email?: string | null;
  pmo_status?: string | null;
  pmo_shipping_address?: string | null;
  mr_original_output_image_url?: string | null;
  mr_output_image_url?: string | null;
  mr_id?: string | null;
}

export async function fetchBatchOrders(batchId: string): Promise<{ orders: BatchOrder[], error?: string }> {
  try {
    const supabase = await createAdminClient();
    
    // Get management records for this batch
    const { data: managementRecords, error: managementError } = await supabase
      .from('z_print_order_management')
      .select('*')
      .eq('batch_id', batchId);

    if (managementError) {
      console.error('Error fetching management records:', managementError);
      return { orders: [], error: managementError.message };
    }

    if (!managementRecords || managementRecords.length === 0) {
      return { orders: [] };
    }

    // Extract payment intent IDs
    const paymentIntentIds = managementRecords
      .map(record => record.stripe_payment_id)
      .filter(Boolean);

    if (paymentIntentIds.length === 0) {
      return { orders: [] };
    }

    // Get physical mail orders
    const { data: physicalOrders, error: physicalError } = await supabase
      .from('physical_mail_orders')
      .select('*')
      .in('payment_intent_id', paymentIntentIds);

    if (physicalError) {
      console.error('Error fetching physical orders:', physicalError);
      // Continue without physical order data
    }

    // Get model runs if we have physical orders
    const modelRunIds = physicalOrders
      ?.map(order => order.model_run_id)
      .filter(Boolean) || [];

    let modelRuns: any[] = [];
    if (modelRunIds.length > 0) {
      const { data: modelRunsData, error: modelRunsError } = await supabase
        .from('model_runs')
        .select('*')
        .in('id', modelRunIds);

      if (modelRunsError) {
        console.error('Error fetching model runs:', modelRunsError);
        // Continue without model run data
      } else {
        modelRuns = modelRunsData || [];
      }
    }

    // Combine the data similar to main orders query
    const combinedOrders: BatchOrder[] = managementRecords.map(managementRecord => {
      const paymentIntentId = managementRecord.stripe_payment_id;
      
      // Find matching physical order
      const matchingOrder = physicalOrders?.find(order => 
        order.payment_intent_id === paymentIntentId
      );
      
      // Find matching model run
      const matchingModelRun = modelRuns?.find(run => 
        run.id === matchingOrder?.model_run_id
      );

      return {
        id: managementRecord.id, // Keep as string (UUID)
        stripe_payment_id: managementRecord.stripe_payment_id,
        batch_id: managementRecord.batch_id,
        sticker_sheet_url: managementRecord.sticker_sheet_url || null,
        pmo_order_number: matchingOrder?.order_number || null,
        pmo_email: matchingOrder?.email || null,
        pmo_status: matchingOrder?.status || null,
        pmo_shipping_address: matchingOrder?.shipping_address || null,
        mr_original_output_image_url: matchingModelRun?.original_output_image_url?.[0] || null,
        mr_output_image_url: matchingModelRun?.output_image_url?.[0] || null,
        mr_id: matchingModelRun?.id || null
      };
    });

    console.log(`✅ Found ${combinedOrders.length} orders for batch ${batchId}`);
    return { orders: combinedOrders };

  } catch (error) {
    console.error('Error in fetchBatchOrders:', error);
    return { 
      orders: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 