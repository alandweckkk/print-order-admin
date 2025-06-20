"use server";

import { put } from '@vercel/blob';

export async function saveStickerSheetToBlob(
  imageBuffer: ArrayBuffer,
  originalFileName?: string
): Promise<{ url: string; pathname: string }> {
  try {
    // Generate a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = originalFileName 
      ? `sticker-sheet-${originalFileName.replace(/\.[^/.]+$/, '')}-${timestamp}.png`
      : `sticker-sheet-${timestamp}.png`;

    // Convert ArrayBuffer to Buffer for Vercel Blob
    const buffer = Buffer.from(imageBuffer);

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png',
    });

    console.log(`✅ Saved sticker sheet to blob: ${blob.url}`);

    return {
      url: blob.url,
      pathname: blob.pathname
    };
  } catch (error) {
    console.error('❌ Error saving to blob:', error);
    throw new Error(`Failed to save sticker sheet to blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 