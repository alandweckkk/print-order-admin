import sharp from "sharp";

/**
 * Convert FormData with image file or URL to a Buffer
 */
export async function getImageBuffer(formData: FormData): Promise<Buffer> {
  const file = formData.get("image") as File;
  const imageUrl = formData.get("imageUrl") as string;

  if (file) {
    // Handle file upload
    if (!file.type.includes('png')) {
      throw new Error("Please provide a PNG file");
    }
    
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } 
  
  if (imageUrl) {
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
      const buffer = Buffer.from(arrayBuffer);

      // Validate that it's a PNG by trying to read it with Sharp
      const metadata = await sharp(buffer).metadata();
      if (metadata.format !== 'png') {
        throw new Error('Image must be in PNG format');
      }

      return buffer;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to process image URL: ${error.message}`);
      }
      throw new Error('Failed to process image URL');
    }
  }
  
  throw new Error("No image file or URL provided");
}

/**
 * Download image from URL and convert to Buffer
 */
export async function getImageBufferFromUrl(imageUrl: string): Promise<Buffer> {
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
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process image URL: ${error.message}`);
    }
    throw new Error('Failed to process image URL');
  }
}

/**
 * Process an image to create a 3-up vertical sticker sheet layout
 */
export async function createStickerSheet(
  inputBuffer: Buffer,
  options: {
    canvasWidth?: number;
    canvasHeight?: number;
    stickerHeight?: number;
    yPositions?: number[];
    backgroundColor?: { r: number; g: number; b: number };
  } = {}
): Promise<Buffer> {
  const {
    canvasWidth = 1200,
    canvasHeight = 2267,
    stickerHeight = 600,
    yPositions = [134, 834, 1534],
    backgroundColor = { r: 255, g: 255, b: 255 }
  } = options;

  // Step 1: Auto-crop - trim all fully-transparent rows/columns
  const croppedImage = sharp(inputBuffer)
    .trim({ threshold: 1 }); // Remove transparent pixels

  // Step 2: Resize - height to specified size, keep aspect ratio
  const resizedImage = croppedImage
    .resize({ height: stickerHeight, withoutEnlargement: false });

  // Get the resized image buffer and metadata for compositing
  const resizedBuffer = await resizedImage.png().toBuffer();
  const { width: resizedWidth } = await sharp(resizedBuffer).metadata();

  // Step 3: Calculate x position to center the image horizontally
  const xPosition = Math.round((canvasWidth - (resizedWidth || 0)) / 2);

  // Step 4: Create composite operations for each sticker position
  const compositeOperations = yPositions.map(y => ({
    input: resizedBuffer,
    left: xPosition,
    top: y
  }));

  // Step 5: Create final image with white background and composite stickers
  const finalBuffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: backgroundColor
    }
  })
  .composite(compositeOperations)
  .png()
  .toBuffer();

  return finalBuffer;
}

/**
 * Process image URL into sticker sheet layout and return buffer
 */
export async function createStickerSheetFromUrl(
  imageUrl: string,
  options: {
    canvasWidth?: number;
    canvasHeight?: number;
    stickerHeight?: number;
    yPositions?: number[];
    backgroundColor?: { r: number; g: number; b: number };
  } = {}
): Promise<Buffer> {
  // Step 1: Download image from URL
  const inputBuffer = await getImageBufferFromUrl(imageUrl);
  
  // Step 2: Create sticker sheet layout
  return await createStickerSheet(inputBuffer, options);
}

/**
 * Process and crop an image, returning just the cleaned/cropped version
 */
export async function processAndCropImage(
  inputBuffer: Buffer,
  options: {
    maxHeight?: number;
    maxWidth?: number;
    format?: 'png' | 'jpeg' | 'webp';
  } = {}
): Promise<Buffer> {
  const {
    maxHeight,
    maxWidth,
    format = 'png'
  } = options;

  let image = sharp(inputBuffer)
    .trim({ threshold: 1 }); // Remove transparent pixels

  // Apply resize if dimensions specified
  if (maxHeight || maxWidth) {
    image = image.resize({ 
      height: maxHeight, 
      width: maxWidth, 
      withoutEnlargement: false,
      fit: 'inside' // Maintain aspect ratio
    });
  }

  // Convert to specified format
  switch (format) {
    case 'jpeg':
      return await image.jpeg().toBuffer();
    case 'webp':
      return await image.webp().toBuffer();
    case 'png':
    default:
      return await image.png().toBuffer();
  }
}

/**
 * Get image metadata
 */
export async function getImageMetadata(inputBuffer: Buffer) {
  return await sharp(inputBuffer).metadata();
}

/**
 * Convert Buffer to ArrayBuffer (for serialization in server actions)
 */
export function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
} 