"use server";

import sharp from "sharp";

export async function prepareLayout(formData: FormData): Promise<ArrayBuffer> {
  try {
    // Parse the file from formData
    const file = formData.get("image") as File;
    
    if (!file) {
      throw new Error("No file provided");
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Step 1: Auto-crop - trim all fully-transparent rows/columns
    const croppedImage = sharp(inputBuffer)
      .trim({ threshold: 1 }); // Remove transparent pixels

    // Step 2: Resize - height to 600px, keep aspect ratio
    const resizedImage = croppedImage
      .resize({ height: 600, withoutEnlargement: false });

    // Get the resized image buffer and metadata for compositing
    const resizedBuffer = await resizedImage.png().toBuffer();
    const { width: resizedWidth, height: resizedHeight } = await sharp(resizedBuffer).metadata();

    // Step 3: Create canvas - 1200 × 2267, white background
    const canvasWidth = 1200;
    const canvasHeight = 2267;
    
    // Calculate x position to center the image horizontally
    const xPosition = Math.round((canvasWidth - (resizedWidth || 0)) / 2);

    // Step 4: Composite - place the resized image three times
    // y-positions: 134, 834, 1534 px (100 px gaps, 600 px images)
    const yPositions = [134, 834, 1534];

    const compositeOperations = yPositions.map(y => ({
      input: resizedBuffer,
      left: xPosition,
      top: y
    }));

    // Step 5: Export as PNG buffer
    const finalBuffer = await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 } // White background
      }
    })
    .composite(compositeOperations)
    .png()
    .toBuffer();

    // Return as ArrayBuffer (serializable)
    return finalBuffer.buffer.slice(finalBuffer.byteOffset, finalBuffer.byteOffset + finalBuffer.byteLength);

  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 