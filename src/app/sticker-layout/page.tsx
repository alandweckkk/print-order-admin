"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'lucide-react';

export default function StickerLayoutPage() {
  const [loading, setLoading] = useState(false);
  const [inputImageUrl, setInputImageUrl] = useState<string | null>(null);
  const [outputImageUrl, setOutputImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  const processImageUrl = async (imageUrl: string) => {
    setLoading(true);
    setError(null);
    setInputImageUrl(null);
    setOutputImageUrl(null);

    try {
      // Call API route with URL
      const response = await fetch('/api/create-sticker-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process image');
      }

      // Set the input and output URLs
      setInputImageUrl(result.inputImageUrl);
      setOutputImageUrl(result.outputImageUrl);

      console.log('✅ Image processed and saved to blob storage:', result.outputImageUrl);
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
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sticker Sheet Layout</h1>
          <p className="text-gray-600 mt-2">Enter an image URL to create a 3-up vertical sticker sheet that's print-ready</p>
        </div>

        <div className="space-y-6">
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
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter image address URL"
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
                    Create Sticker Sheet
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Enter a direct URL to an image (must be publicly accessible)
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
                  <p className="text-sm text-gray-500 mt-1">Creating 3-up sticker sheet layout</p>
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
                        alt="Generated sticker sheet - 3-up vertical layout"
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
                      ✅ 3-up vertical layout • 1200×2267px • Print-ready
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
                    <p>Resized to 600px height while maintaining aspect ratio</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">4</div>
                    <p>Placed 3 times on a 1200×2267px white canvas for printing</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">5</div>
                    <p>You'll receive URLs for both the input and output images</p>
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