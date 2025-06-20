"use server";

import { getImageBuffer, createStickerSheet, bufferToArrayBuffer } from '@/lib/image-processing';

export async function prepareLayout(formData: FormData): Promise<ArrayBuffer> {
  try {
    // Step 1: Convert FormData to image buffer
    const inputBuffer = await getImageBuffer(formData);

    // Step 2: Create 3-up sticker sheet layout using utility
    const finalBuffer = await createStickerSheet(inputBuffer, {
      canvasWidth: 1200,
      canvasHeight: 2267,
      stickerHeight: 600,
      yPositions: [134, 834, 1534],
      backgroundColor: { r: 255, g: 255, b: 255 }
    });

    // Step 3: Convert Buffer to ArrayBuffer for serialization
    return bufferToArrayBuffer(finalBuffer);

  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 