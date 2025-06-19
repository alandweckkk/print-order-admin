"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prepareLayout } from './actions/prepareLayout';
import { Upload, Link, FolderOpen } from 'lucide-react';

type InputMethod = 'file' | 'url' | 'drop';

export default function StickerLayoutPage() {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<InputMethod>('drop');
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setPreviewUrl(null);
    setDownloadBlob(null);

    try {
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

  const handleFileProcess = async (file: File) => {
    // Validate file type
    if (!file.type.includes('png')) {
      setError('Please select a PNG file');
      return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('image', file);
    
    await processImage(formData);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFileProcess(file);
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

    // Prepare form data with URL
    const formData = new FormData();
    formData.append('imageUrl', imageUrl);
    
    await processImage(formData);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      await handleFileProcess(file);
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
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sticker Sheet Layout</h1>
          <p className="text-gray-600 mt-2">Upload a PNG image to create a 3-up vertical sticker sheet that's print-ready</p>
        </div>

        <div className="space-y-6">
          {/* Input Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Upload Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-6">
                <Button
                  variant={inputMethod === 'drop' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('drop')}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Drop Zone
                </Button>
                <Button
                  variant={inputMethod === 'file' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('file')}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  File Upload
                </Button>
                <Button
                  variant={inputMethod === 'url' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('url')}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Link className="h-4 w-4" />
                  Image URL
                </Button>
              </div>

              {/* Drop Zone Section */}
              {inputMethod === 'drop' && (
                <div 
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  } ${loading ? 'pointer-events-none opacity-50' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${
                    isDragging ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">
                      {isDragging ? 'Drop your PNG file here' : 'Drop items here'}
                    </p>
                    <p className="text-gray-500">or</p>
                    <Button
                      variant="outline"
                      onClick={triggerFileSelect}
                      disabled={loading}
                      className="text-gray-700"
                    >
                      Browse Files
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    PNG files only • Max 5MB
                  </p>
                </div>
              )}

              {/* File Upload Section */}
              {inputMethod === 'file' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={triggerFileSelect}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Choose PNG File
                    </Button>
                    <span className="text-sm text-gray-500">
                      PNG files only • Max 5MB
                    </span>
                  </div>
                </div>
              )}

              {/* URL Input Section */}
              {inputMethod === 'url' && (
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
                      + Add
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Enter a direct URL to a PNG image (must be publicly accessible)
                  </p>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                onChange={handleFileSelect}
                disabled={loading}
                className="hidden"
              />

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mt-4">
                  {error}
                </div>
              )}

              {(previewUrl || downloadBlob) && (
                <Button 
                  variant="outline" 
                  onClick={resetUpload}
                  className="mt-4"
                >
                  Upload New Image
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

          {/* Preview Section */}
          {previewUrl && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>Preview & Download</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Preview Container with Annotations */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white relative">
                    <img
                      src={previewUrl}
                      alt="Sticker sheet preview"
                      className="max-w-full h-auto mx-auto shadow-lg rounded"
                      style={{ maxHeight: '600px' }}
                    />
                    
                    {/* Annotations Overlay */}
                    <div className="absolute top-6 left-6 space-y-1 text-xs bg-white/90 p-3 rounded-lg shadow-sm border border-gray-200">
                      <div className="font-semibold text-gray-900 mb-2">Layout Specifications:</div>
                      <div className="text-gray-700">• Canvas: 1200×2267px</div>
                      <div className="text-gray-600">• Top margin: 134px</div>
                      <div className="text-blue-700">• Image height: 600px each</div>
                      <div className="text-gray-600">• Gap between images: 100px</div>
                      <div className="text-gray-600">• Bottom margin: 133px</div>
                      <div className="text-green-700 font-medium mt-2">✓ Print-ready • 3-up vertical layout</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleDownload}
                      disabled={!downloadBlob}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      Download Clean PNG
                    </Button>
                  </div>
                  
                  <div className="text-center text-sm text-gray-500">
                    <p>Downloaded image will be clean without annotations • Perfect for printing</p>
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
                    <p>Upload a PNG file, provide a URL, or drag & drop your image</p>
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