"use server";

import { put } from '@vercel/blob';
import { createStickerSheetFromUrl } from '@/lib/image-processing';

export async function processImageUrlToBlob(
  imageUrl: string,
  filename?: string
): Promise<{ success: boolean; blobUrl?: string; error?: string }> {
  try {
    // Step 1: Process image URL into sticker sheet layout
    const stickerSheetBuffer = await createStickerSheetFromUrl(imageUrl, {
      canvasWidth: 1200,
      canvasHeight: 2267,
      stickerHeight: 600,
      yPositions: [134, 834, 1534],
      backgroundColor: { r: 255, g: 255, b: 255 }
    });

    // Step 2: Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFilename = filename 
      ? `processed-${filename}-${timestamp}.png`
      : `processed-sticker-sheet-${timestamp}.png`;

    // Step 3: Save to Vercel Blob
    const blob = await put(finalFilename, stickerSheetBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    console.log(`✅ Processed and saved sticker sheet to blob: ${blob.url}`);

    return {
      success: true,
      blobUrl: blob.url
    };

  } catch (error) {
    console.error('❌ Error processing image URL to blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 