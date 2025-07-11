"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, Upload, X } from 'lucide-react';
import { uploadFileToBlob } from './actions/process-image-url-to-blob';

export default function StickerLayoutPage() {
  const [loading, setLoading] = useState(false);
  const [inputImageUrl, setInputImageUrl] = useState<string | null>(null);
  const [outputImageUrl, setOutputImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [layout, setLayout] = useState<'2-up' | '3-up'>('3-up');
  const [resultLayout, setResultLayout] = useState<'2-up' | '3-up'>('3-up');
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const processImageUrl = async (imageUrl: string) => {
    setLoading(true);
    setError(null);
    setInputImageUrl(null);
    setOutputImageUrl(null);

    try {
      // Call API route with URL and layout
      const response = await fetch('/api/create-sticker-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl, layout }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process image');
      }

      // Set the input and output URLs
      setInputImageUrl(result.inputImageUrl);
      setOutputImageUrl(result.outputImageUrl);
      setResultLayout(result.layout || layout);

      console.log(`✅ ${result.layout || layout} image processed and saved to blob storage:`, result.outputImageUrl);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'An error occurred processing the image');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) {
      setError('Please enter a valid image URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    await processImageUrl(imageUrl);
  };

  const resetForm = () => {
    setInputImageUrl(null);
    setOutputImageUrl(null);
    setError(null);
    setImageUrl('');
    setPreviewImage(null);
    setUploadLoading(false);
  };

  // File handling functions
  const handleFileToBlob = useCallback(async (file: File) => {
    setUploadLoading(true);
    setError(null);

    try {
      // Upload file to Vercel Blob storage
      const result = await uploadFileToBlob(file);

      if (!result.success) {
        setError(result.error || 'Failed to upload file');
        return;
      }

      // Set the public blob URL in the input field
      setImageUrl(result.blobUrl!);
      setPreviewImage(result.blobUrl!);

      console.log('✅ File uploaded to blob storage:', result.blobUrl);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileToBlob(files[0]);
    }
  }, [handleFileToBlob]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileToBlob(files[0]);
    }
  }, [handleFileToBlob]);

  const clearPreview = () => {
    setPreviewImage(null);
    setImageUrl('');
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sticker Sheet Layout</h1>
          <p className="text-gray-600 mt-2">Drop an image or enter an image URL to create a {layout} vertical sticker sheet that&apos;s print-ready</p>
        </div>

        <div className="space-y-6">
          {/* Drop Zone Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Drop Image File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${loading || uploadLoading ? 'opacity-50 pointer-events-none' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {uploadLoading ? (
                  <div className="space-y-4">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Uploading image...
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Please wait while we upload your file
                      </p>
                    </div>
                  </div>
                ) : previewImage ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                      />
                      <button
                        onClick={clearPreview}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors"
                        disabled={loading || uploadLoading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-green-600">
                      ✅ Image uploaded and ready! Click &quot;Create {layout} Sheet&quot; below to process.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Drop your image here
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports PNG, JPG, GIF, and other image formats
                      </p>
                    </div>
                    <div>
                      <label htmlFor="file-input">
                        <Button variant="outline" className="cursor-pointer" disabled={loading || uploadLoading}>
                          Browse Files
                        </Button>
                      </label>
                      <input
                        id="file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={loading || uploadLoading}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* URL Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Image URL Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Layout Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Layout Options</h4>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="layout"
                        value="3-up"
                        checked={layout === '3-up'}
                        onChange={(e) => setLayout(e.target.value as '3-up')}
                        disabled={loading}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>3-up</strong> (630px height)
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="layout"
                        value="2-up"
                        checked={layout === '2-up'}
                        onChange={(e) => setLayout(e.target.value as '2-up')}
                        disabled={loading}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>2-up</strong> (950px height)
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    {layout === '3-up' 
                      ? '3 stickers per sheet • 630px height • Standard size'
                      : '2 stickers per sheet • 950px height • 50% larger stickers'
                    }
                  </p>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter image address URL or drop an image above"
                    disabled={loading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <Button
                    onClick={handleUrlSubmit}
                    disabled={loading || !imageUrl.trim()}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6"
                  >
                    Create {layout} Sheet
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Enter a direct URL to an image (must be publicly accessible) or drop an image file above
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mt-4">
                  {error}
                </div>
              )}

              {(inputImageUrl || outputImageUrl) && (
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                  className="mt-4"
                >
                  Process New Image
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Processing your image...</p>
                  <p className="text-sm text-gray-500 mt-1">Creating {layout} sticker sheet layout</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {inputImageUrl && outputImageUrl && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>Sticker Sheet Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Input Image */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Input Image URL:</h3>
                    <div className="bg-gray-50 p-3 rounded-md border mb-3">
                      <a 
                        href={inputImageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm break-all"
                      >
                        {inputImageUrl}
                      </a>
                    </div>
                    
                    {/* Display the input image */}
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <img
                        src={inputImageUrl}
                        alt="Input image"
                        className="max-w-full h-auto mx-auto rounded"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  </div>

                  {/* Output Sticker Sheet */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Output Sticker Sheet:</h3>
                    
                    {/* Display the sticker sheet image */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white mb-4">
                      <img
                        src={outputImageUrl}
                        alt={`Generated sticker sheet - ${resultLayout} vertical layout`}
                        className="max-w-full h-auto mx-auto shadow-lg rounded"
                        style={{ maxHeight: '600px' }}
                      />
                    </div>

                    {/* URL and Copy Button */}
                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <div className="flex items-center justify-between gap-3">
                        <a 
                          href={outputImageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-green-700 hover:underline text-sm break-all font-mono flex-1 min-w-0"
                        >
                          {outputImageUrl}
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(outputImageUrl);
                          }}
                          className="border-green-300 text-green-700 hover:bg-green-100 flex-shrink-0"
                        >
                          Copy URL
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ✅ {resultLayout} vertical layout • 1200×2267px • {resultLayout === '2-up' ? '950px' : '630px'} sticker height • Print-ready
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!inputImageUrl && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>How it works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">1</div>
                    <p>Enter a direct URL to your image</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">2</div>
                    <p>The image will be auto-cropped to remove transparent areas</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">3</div>
                    <p>Resized to {layout === '2-up' ? '950px' : '630px'} height while maintaining aspect ratio</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">4</div>
                    <p>Placed {layout === '2-up' ? '2' : '3'} times on a 1200×2267px white canvas for printing</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">5</div>
                    <p>You&apos;ll receive URLs for both the input and output images</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 