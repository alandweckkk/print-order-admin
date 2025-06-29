"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Download, Settings } from 'lucide-react';

interface AddressData {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface FormattingOptions {
  returnAddress: {
    fontSize: number;
    lineHeight: number;
    topDistance: number;
    leftDistance: number;
  };
  receiverAddress: {
    fontSize: number;
    lineHeight: number;
  };
}

export default function EnvelopesPage() {
  const [addressData, setAddressData] = useState<AddressData>({
    name: 'Angela Blaesi',
    line1: '908 N Bryan Ave',
    line2: '',
    city: 'North Platte',
    state: 'NE',
    postal_code: '69101',
    country: 'US'
  });

  const [formatting, setFormatting] = useState<FormattingOptions>({
    returnAddress: {
      fontSize: 40,
      lineHeight: 60,
      topDistance: 90,
      leftDistance: 80
    },
    receiverAddress: {
      fontSize: 70,
      lineHeight: 94
    }
  });

  const [showEnvelope, setShowEnvelope] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFormatting, setShowFormatting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleInputChange = (field: keyof AddressData, value: string) => {
    setAddressData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleFormattingChange = (
    section: 'returnAddress' | 'receiverAddress',
    field: string,
    value: number
  ) => {
    setFormatting(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Redraw canvas if envelope is showing
    if (showEnvelope) {
      setTimeout(() => {
        drawEnvelopeToCanvas();
      }, 10);
    }
  };

  const handleSaveAddress = () => {
    // Validate required fields
    if (!addressData.name.trim()) {
      setError('Full Name is required');
      return;
    }
    if (!addressData.line1.trim()) {
      setError('Address Line 1 is required');
      return;
    }
    if (!addressData.city.trim()) {
      setError('City is required');
      return;
    }
    if (!addressData.state.trim()) {
      setError('State is required');
      return;
    }
    if (!addressData.postal_code.trim()) {
      setError('ZIP Code is required');
      return;
    }

    setError(null);
    setShowEnvelope(true);
    // Small delay to ensure canvas is rendered
    setTimeout(() => {
      drawEnvelopeToCanvas();
    }, 100);
  };

  const resetForm = () => {
    setAddressData({
      name: 'Angela Blaesi',
      line1: '908 N Bryan Ave',
      line2: '',
      city: 'North Platte',
      state: 'NE',
      postal_code: '69101',
      country: 'US'
    });
    setShowEnvelope(false);
    setError(null);
  };

  const drawEnvelopeToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to actual print dimensions
    canvas.width = 2100;
    canvas.height = 1500;

    // Clear canvas and set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Note: Border removed from download - only shown in preview

    // Return address (top-left)
    ctx.fillStyle = '#374151';
    ctx.font = `${formatting.returnAddress.fontSize}px Arial, sans-serif`;
    ctx.fillText('MakeMeASticker', formatting.returnAddress.leftDistance, formatting.returnAddress.topDistance);
    ctx.fillText('125 Cervantes Blvd', formatting.returnAddress.leftDistance, formatting.returnAddress.topDistance + formatting.returnAddress.lineHeight);
    ctx.fillText('San Francisco, CA 94123', formatting.returnAddress.leftDistance, formatting.returnAddress.topDistance + (formatting.returnAddress.lineHeight * 2));

    // Recipient address (center + 20px down)
    const recipientLines = formatRecipientAddress();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 20; // Push down 20px
    const startY = centerY - (recipientLines.length * formatting.receiverAddress.lineHeight) / 2;

    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';

    recipientLines.forEach((line, index) => {
      ctx.font = `${formatting.receiverAddress.fontSize}px Arial, sans-serif`;
      ctx.fillText(line, centerX, startY + (index * formatting.receiverAddress.lineHeight));
    });

    // Reset text align
    ctx.textAlign = 'left';
  };

  const downloadEnvelope = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `envelope-${addressData.name.replace(/\s+/g, '-').toLowerCase()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading envelope:', error);
      alert('Error downloading envelope. Please try again.');
    }
  };

  // Format the recipient address for display
  const formatRecipientAddress = () => {
    const lines = [];
    
    // Line 1: Full Name
    if (addressData.name.trim()) {
      lines.push(addressData.name.trim());
    }
    
    // Line 2: Address Line 1 + Address Line 2 (if present)
    let addressLine = addressData.line1.trim();
    if (addressData.line2.trim()) {
      addressLine += ` ${addressData.line2.trim()}`;
    }
    if (addressLine) {
      lines.push(addressLine);
    }
    
    // Line 3: City, State, ZIP
    const cityStateZip = [
      addressData.city.trim(),
      addressData.state.trim(),
      addressData.postal_code.trim()
    ].filter(Boolean).join(', ');
    
    if (cityStateZip) {
      lines.push(cityStateZip);
    }
    
    return lines;
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Envelopes</h1>
          <p className="text-gray-600 mt-2">Create addressed envelopes for mail orders</p>
        </div>

        {/* Address Form - Now on top */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recipient Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={addressData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <Label htmlFor="line1">Address Line 1 *</Label>
                  <Input
                    id="line1"
                    value={addressData.line1}
                    onChange={(e) => handleInputChange('line1', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                
                <div>
                  <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                  <Input
                    id="line2"
                    value={addressData.line2}
                    onChange={(e) => handleInputChange('line2', e.target.value)}
                    placeholder="Apt 4B, Suite 200, etc."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={addressData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="New York"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={addressData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="CA"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postal_code">ZIP Code *</Label>
                    <Input
                      id="postal_code"
                      value={addressData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      placeholder="10001"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={addressData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="US"
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleSaveAddress}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Save Address
                  </Button>
                  
                  {showEnvelope && (
                    <Button 
                      variant="outline"
                      onClick={resetForm}
                    >
                      Reset Form
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formatting Controls */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Formatting Controls
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowFormatting(!showFormatting)}
              >
                {showFormatting ? 'Hide' : 'Show'} Controls
              </Button>
            </div>
          </CardHeader>
          {showFormatting && (
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Return Address Controls */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Return Address</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Font Size (px)</Label>
                                                 <Input
                           type="number"
                           value={formatting.returnAddress.fontSize}
                           onChange={(e) => handleFormattingChange('returnAddress', 'fontSize', parseInt(e.target.value) || 40)}
                           min="10"
                           max="100"
                         />
                      </div>
                      <div>
                        <Label>Line Height (px)</Label>
                        <Input
                          type="number"
                          value={formatting.returnAddress.lineHeight}
                          onChange={(e) => handleFormattingChange('returnAddress', 'lineHeight', parseInt(e.target.value) || 60)}
                          min="10"
                          max="150"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Distance from Top (px)</Label>
                                                 <Input
                           type="number"
                           value={formatting.returnAddress.topDistance}
                           onChange={(e) => handleFormattingChange('returnAddress', 'topDistance', parseInt(e.target.value) || 90)}
                           min="50"
                           max="500"
                         />
                      </div>
                      <div>
                        <Label>Distance from Left (px)</Label>
                                                 <Input
                           type="number"
                           value={formatting.returnAddress.leftDistance}
                           onChange={(e) => handleFormattingChange('returnAddress', 'leftDistance', parseInt(e.target.value) || 80)}
                           min="50"
                           max="500"
                         />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Receiver Address Controls */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Receiver Address</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Font Size (px)</Label>
                                                 <Input
                           type="number"
                           value={formatting.receiverAddress.fontSize}
                           onChange={(e) => handleFormattingChange('receiverAddress', 'fontSize', parseInt(e.target.value) || 70)}
                           min="10"
                           max="100"
                         />
                      </div>
                      <div>
                        <Label>Line Height (px)</Label>
                                                 <Input
                           type="number"
                           value={formatting.receiverAddress.lineHeight}
                           onChange={(e) => handleFormattingChange('receiverAddress', 'lineHeight', parseInt(e.target.value) || 94)}
                           min="10"
                           max="150"
                         />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Envelope Preview - Now below the form */}
        {showEnvelope && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Envelope Preview</CardTitle>
                <Button 
                  onClick={downloadEnvelope}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Envelope
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-auto">
                {/* Envelope Visual Preview */}
                <div 
                  className="relative bg-white border-2 border-gray-300 mx-auto"
                  style={{
                    width: '700px',  // Scaled down from 2100px for display
                    height: '500px', // Scaled down from 1500px for display
                    fontSize: '12px' // Scaled down font
                  }}
                >
                  {/* Return Address - Top Left */}
                  <div 
                    className="absolute text-gray-700 leading-tight"
                    style={{
                      left: `${formatting.returnAddress.leftDistance / 3}px`,   
                      top: `${formatting.returnAddress.topDistance / 3}px`,    
                      fontSize: `${formatting.returnAddress.fontSize / 3}px`,
                      lineHeight: `${formatting.returnAddress.lineHeight / 3}px`
                    }}
                  >
                    <div>MakeMeASticker</div>
                    <div>125 Cervantes Blvd</div>
                    <div>San Francisco, CA 94123</div>
                  </div>

                  {/* Recipient Address - Center */}
                  <div 
                    className="absolute text-gray-900"
                    style={{
                      left: '50%',
                      top: 'calc(50% + 7px)', // Push down 20px scaled to preview (20/3 ≈ 7px)
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${formatting.receiverAddress.fontSize / 3}px`,
                      textAlign: 'center',
                      lineHeight: `${formatting.receiverAddress.lineHeight / 3}px`
                    }}
                  >
                    {formatRecipientAddress().map((line, index) => (
                      <div key={index}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Hidden Canvas for Download */}
                <canvas 
                  ref={canvasRef}
                  style={{ display: 'none' }}
                  width={2100}
                  height={1500}
                />
                
                {/* Canvas Info */}
                <div className="mt-4 text-sm text-gray-500 text-center">
                  <p>Preview scaled to fit (actual size: 2100×1500px)</p>
                  <p className="mt-1">✅ Ready for printing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!showEnvelope && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How to use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">1</div>
                  <p>Fill out the recipient address form with all required fields</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">2</div>
                  <p>Use the formatting controls to adjust font sizes and positioning</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">3</div>
                  <p>Click &quot;Save Address&quot; to generate the envelope</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">4</div>
                  <p>Click &quot;Download Envelope&quot; to save as a high-resolution PNG image</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">5</div>
                  <p>Full-size envelope canvas is 2100×1500px, optimized for printing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 