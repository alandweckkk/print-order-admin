"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Type, 
  Download, 
  Move, 
  RotateCcw, 
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react';

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  rotation: number;
}

export default function EnvelopePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAddingText, setIsAddingText] = useState(false);
  const [newText, setNewText] = useState('');

  // Text formatting controls
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textColor, setTextColor] = useState('#000000');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [textDecoration, setTextDecoration] = useState<'none' | 'underline'>('none');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  const fontFamilies = [
    'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia', 
    'Helvetica', 'Impact', 'Lucida Console', 'Palatino', 'Times New Roman',
    'Trebuchet MS', 'Verdana'
  ];

  // Draw canvas content
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw text elements
    textElements.forEach(element => {
      ctx.save();
      
      // Move to element position
      ctx.translate(element.x, element.y);
      
      // Apply rotation
      if (element.rotation !== 0) {
        ctx.rotate((element.rotation * Math.PI) / 180);
      }

      // Set font properties
      const fontStyle = element.fontStyle === 'italic' ? 'italic ' : '';
      const fontWeight = element.fontWeight === 'bold' ? 'bold ' : '';
      ctx.font = `${fontStyle}${fontWeight}${element.fontSize}px ${element.fontFamily}`;
      ctx.fillStyle = element.color;
      ctx.textAlign = element.textAlign;
      
      // Split text into lines
      const lines = element.text.split('\n');
      const lineHeight = element.fontSize * 1.2; // 1.2 line spacing
      
      // Calculate total text dimensions for selection box
      let maxWidth = 0;
      const lineWidths: number[] = [];
      lines.forEach(line => {
        const metrics = ctx.measureText(line);
        lineWidths.push(metrics.width);
        maxWidth = Math.max(maxWidth, metrics.width);
      });
      
      const totalHeight = lines.length * lineHeight - (lineHeight - element.fontSize);

      // Draw each line of text
      lines.forEach((line, index) => {
        const yOffset = index * lineHeight;
        
        // Handle text decoration for each line
        if (element.textDecoration === 'underline' && line.trim()) {
          const lineMetrics = ctx.measureText(line);
          ctx.beginPath();
          ctx.strokeStyle = element.color;
          ctx.lineWidth = Math.max(1, element.fontSize / 20);
          let startX = 0;
          if (element.textAlign === 'center') startX = -lineMetrics.width / 2;
          else if (element.textAlign === 'right') startX = -lineMetrics.width;
          ctx.moveTo(startX, yOffset + element.fontSize * 0.1);
          ctx.lineTo(startX + lineMetrics.width, yOffset + element.fontSize * 0.1);
          ctx.stroke();
        }

        // Draw the line
        ctx.fillText(line, 0, yOffset);
      });

      // Draw selection indicator
      if (selectedElement === element.id) {
        const padding = 4;
        let textX = 0;
        if (element.textAlign === 'center') textX = -maxWidth / 2;
        else if (element.textAlign === 'right') textX = -maxWidth;
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          textX - padding, 
          -element.fontSize - padding, 
          maxWidth + padding * 2, 
          totalHeight + padding * 2
        );
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
  }, [textElements, selectedElement]);

  // Update canvas when elements change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing text
    let clickedElement: string | null = null;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      for (let i = textElements.length - 1; i >= 0; i--) {
        const element = textElements[i];
        ctx.font = `${element.fontStyle === 'italic' ? 'italic ' : ''}${element.fontWeight === 'bold' ? 'bold ' : ''}${element.fontSize}px ${element.fontFamily}`;
        
        // Split text into lines and calculate dimensions
        const lines = element.text.split('\n');
        const lineHeight = element.fontSize * 1.2;
        
        // Calculate max width for hit detection
        let maxWidth = 0;
        lines.forEach(line => {
          const metrics = ctx.measureText(line);
          maxWidth = Math.max(maxWidth, metrics.width);
        });
        
        const totalHeight = lines.length * lineHeight - (lineHeight - element.fontSize);
        
        let textX = element.x;
        if (element.textAlign === 'center') textX = element.x - maxWidth / 2;
        else if (element.textAlign === 'right') textX = element.x - maxWidth;
        
        if (x >= textX - 4 && 
            x <= textX + maxWidth + 4 && 
            y >= element.y - element.fontSize - 4 && 
            y <= element.y + totalHeight - element.fontSize + 4) {
          clickedElement = element.id;
          break;
        }
      }
    }

    if (clickedElement) {
      setSelectedElement(clickedElement);
      const element = textElements.find(el => el.id === clickedElement);
      if (element) {
        // Update form controls with selected element's properties
        setFontSize(element.fontSize);
        setFontFamily(element.fontFamily);
        setTextColor(element.color);
        setFontWeight(element.fontWeight);
        setFontStyle(element.fontStyle);
        setTextDecoration(element.textDecoration);
        setTextAlign(element.textAlign);
      }
    } else if (isAddingText && newText.trim()) {
      // Add new text at click position
      const newElement: TextElement = {
        id: Date.now().toString(),
        text: newText,
        x,
        y,
        fontSize,
        fontFamily,
        color: textColor,
        fontWeight,
        fontStyle,
        textDecoration,
        textAlign,
        rotation: 0
      };
      setTextElements([...textElements, newElement]);
      setSelectedElement(newElement.id);
      setNewText('');
      setIsAddingText(false);
    } else {
      setSelectedElement(null);
    }
  };

  // Handle canvas mouse down for dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const element = textElements.find(el => el.id === selectedElement);
    if (element) {
      setIsDragging(true);
      setDragOffset({ x: x - element.x, y: y - element.y });
    }
  };

  // Handle mouse move for dragging
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setTextElements(elements =>
      elements.map(el =>
        el.id === selectedElement ? { ...el, x, y } : el
      )
    );
  };

  // Handle mouse up
  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Update selected element properties
  const updateSelectedElement = (updates: Partial<TextElement>) => {
    if (!selectedElement) return;
    
    setTextElements(elements =>
      elements.map(el =>
        el.id === selectedElement ? { ...el, ...updates } : el
      )
    );
  };

  // Delete selected element
  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    
    setTextElements(elements => elements.filter(el => el.id !== selectedElement));
    setSelectedElement(null);
  };

  // Download canvas as PNG
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas with white background for clean export
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      // Fill with white background
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw the main canvas content
      tempCtx.drawImage(canvas, 0, 0);
      
      // Create download link
      const link = document.createElement('a');
      link.download = 'envelope-design.png';
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    }
  };

  const selectedElementData = selectedElement ? 
    textElements.find(el => el.id === selectedElement) : null;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Envelope Designer</h1>
          <p className="text-gray-600 mt-2">Design custom text layouts on a resizable canvas</p>
        </div>

                <div className="space-y-6">
          {/* Canvas - First Row */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Canvas</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="canvas-width" className="text-sm">Size:</Label>
                  <Input
                    id="canvas-width"
                    type="number"
                    value={canvasSize.width}
                    onChange={(e) => setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                    className="w-20 h-8"
                    min="100"
                    max="2000"
                  />
                  <span className="text-sm text-gray-400">×</span>
                  <Input
                    type="number"
                    value={canvasSize.height}
                    onChange={(e) => setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                    className="w-20 h-8"
                    min="100"
                    max="2000"
                  />
                  <Button onClick={downloadCanvas} size="sm" className="ml-4">
                    <Download className="h-4 w-4 mr-2" />
                    Download PNG
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50 overflow-auto">
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="border bg-white cursor-crosshair"
                  onClick={handleCanvasClick}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  {isAddingText 
                    ? "Click on the canvas to place your text"
                    : "Click on existing text to select it, or use the 'Add Text' button to add new text"
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Controls - Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Text */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Add Text
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-text">Text Content</Label>
                  <Textarea
                    id="new-text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter your text... (Press Enter for multiple lines)"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => setIsAddingText(true)}
                  disabled={!newText.trim()}
                  className="w-full"
                >
                  Add Text to Canvas
                </Button>
              </CardContent>
            </Card>

            {/* Text Formatting */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedElementData ? `Edit: "${selectedElementData.text.substring(0, 20)}${selectedElementData.text.length > 20 ? '...' : ''}"` : 'Text Formatting'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedElementData && (
                  <div>
                    <Label>Text Content</Label>
                    <Textarea
                      value={selectedElementData.text}
                      onChange={(e) => updateSelectedElement({ text: e.target.value })}
                      rows={2}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="font-size">Font Size</Label>
                  <Input
                    id="font-size"
                    type="number"
                    value={fontSize}
                    onChange={(e) => {
                      const size = parseInt(e.target.value) || 12;
                      setFontSize(size);
                      if (selectedElement) updateSelectedElement({ fontSize: size });
                    }}
                    min="8"
                    max="200"
                  />
                </div>

                <div>
                  <Label htmlFor="font-family">Font Family</Label>
                  <select
                    id="font-family"
                    value={fontFamily}
                    onChange={(e) => {
                      setFontFamily(e.target.value);
                      if (selectedElement) updateSelectedElement({ fontFamily: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {fontFamilies.map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="text-color">Text Color</Label>
                  <Input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      if (selectedElement) updateSelectedElement({ color: e.target.value });
                    }}
                  />
                </div>

                {/* Text Style Buttons */}
                <div className="space-y-3">
                  <Label>Text Style</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={fontWeight === 'bold' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
                        setFontWeight(newWeight);
                        if (selectedElement) updateSelectedElement({ fontWeight: newWeight });
                      }}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={fontStyle === 'italic' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
                        setFontStyle(newStyle);
                        if (selectedElement) updateSelectedElement({ fontStyle: newStyle });
                      }}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={textDecoration === 'underline' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newDecoration = textDecoration === 'underline' ? 'none' : 'underline';
                        setTextDecoration(newDecoration);
                        if (selectedElement) updateSelectedElement({ textDecoration: newDecoration });
                      }}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Text Alignment */}
                <div className="space-y-3">
                  <Label>Text Alignment</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTextAlign('left');
                        if (selectedElement) updateSelectedElement({ textAlign: 'left' });
                      }}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTextAlign('center');
                        if (selectedElement) updateSelectedElement({ textAlign: 'center' });
                      }}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTextAlign('right');
                        if (selectedElement) updateSelectedElement({ textAlign: 'right' });
                      }}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedElementData && (
                  <>
                    <div>
                      <Label htmlFor="rotation">Rotation (degrees)</Label>
                      <Input
                        id="rotation"
                        type="number"
                        value={selectedElementData.rotation}
                        onChange={(e) => updateSelectedElement({ rotation: parseInt(e.target.value) || 0 })}
                        min="-360"
                        max="360"
                      />
                    </div>

                    <Button
                      variant="destructive"
                      onClick={deleteSelectedElement}
                      className="w-full"
                    >
                      Delete Selected Text
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Instructions - Third Row */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>1. Enter text (use Enter for multiple lines) and click "Add Text to Canvas"</p>
                <p>2. Click where you want to place the text</p>
                <p>3. Select text to edit formatting or drag to move</p>
                <p>4. Edit selected text content to add/remove line breaks</p>
                <p>5. Adjust canvas size as needed</p>
                <p>6. Download your design as PNG</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
