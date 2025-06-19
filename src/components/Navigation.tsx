"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActivePage = (path: string) => {
    if (path === "/orders" && pathname === "/orders") return true;
    if (path !== "/orders" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant={isActivePage("/orders") ? "default" : "outline"}
            size="lg"
            className={isActivePage("/orders") 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }
            onClick={() => handleNavigation("/orders")}
          >
            Orders
          </Button>
          <Button 
            variant={isActivePage("/sticker-layout") ? "default" : "outline"}
            size="lg"
            className={isActivePage("/sticker-layout")
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }
            onClick={() => handleNavigation("/sticker-layout")}
          >
            Sticker Sheet Layout
          </Button>
          <Button 
            variant={isActivePage("/active-batch") ? "default" : "outline"}
            size="lg"
            className={isActivePage("/active-batch")
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }
            onClick={() => handleNavigation("/active-batch")}
          >
            Active Batch
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Admin Panel</span>
        </div>
      </div>
    </nav>
  );
} 