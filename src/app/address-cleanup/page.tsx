import { fetchPhysicalMailOrders } from './actions/fetch-physical-mail-orders';
import { transformAddress } from './actions/address-transformations';
import AddressCleanupClient from './AddressCleanupClient';

export default async function AddressCleanupPage() {
  // Fetch data on the server
  const result = await fetchPhysicalMailOrders();
  
  if (!result.success) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">
            <h3 className="font-medium mb-2">Error Loading Orders</h3>
            <p>{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Transform data on the server
  const transformedOrders = result.data.map(order => {
    const transformationResult = transformAddress(order.shipping_address);
    
    return {
      id: order.id,
      current: order.shipping_address,
      transformed: transformationResult.needsChange ? transformationResult.transformed : undefined,
      approved: false,
      needsChange: transformationResult.needsChange,
      explanation: transformationResult.needsChange 
        ? transformationResult.changes.join('\n')
        : undefined,
      updating: false
    };
  });

  return <AddressCleanupClient initialOrders={transformedOrders} />;
} 