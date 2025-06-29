"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from 'lucide-react';

interface AddressData {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export default function EnvelopesPage() {
  const [addressData, setAddressData] = useState<AddressData>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  });

  const [showEnvelope, setShowEnvelope] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof AddressData, value: string) => {
    setAddressData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
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
  };

  const resetForm = () => {
    setAddressData({
      name: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    });
    setShowEnvelope(false);
    setError(null);
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Envelopes</h1>
          <p className="text-gray-600 mt-2">Create addressed envelopes for mail orders</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Address Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Recipient Address
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Envelope Preview */}
          {showEnvelope && (
            <Card>
              <CardHeader>
                <CardTitle>Envelope Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-auto">
                  {/* Envelope Canvas */}
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
                        left: '17px',   // Scaled down from 50px
                        top: '17px',    // Scaled down from 50px
                        fontSize: '10px'
                      }}
                    >
                      <div className="font-medium">MakeMeASticker</div>
                      <div>125 Cervantes Blvd</div>
                      <div>San Francisco, CA 94123</div>
                    </div>

                    {/* Recipient Address - Center */}
                    <div 
                      className="absolute text-gray-900 leading-relaxed"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '14px',
                        textAlign: 'center'
                      }}
                    >
                      {formatRecipientAddress().map((line, index) => (
                        <div key={index} className={index === 0 ? 'font-medium' : ''}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Canvas Info */}
                  <div className="mt-4 text-sm text-gray-500 text-center">
                    <p>Preview scaled to fit (actual size: 2100×1500px)</p>
                    <p className="mt-1">✅ Ready for printing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

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
                  <p>Click &quot;Save Address&quot; to generate the envelope</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">3</div>
                  <p>The envelope will show the return address (top-left) and recipient address (center)</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">4</div>
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