"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ActiveBatchPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[3000px] mx-auto">
        <div className="mb-8">
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Batch</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p>Loading batch...</p>
              </div>
            ) : (
              <div className="text-center py-16">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">No Active Batch</h2>
                <p className="text-gray-500 mb-6">Create a batch from the Orders page to get started.</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // TODO: Navigate back to orders page
                    window.history.back();
                  }}
                >
                  Go to Orders
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 