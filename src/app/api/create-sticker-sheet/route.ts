import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createStickerSheetFromUrl } from '@/lib/image-processing';

export async function POST(request: NextRequest) {
  try {
    // Handle JSON (URL input only)
    const body = await request.json();
    const { imageUrl, layout = '3-up' } = body; // Default to 3-up for backward compatibility
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
    }

    // Validate layout option
    if (!['2-up', '3-up'].includes(layout)) {
      return NextResponse.json({ error: 'Invalid layout option. Use "2-up" or "3-up"' }, { status: 400 });
    }

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

    // Process image URL into sticker sheet layout
    const stickerSheetBuffer = await createStickerSheetFromUrl(imageUrl, layoutConfig);

    // Save to Vercel Blob
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `processed-sticker-sheet-${layout}-${timestamp}.png`;

    const blob = await put(filename, stickerSheetBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    console.log(`✅ Processed and saved ${layout} sticker sheet to blob: ${blob.url}`);

    return NextResponse.json({
      success: true,
      layout: layout,
      inputImageUrl: imageUrl,
      outputImageUrl: blob.url,
      filename: filename,
      config: {
        stickerHeight: layoutConfig.stickerHeight,
        stickerCount: layoutConfig.yPositions.length,
        yPositions: layoutConfig.yPositions
      }
    });

  } catch (error) {
    console.error('❌ Error in create-sticker-sheet API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 