"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export interface DatabaseBatch {
  batch_id: string;
  name: string;
  created_at: string;
  order_count: number;
  order_ids: string[]; // UUIDs
}

export async function fetchBatchesFromDatabase(): Promise<{ batches: DatabaseBatch[], error?: string }> {
  try {
    const supabase = await createAdminClient();
    
    // Get all records that have a batch_id
    const { data: batchRecords, error } = await supabase
      .from('z_print_order_management')
      .select('id, stripe_payment_id, batch_id')
      .not('batch_id', 'is', null)
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching batch records:', error);
      return { batches: [], error: error.message };
    }

    if (!batchRecords || batchRecords.length === 0) {
      return { batches: [] };
    }

    // Group records by batch_id
    const batchGroups: { [key: string]: typeof batchRecords } = {};
    batchRecords.forEach(record => {
      if (record.batch_id) {
        if (!batchGroups[record.batch_id]) {
          batchGroups[record.batch_id] = [];
        }
        batchGroups[record.batch_id].push(record);
      }
    });

    // Convert to DatabaseBatch format
    const batches: DatabaseBatch[] = Object.entries(batchGroups).map(([batchId, records]) => {
      // Extract order IDs from the management records 
      const orderIds = records.map(record => record.id); // Keep as UUID strings
      
      return {
        batch_id: batchId,
        name: batchId, // Use batch_id as name for now
        created_at: new Date().toISOString(), // We'll get this from first record later
        order_count: records.length,
        order_ids: orderIds
      };
    });

    // Sort batches by name (newest first based on timestamp in name)
    batches.sort((a, b) => b.batch_id.localeCompare(a.batch_id));

    console.log(`✅ Found ${batches.length} batches from database`);
    return { batches };

  } catch (error) {
    console.error('Error in fetchBatchesFromDatabase:', error);
    return { 
      batches: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 