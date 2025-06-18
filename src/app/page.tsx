import OrdersPage from "./orders/page";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="w-full bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Print Order Admin</h1>
            <p className="text-sm text-gray-600">Manage your print orders efficiently</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Navigation items can be added here later */}
            <span className="text-sm text-gray-500">Admin Panel</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="w-full">
        <OrdersPage />
      </main>
    </div>
  );
}
