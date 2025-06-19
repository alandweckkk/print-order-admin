"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prepareLayout } from './actions/prepareLayout';

export default function StickerLayoutPage() {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('png')) {
      setError('Please select a PNG file');
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewUrl(null);
    setDownloadBlob(null);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('image', file);

      // Call server action
      const resultArrayBuffer = await prepareLayout(formData);

      // Convert ArrayBuffer to Blob
      const resultBlob = new Blob([resultArrayBuffer], { type: "image/png" });

      // Create preview URL
      const previewBlobUrl = URL.createObjectURL(resultBlob);
      setPreviewUrl(previewBlobUrl);
      setDownloadBlob(resultBlob);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'An error occurred processing the image');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!downloadBlob) return;

    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sticker-sheet-layout.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setPreviewUrl(null);
    setDownloadBlob(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sticker Sheet Layout</h1>
          <p className="text-gray-600 mt-2">Upload a PNG image to create a 3-up vertical sticker sheet that's print-ready</p>
        </div>

        <div className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload PNG Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png"
                  onChange={handleFileSelect}
                  disabled={loading}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                {(previewUrl || downloadBlob) && (
                  <Button 
                    variant="outline" 
                    onClick={resetUpload}
                    className="mt-2"
                  >
                    Upload New Image
                  </Button>
                )}
              </div>
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

          {/* Preview Section */}
          {previewUrl && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>Preview & Download</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                    <img
                      src={previewUrl}
                      alt="Sticker sheet preview"
                      className="max-w-full h-auto mx-auto shadow-lg rounded"
                      style={{ maxHeight: '600px' }}
                    />
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleDownload}
                      disabled={!downloadBlob}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      Download PNG
                    </Button>
                  </div>
                  
                  <div className="text-center text-sm text-gray-500">
                    <p>3-up vertical layout • 1200×2267px • Print-ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!previewUrl && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>How it works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">1</div>
                    <p>Upload a PNG image with transparent background</p>
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 