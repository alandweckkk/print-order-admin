import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createStickerSheetFromUrl } from '@/lib/image-processing';

export async function POST(request: NextRequest) {
  try {
    // Handle JSON (URL input only)
    const body = await request.json();
    const { imageUrl } = body;
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
    }

    // Process image URL into sticker sheet layout
    const stickerSheetBuffer = await createStickerSheetFromUrl(imageUrl, {
      canvasWidth: 1200,
      canvasHeight: 2267,
      stickerHeight: 600,
      yPositions: [134, 834, 1534],
      backgroundColor: { r: 255, g: 255, b: 255 }
    });

    // Save to Vercel Blob
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `processed-sticker-sheet-${timestamp}.png`;

    const blob = await put(filename, stickerSheetBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    console.log(`✅ Processed and saved sticker sheet to blob: ${blob.url}`);

    return NextResponse.json({
      success: true,
      inputImageUrl: imageUrl,
      outputImageUrl: blob.url,
      filename: filename
    });

  } catch (error) {
    console.error('❌ Error in create-sticker-sheet API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 