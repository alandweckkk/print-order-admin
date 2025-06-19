"use server";

import sharp from "sharp";

export async function prepareLayout(formData: FormData): Promise<ArrayBuffer> {
  try {
    let inputBuffer: Buffer;

    // Check if we have a file or URL
    const file = formData.get("image") as File;
    const imageUrl = formData.get("imageUrl") as string;

    if (file) {
      // Handle file upload
      if (!file.type.includes('png')) {
        throw new Error("Please provide a PNG file");
      }
      
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else if (imageUrl) {
      // Handle URL download
      try {
        // Validate URL
        new URL(imageUrl);
        
        // Fetch the image from URL
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        // Check if the response is an image
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('image')) {
          throw new Error('URL does not point to an image');
        }

        // Convert response to buffer
        const arrayBuffer = await response.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);

        // Validate that it's a PNG by trying to read it with Sharp
        const metadata = await sharp(inputBuffer).metadata();
        if (metadata.format !== 'png') {
          throw new Error('Image must be in PNG format');
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to process image URL: ${error.message}`);
        }
        throw new Error('Failed to process image URL');
      }
    } else {
      throw new Error("No image file or URL provided");
    }

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

    // Step 5: Export clean PNG buffer (no annotations)
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