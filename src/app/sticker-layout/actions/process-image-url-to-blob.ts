"use server";

import { put } from '@vercel/blob';
import { createStickerSheetFromUrl } from '@/lib/image-processing';

export async function uploadFileToBlob(
  file: File
): Promise<{ success: boolean; blobUrl?: string; error?: string }> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Please upload a valid image file (PNG, JPG, GIF, etc.)'
      };
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = file.name.split('.').pop() || 'png';
    const filename = `input-image-${timestamp}.${extension}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: file.type,
    });

    console.log(`✅ Uploaded file to blob storage: ${blob.url}`);

    return {
      success: true,
      blobUrl: blob.url
    };

  } catch (error) {
    console.error('❌ Error uploading file to blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    };
  }
}

export async function processImageUrlToBlob(
  imageUrl: string,
  filename?: string,
  layout: '2-up' | '3-up' = '3-up'
): Promise<{ success: boolean; blobUrl?: string; error?: string; layout?: string }> {
  try {
    // Configure layout based on option
    const layoutConfig = layout === '2-up' 
      ? {
          canvasWidth: 1200,
          canvasHeight: 2267,
          stickerHeight: 950,
          yPositions: [134, 1184],
          backgroundColor: { r: 255, g: 255, b: 255 }
        }
      : {
          canvasWidth: 1200,
          canvasHeight: 2267,
          stickerHeight: 630,
          yPositions: [134, 834, 1534],
          backgroundColor: { r: 255, g: 255, b: 255 }
        };

    // Step 1: Process image URL into sticker sheet layout
    const stickerSheetBuffer = await createStickerSheetFromUrl(imageUrl, layoutConfig);

    // Step 2: Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFilename = filename 
      ? `processed-${filename}-${layout}-${timestamp}.png`
      : `processed-sticker-sheet-${layout}-${timestamp}.png`;

    // Step 3: Save to Vercel Blob
    const blob = await put(finalFilename, stickerSheetBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    console.log(`✅ Processed and saved ${layout} sticker sheet to blob: ${blob.url}`);

    return {
      success: true,
      blobUrl: blob.url,
      layout: layout
    };

  } catch (error) {
    console.error('❌ Error processing image URL to blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 