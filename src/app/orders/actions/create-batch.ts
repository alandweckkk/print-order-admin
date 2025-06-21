"use server";

interface CombinedOrderEvent {
  id: number;
  mr_original_output_image_url?: string;
  mr_output_image_url?: string;
  pmo_order_number?: string;
  pmo_email?: string;
  pmo_status?: string;
  [key: string]: any;
}

export interface Batch {
  batch_id: string;
  name: string;
  created_at: string;
  order_ids: number[];
  order_data: CombinedOrderEvent[];
}

export async function createBatch(
  selectedOrderData: CombinedOrderEvent[],
  batchName: string
): Promise<{ success: boolean; batch?: Batch; error?: string }> {
  console.log('🔥 SERVER ACTION CALLED! createBatch');
  console.log('🔥 Batch name:', batchName);
  console.log('🔥 Order count:', selectedOrderData?.length);
  
  try {
    const batch_id = Date.now().toString();
    
    console.log(`🚀 Creating batch: ${batchName} with ${selectedOrderData.length} orders`);
    
    // Create batch without any image processing
    const newBatch: Batch = {
      batch_id,
      name: batchName.trim(),
      created_at: new Date().toISOString(),
      order_ids: selectedOrderData.map(order => order.id),
      order_data: selectedOrderData
    };
    
    console.log(`✅ Created batch: ${newBatch.name} with ${newBatch.order_ids.length} orders`);
    
    return {
      success: true,
      batch: newBatch
    };
    
  } catch (error) {
    console.error('❌ Error creating batch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 