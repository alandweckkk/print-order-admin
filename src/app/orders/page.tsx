"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PhysicalMailOrder {
  id: string;
  payment_intent_id: string;
  user_id: string;
  model_run_id: string;
  status: string;
  amount: number;
  currency: string;
  shipping_address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  email: string;
  tracking_number?: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  delivered_at?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<PhysicalMailOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 100;

  // Mock data that mirrors the structure from Supabase
  const mockOrders: PhysicalMailOrder[] = Array.from({ length: 250 }, (_, index) => ({
    id: `order-${index + 1}`,
    payment_intent_id: `pi_3RbCX1GLD4chrmhB0buYDV${index.toString().padStart(2, '0')}`,
    user_id: `user-${index + 1}`,
    model_run_id: `model-${index + 1}`,
    status: ['confirmed', 'processing', 'shipped', 'delivered'][index % 4],
    amount: 799,
    currency: 'usd',
    shipping_address: {
      name: [
        'Jillian Kresal',
        'Vi Gill', 
        'Joanna Burns',
        'Shantay Hageman',
        'Gema Disz',
        'Sarah Johnson',
        'Mike Chen',
        'Lisa Rodriguez'
      ][index % 8],
      line1: `${1000 + index} Main Street`,
      line2: index % 3 === 0 ? `Apt ${index}` : undefined,
      city: ['Menasha', 'Bakersfield', 'Clovis', 'Dallas', 'Fullerton', 'Austin', 'Seattle', 'Denver'][index % 8],
      state: ['WI', 'CA', 'CA', 'GA', 'CA', 'TX', 'WA', 'CO'][index % 8],
      country: 'US',
      postal_code: `${54000 + index}`
    },
    items: [{
      name: '3x Premium Stickers',
      price: 799,
      quantity: 3
    }],
    email: `customer${index + 1}@example.com`,
    tracking_number: index % 2 === 0 ? `1Z999AA1${index.toString().padStart(10, '0')}` : undefined,
    order_number: `MM-${(100000 + index).toString()}`,
    created_at: new Date(Date.now() - (index * 3600000)).toISOString(),
    updated_at: new Date(Date.now() - (index * 3600000)).toISOString(),
    shipped_at: index % 2 === 0 ? new Date(Date.now() - (index * 1800000)).toISOString() : undefined,
    delivered_at: index % 4 === 0 ? new Date(Date.now() - (index * 900000)).toISOString() : undefined
  }));

  useEffect(() => {
    // Simulate API call
    const fetchOrders = async () => {
      setLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const startIndex = (currentPage - 1) * ordersPerPage;
      const endIndex = startIndex + ordersPerPage;
      const pageOrders = mockOrders.slice(startIndex, endIndex);
      
      setOrders(pageOrders);
      setTotalOrders(mockOrders.length);
      setLoading(false);
    };

    fetchOrders();
  }, [currentPage]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalOrders / ordersPerPage);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Physical Mail Orders</h1>
          <p className="text-gray-600">Manage and track all physical mail sticker orders</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Orders ({totalOrders.toLocaleString()})</CardTitle>
              <CardDescription>
                Showing {((currentPage - 1) * ordersPerPage) + 1}-{Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders.toLocaleString()} orders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p>Loading orders...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Order #</th>
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Address</th>
                      <th className="text-left p-3 font-medium">Tracking</th>
                      <th className="text-left p-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-mono text-sm">{order.order_number}</div>
                          <div className="text-xs text-gray-500">{order.id.substring(0, 8)}...</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{order.shipping_address.name}</div>
                          <div className="text-sm text-gray-500">{order.email}</div>
                        </td>
                        <td className="p-3">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{formatCurrency(order.amount)}</div>
                          <div className="text-xs text-gray-500">{order.items[0].name}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {order.shipping_address.city}, {order.shipping_address.state}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.shipping_address.postal_code}
                          </div>
                        </td>
                        <td className="p-3">
                          {order.tracking_number ? (
                            <div className="font-mono text-xs">{order.tracking_number}</div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{formatDate(order.created_at)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Footer */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-2 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
