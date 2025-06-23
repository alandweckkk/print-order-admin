"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, RefreshCw, Edit, Filter, FilterX } from 'lucide-react';
import { PhysicalMailOrder } from './actions/fetch-physical-mail-orders';
import { updateShippingAddress } from './actions/update-shipping-address';

interface TransformedOrder {
  id: string;
  current: PhysicalMailOrder['shipping_address'];
  transformed?: PhysicalMailOrder['shipping_address'];
  approved?: boolean;
  needsChange?: boolean;
  explanation?: string;
  updating?: boolean;
}

interface AddressCleanupClientProps {
  initialOrders: TransformedOrder[];
}

export default function AddressCleanupClient({ initialOrders }: AddressCleanupClientProps) {
  const [orders, setOrders] = useState<TransformedOrder[]>(initialOrders);
  const [appliedChanges, setAppliedChanges] = useState(0);
  
  // Modal state for editing
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<TransformedOrder | null>(null);
  const [editForm, setEditForm] = useState<PhysicalMailOrder['shipping_address'] | null>(null);
  
  // Filter state
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);

  const handleApprove = async (orderId: string) => {
    // Find the order to get the transformed data
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.transformed) {
      console.error('No transformed data found for order:', orderId);
      return;
    }

    // Set updating state
    setOrders(prev => prev.map(o => 
      o.id === orderId 
        ? { ...o, updating: true }
        : o
    ));

    try {
      // Call server action to update Supabase with the transformed JSONB
      const result = await updateShippingAddress(orderId, order.transformed);

      if (result.success) {
        // Successfully updated in database - mark as approved
        setOrders(prev => prev.map(o => 
          o.id === orderId 
            ? { ...o, approved: true, updating: false }
            : o
        ));
        setAppliedChanges(prev => prev + 1);
        console.log(`✅ ${result.message}`);
      } else {
        // Database update failed - show error
        console.error('Failed to update shipping address:', result.error);
        setOrders(prev => prev.map(o => 
          o.id === orderId 
            ? { ...o, updating: false }
            : o
        ));
        alert(`Failed to update record: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving change:', error);
      setOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, updating: false }
          : o
      ));
      alert('An unexpected error occurred while updating the record.');
    }
  };

  const handleReject = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, approved: false, transformed: undefined, needsChange: false }
        : order
    ));
  };

  const handleEdit = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    setEditingOrder(order);
    setEditForm(order.transformed || order.current);
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingOrder || !editForm) return;
    
    setOrders(prev => prev.map(order => 
      order.id === editingOrder.id 
        ? { 
            ...order, 
            transformed: editForm,
            needsChange: true,
            approved: false,
            explanation: '• Manually edited'
          }
        : order
    ));
    
    setEditModalOpen(false);
    setEditingOrder(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditModalOpen(false);
    setEditingOrder(null);
    setEditForm(null);
  };

  const getDisplayedOrders = () => {
    if (showOnlyNeedsReview) {
      return orders.filter(order => order.needsChange && !order.approved);
    }
    return orders;
  };

  const displayedOrders = getDisplayedOrders();

  const formatJsonb = (address: PhysicalMailOrder['shipping_address']) => {
    return (
      <pre className="text-xs bg-gray-50 p-3 rounded border font-mono overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(address, null, 2)}
      </pre>
    );
  };

  const getStateDisplayInfo = (state: string) => {
    const hasLeadingTrailingSpace = state !== state.trim();
    const isLowercase = state !== state.toUpperCase();
    const isFullName = state.length > 2;
    const isMixedCase = state !== state.toLowerCase() && state !== state.toUpperCase();
    
    const issues = [];
    if (hasLeadingTrailingSpace) issues.push('trailing space');
    if (isLowercase && !isMixedCase) issues.push('lowercase');
    if (isMixedCase) issues.push('mixed case');
    if (isFullName) issues.push('full name');
    
    return {
      hasIssues: issues.length > 0,
      issues,
      state: state
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Address Cleanup</h1>
            <p className="text-gray-600 mt-2">
              Review and approve transformations for {orders.length} shipping addresses.
              {orders.filter(o => o.needsChange).length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  {orders.filter(o => o.needsChange).length} records need changes
                </span>
              )}
              {appliedChanges > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  • {appliedChanges} changes approved
                </span>
              )}
              {showOnlyNeedsReview && (
                <span className="ml-2 text-orange-600 font-medium">
                  • Showing {displayedOrders.length} of {orders.length} records
                </span>
              )}
            </p>
          </div>
          
          <Button
            variant={showOnlyNeedsReview ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyNeedsReview(!showOnlyNeedsReview)}
            className={showOnlyNeedsReview 
              ? "bg-orange-600 hover:bg-orange-700 text-white" 
              : "border-orange-300 text-orange-700 hover:bg-orange-50"
            }
          >
            {showOnlyNeedsReview ? (
              <>
                <FilterX className="h-4 w-4 mr-2" />
                Show All
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-2" />
                Need Review Only
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-orange-600">⚠️</div>
          <div>
            <h3 className="font-medium text-orange-800">Instructions</h3>
            <p className="text-orange-700 text-sm mt-1">
              Transformation rules have been applied automatically. The &quot;Transformed JSONB&quot; column shows 
              proposed changes for records that need updates. Click ✓ to WRITE the transformed JSONB 
              to Supabase immediately. Use &quot;Need Review Only&quot; to focus on records requiring attention.
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-72">
                  Record ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                  Current JSONB
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                  Transformed JSONB
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                  Explanation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    {showOnlyNeedsReview ? (
                      <div>
                        <Filter className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No records need review</p>
                        <p className="text-sm">All changes have been approved or no changes were needed.</p>
                      </div>
                    ) : (
                      <p>No records found</p>
                    )}
                  </td>
                </tr>
              ) : (
                displayedOrders.map((order) => {
                  const stateInfo = getStateDisplayInfo(order.current.state);
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div 
                          className="text-[10px] text-gray-700 font-mono bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100 select-all"
                          title="Click to select all for copying"
                        >
                          {order.id}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          {formatJsonb(order.current)}
                          {stateInfo.hasIssues && (
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                State: &quot;{order.current.state}&quot;
                              </Badge>
                              {stateInfo.issues.map(issue => (
                                <Badge key={issue} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {order.transformed ? (
                          <div className="space-y-2">
                            {formatJsonb(order.transformed)}
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Ready for review
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">
                            {order.needsChange ? 'Transformation pending...' : 'No changes needed'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {order.explanation ? (
                          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border whitespace-pre-line">
                            {order.explanation}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">
                            {order.transformed ? 'Changes applied' : 'No changes'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {order.updating ? (
                          <div className="flex items-center gap-2 text-blue-600">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Updating...</span>
                          </div>
                        ) : order.approved ? (
                          <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                            ✓ Applied to DB
                          </Badge>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleEdit(order.id)}
                              disabled={order.updating}
                              title="Edit manually"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {order.transformed && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => handleApprove(order.id)}
                                  disabled={order.updating}
                                  title="Apply to database"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleReject(order.id)}
                                  disabled={order.updating}
                                  title="Reject changes"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 text-sm text-gray-500">
        <p>
          💡 <strong>Applied Rules:</strong> Trimmed spaces, State standardization (CA, TX, OH, etc.), 
          Camel Case names/cities/addresses, Apartment formatting, Country uppercase. 
          <strong>Clicking ✓ immediately writes the transformed JSONB to the database!</strong>
        </p>
      </div>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
            <DialogDescription>
              Manual edit for record {editingOrder?.id.slice(0, 8)}... 
              Changes will appear in the Transformed JSONB column.
            </DialogDescription>
          </DialogHeader>
          
          {editForm && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
                />
              </div>
              
              <div>
                <Label htmlFor="line1">Address Line 1</Label>
                <Input
                  id="line1"
                  value={editForm.line1}
                  onChange={(e) => setEditForm(prev => prev ? {...prev, line1: e.target.value} : null)}
                />
              </div>
              
              <div>
                <Label htmlFor="line2">Address Line 2</Label>
                <Input
                  id="line2"
                  value={editForm.line2 || ''}
                  onChange={(e) => setEditForm(prev => prev ? {...prev, line2: e.target.value || null} : null)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editForm.city}
                    onChange={(e) => setEditForm(prev => prev ? {...prev, city: e.target.value} : null)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={editForm.state}
                    onChange={(e) => setEditForm(prev => prev ? {...prev, state: e.target.value} : null)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={editForm.postal_code}
                    onChange={(e) => setEditForm(prev => prev ? {...prev, postal_code: e.target.value} : null)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={editForm.country}
                    onChange={(e) => setEditForm(prev => prev ? {...prev, country: e.target.value} : null)}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 