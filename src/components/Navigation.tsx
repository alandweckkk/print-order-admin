"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Settings, Layout, Mail, Tag, Users, Plus, Trash2, Check } from "lucide-react";
import { getAllAdminProfiles, createAdminProfile, deleteAdminProfile } from "@/app/orders/actions/admin-profiles";
import { syncNewOrders } from "@/app/orders/actions/sync-new-orders";
import Notes from "@/components/Notes";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ElementType;
  description?: string;
}

interface AdminProfile {
  admin_name: string;
  notes?: string;
  default_column_arrays: string[];
  created_at: string;
  isActive?: boolean;
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfileKey, setNewProfileKey] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const profilesDropdownRef = useRef<HTMLDivElement>(null);
  const profilesButtonRef = useRef<HTMLButtonElement>(null);

  // Settings menu items
  const settingsMenuItems: MenuItem[] = [
    {
      label: "Admin Profiles",
      path: "/admin-profiles",
      icon: Users,
      description: "Manage admin column defaults"
    },
    {
      label: "Sticker Sheet Layout",
      path: "/sticker-layout",
      icon: Layout,
      description: "Create 3-up sticker sheets"
    },
    {
      label: "Envelopes",
      path: "/envelopes",
      icon: Mail,
      description: "Manage envelope templates"
    },
    {
      label: "Labels",
      path: "/labels", 
      icon: Tag,
      description: "Configure shipping labels"
    }
    // Add more menu items here as needed
  ];

  // Dynamic admin profiles from Supabase z_joey_01 table
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load admin profiles from database
  useEffect(() => {
    async function loadAdminProfiles() {
      try {
        setIsLoading(true);
        const result = await getAllAdminProfiles();
        if (result.success) {
          // Mark the oldest profile as active by default
          const profilesWithActive = (result.data || []).map((profile, index) => ({
            ...profile,
            isActive: index === 0 && (result.data || []).length > 0 // First profile (oldest) is active
          }));
          setAdminProfiles(profilesWithActive);
        } else {
          console.error("Failed to load admin profiles:", result.error);
        }
      } catch (error) {
        console.error("Error loading admin profiles:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminProfiles();
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsSettingsOpen(false); // Close dropdown after navigation
  };

  const handleProfileSelect = (adminName: string) => {
    setSelectedProfile(adminName);
    setAdminProfiles(prev => 
      prev.map(profile => ({
        ...profile,
        isActive: profile.admin_name === adminName
      }))
    );
    setIsProfilesOpen(false);
  };

  const handleDeleteProfile = async (adminName: string) => {
    try {
      const result = await deleteAdminProfile(adminName);
      if (result.success) {
        // Remove from local state
        setAdminProfiles(prev => prev.filter(profile => profile.admin_name !== adminName));
        if (selectedProfile === adminName) {
          setSelectedProfile(null);
        }
        console.log(`✅ Admin profile '${adminName}' deleted successfully`);
      } else {
        console.error("Failed to delete admin profile:", result.error);
        alert(`Failed to delete profile: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting admin profile:", error);
      alert("An error occurred while deleting the profile");
    }
  };

  const handleAddProfile = async () => {
    if (!newProfileKey.trim()) return;
    
    try {
      const result = await createAdminProfile(newProfileKey.trim(), "Created via navigation menu");
      if (result.success) {
        // Add to local state
        const newProfile: AdminProfile = {
          ...result.data,
          isActive: false
        };
        setAdminProfiles(prev => [...prev, newProfile]);
        
        console.log(`✅ Admin profile '${newProfileKey.trim()}' created successfully`);
        setNewProfileKey('');
        setShowAddForm(false);
      } else {
        alert(`Failed to create profile: ${result.error}`);
      }
    } catch (error) {
      console.error("Error creating admin profile:", error);
      alert("An error occurred while creating the profile");
    }
  };

  const handleSyncNewOrders = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    
    try {
      const result = await syncNewOrders();
      
      if (result.success) {
        if (result.newRecords > 0) {
          setSyncMessage(`✅ Successfully synced ${result.newRecords} new orders`);
        } else {
          setSyncMessage(`✅ All orders are up to date (${result.totalChecked} checked)`);
        }
      } else {
        setSyncMessage(`❌ Sync failed: ${result.error}`);
      }
      
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
      
    } catch (error) {
      console.error("Error syncing orders:", error);
      setSyncMessage("❌ Unexpected error during sync");
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const getActiveProfile = () => {
    return adminProfiles.find(profile => profile.isActive);
  };

  const isActivePage = (path: string) => {
    if (path === "/orders" && pathname === "/orders") return true;
    if (path !== "/orders" && pathname.startsWith(path)) return true;
    return false;
  };

  const isActiveMenuItem = (path: string) => {
    return pathname.startsWith(path);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close settings dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
      
      // Close profiles dropdown
      if (
        profilesDropdownRef.current &&
        !profilesDropdownRef.current.contains(event.target as Node) &&
        profilesButtonRef.current &&
        !profilesButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfilesOpen(false);
        setShowAddForm(false);
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
          <Button 
            variant="outline"
            size="lg"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 relative"
            onClick={handleSyncNewOrders}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "Sync New Orders"}
          </Button>
          
          {/* Sync Status Message */}
          {syncMessage && (
            <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-lg text-sm whitespace-nowrap z-50">
              {syncMessage}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 relative">
          {/* Notes Button */}
          <Notes />
          
          {/* Admin Profiles Button */}
          <Button
            ref={profilesButtonRef}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            onClick={() => setIsProfilesOpen(!isProfilesOpen)}
          >
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {getActiveProfile()?.admin_name || 'Select Profile'}
            </span>
          </Button>

          {/* Settings Button */}
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
          
          {/* Admin Profiles Dropdown */}
          {isProfilesOpen && (
            <div
              ref={profilesDropdownRef}
              className="absolute top-full right-20 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50"
            >
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100 mb-1">
                Admin Profiles
              </div>
              
                             {/* Profile List */}
               <div className="max-h-64 overflow-y-auto">
                 {isLoading ? (
                   <div className="px-3 py-4 text-center text-sm text-gray-500">
                     Loading profiles...
                   </div>
                 ) : adminProfiles.length === 0 ? (
                   <div className="px-3 py-4 text-center text-sm text-gray-500">
                     No admin profiles found
                   </div>
                 ) : (
                   adminProfiles.map((profile) => (
                     <div
                       key={profile.admin_name}
                       className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 ${
                         profile.isActive ? 'bg-blue-50' : ''
                       }`}
                     >
                       <button
                         onClick={() => handleProfileSelect(profile.admin_name)}
                         className="flex-1 flex items-center gap-3 text-left"
                       >
                         <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold">
                           👤
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className={`text-sm font-medium ${
                             profile.isActive ? 'text-blue-700' : 'text-gray-900'
                           }`}>
                             {profile.admin_name}
                           </div>
                           <div className="text-xs text-gray-500">
                             {profile.notes || 'Admin profile'}
                           </div>
                         </div>
                         {profile.isActive && (
                           <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                         )}
                       </button>
                       <button
                         onClick={() => handleDeleteProfile(profile.admin_name)}
                         className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                         title="Delete admin profile"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                   ))
                 )}
               </div>
              
                             {/* Add New Profile Form */}
               {showAddForm ? (
                 <div className="border-t border-gray-100 pt-2 px-3 py-2">
                   <div className="space-y-2">
                     <div className="text-xs text-center text-gray-500 mb-2">
                       Create New Admin Profile
                     </div>
                     <input
                       type="text"
                       placeholder="Admin name (e.g., john_doe)"
                       value={newProfileKey}
                       onChange={(e) => setNewProfileKey(e.target.value)}
                       className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     />
                     <div className="text-xs text-gray-500">
                       Admin name must be unique
                     </div>
                     <div className="flex gap-2">
                       <button
                         onClick={handleAddProfile}
                         disabled={!newProfileKey.trim()}
                         className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                       >
                         Create Profile
                       </button>
                       <button
                         onClick={() => {
                           setShowAddForm(false);
                           setNewProfileKey('');
                         }}
                         className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                       >
                         Cancel
                       </button>
                     </div>
                   </div>
                 </div>
               ) : (
                 <button
                   onClick={() => setShowAddForm(true)}
                   className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                 >
                   <Plus className="h-4 w-4" />
                   Add New Admin Profile
                 </button>
               )}
            </div>
          )}

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