"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Settings, Layout, FileImage } from "lucide-react";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ElementType;
  description?: string;
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Settings menu items
  const settingsMenuItems: MenuItem[] = [
    {
      label: "Sticker Sheet Layout",
      path: "/sticker-layout",
      icon: Layout,
      description: "Create 3-up sticker sheets"
    }
    // Add more menu items here as needed
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsSettingsOpen(false); // Close dropdown after navigation
  };

  const isActivePage = (path: string) => {
    if (path === "/orders" && pathname === "/orders") return true;
    if (path !== "/orders" && pathname.startsWith(path)) return true;
    return false;
  };

  const isActiveMenuItem = (path: string) => {
    return pathname.startsWith(path);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        <div className="flex items-center gap-4 relative">
          <Button
            ref={buttonRef}
            variant="outline"
            size="sm"
            className={`border-gray-300 text-gray-700 hover:bg-gray-50 ${
              settingsMenuItems.some(item => isActiveMenuItem(item.path)) 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : ''
            }`}
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {/* Settings Dropdown */}
          {isSettingsOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50"
            >
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100 mb-1">
                Tools & Settings
              </div>
              
              {settingsMenuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = isActiveMenuItem(item.path);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${
                        isActive ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              
              {/* Placeholder for future items */}
              <div className="px-3 py-2 text-xs text-gray-400 italic border-t border-gray-100 mt-1">
                More tools coming soon...
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 