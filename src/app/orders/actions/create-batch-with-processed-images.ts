"use server";

import { processImageUrlToBlob } from '@/app/sticker-layout/actions/process-image-url-to-blob';

interface CombinedOrderEvent {
  id: number;
  mr_original_output_image_url?: string;
  mr_output_image_url?: string;
  pmo_order_number?: string;
  pmo_email?: string;
  pmo_status?: string;
  [key: string]: any;
}

interface Batch {
  batch_id: string;
  name: string;
  created_at: string;
  order_ids: number[];
  order_data: CombinedOrderEvent[];
  processed_images?: { [orderId: number]: string }; // Map of order ID to processed blob URL
}

export async function createBatchWithProcessedImages(
  selectedOrderData: CombinedOrderEvent[],
  batchName: string
): Promise<{ success: boolean; batch?: Batch; error?: string }> {
  console.log('🔥 SERVER ACTION CALLED! createBatchWithProcessedImages');
  console.log('🔥 Batch name:', batchName);
  console.log('🔥 Order count:', selectedOrderData?.length);
  
  try {
    const batch_id = Date.now().toString();
    const processedImages: { [orderId: number]: string } = {};
    
    console.log(`🚀 Processing ${selectedOrderData.length} images for batch: ${batchName}`);
    console.log(`📋 Selected order data:`, selectedOrderData);
    
    // Process each order's original image URL through sticker layout
    const processingPromises = selectedOrderData.map(async (order) => {
      const originalImageUrl = order.mr_original_output_image_url;
      
      // Debug logging
      console.log(`🔍 Order ${order.id} image URL:`, originalImageUrl);
      console.log(`🔍 Order ${order.id} all fields:`, Object.keys(order));
      
      if (originalImageUrl && typeof originalImageUrl === 'string' && originalImageUrl.startsWith('http')) {
        try {
          console.log(`📸 Processing image for order ${order.id}: ${originalImageUrl}`);
          
          const result = await processImageUrlToBlob(
            originalImageUrl,
            `order-${order.id}-${order.pmo_order_number || 'unknown'}`
          );
          
          if (result.success && result.blobUrl) {
            processedImages[order.id] = result.blobUrl;
            console.log(`✅ Processed order ${order.id}: ${result.blobUrl}`);
          } else {
            console.warn(`⚠️ Failed to process order ${order.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`❌ Error processing order ${order.id}:`, error);
        }
      } else {
        console.warn(`⚠️ No valid original image URL for order ${order.id}`);
      }
    });
    
    // Wait for all image processing to complete
    await Promise.all(processingPromises);
    
    console.log(`✅ Processed ${Object.keys(processedImages).length}/${selectedOrderData.length} images`);
    
    // Create batch with processed image URLs
    const newBatch: Batch = {
      batch_id,
      name: batchName.trim(),
      created_at: new Date().toISOString(),
      order_ids: selectedOrderData.map(order => order.id),
      order_data: selectedOrderData,
      processed_images: processedImages
    };
    
    return {
      success: true,
      batch: newBatch
    };
    
  } catch (error) {
    console.error('❌ Error creating batch with processed images:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 