"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Trash2, Calendar, Database, Edit2, Save, X } from "lucide-react";
import { 
  getAllAdminProfiles, 
  createAdminProfile, 
  deleteAdminProfile, 
  saveAdminColumnDefaults,
  getCurrentAdminDefaults 
} from "@/app/orders/actions/admin-profiles";

interface AdminProfile {
  admin_name: string;
  notes?: string;
  default_column_arrays: string[];
  created_at: string;
}

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const result = await getAllAdminProfiles();
      if (result.success) {
        setProfiles(result.data);
      } else {
        console.error("Failed to load profiles:", result.error);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newAdminName.trim()) return;

    try {
      const result = await createAdminProfile(newAdminName.trim(), newNotes.trim() || undefined);
      if (result.success) {
        await loadProfiles(); // Reload to get fresh data
        setNewAdminName("");
        setNewNotes("");
        setShowCreateForm(false);
      } else {
        alert(`Failed to create profile: ${result.error}`);
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      alert("An error occurred while creating the profile");
    }
  };

  const handleDeleteProfile = async (adminName: string) => {
    if (!confirm(`Are you sure you want to delete the profile "${adminName}"?`)) return;

    try {
      const result = await deleteAdminProfile(adminName);
      if (result.success) {
        await loadProfiles(); // Reload to get fresh data
      } else {
        alert(`Failed to delete profile: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting profile:", error);
      alert("An error occurred while deleting the profile");
    }
  };

  const handleSaveNotes = async (adminName: string) => {
    try {
      const profile = profiles.find(p => p.admin_name === adminName);
      if (!profile) return;

      const result = await saveAdminColumnDefaults(adminName, profile.default_column_arrays, editNotes);
      if (result.success) {
        await loadProfiles(); // Reload to get fresh data
        setEditingProfile(null);
        setEditNotes("");
      } else {
        alert(`Failed to update notes: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating notes:", error);
      alert("An error occurred while updating notes");
    }
  };

  const startEditNotes = (profile: AdminProfile) => {
    setEditingProfile(profile.admin_name);
    setEditNotes(profile.notes || "");
  };

  const cancelEditNotes = () => {
    setEditingProfile(null);
    setEditNotes("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading admin profiles...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Profiles</h1>
            <p className="text-gray-600">Manage admin profiles and column defaults</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Profile
        </Button>
      </div>

      {/* Create Profile Form */}
      {showCreateForm && (
        <Card className="mb-6 p-4 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">Create New Admin Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Name
              </label>
              <Input
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Enter admin name (e.g., john_doe)"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Enter optional notes about this admin profile"
                className="w-full"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateProfile}
                disabled={!newAdminName.trim()}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Create Profile
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewAdminName("");
                  setNewNotes("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Profiles List */}
      <div className="space-y-4">
        {profiles.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Admin Profiles</h3>
            <p className="text-gray-600 mb-4">Create your first admin profile to get started</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Profile
            </Button>
          </Card>
        ) : (
          profiles.map((profile) => (
            <Card key={profile.admin_name} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold">
                      {profile.admin_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {profile.admin_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(profile.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Database className="h-4 w-4" />
                          {profile.default_column_arrays.length} default columns
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="mb-3">
                    {editingProfile === profile.admin_name ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Enter notes about this admin profile"
                          rows={3}
                          className="w-full"
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleSaveNotes(profile.admin_name)}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={cancelEditNotes}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-gray-600 cursor-pointer hover:bg-gray-50 p-2 rounded min-h-[2rem] flex items-center justify-between group"
                        onClick={() => startEditNotes(profile)}
                      >
                        <span>{profile.notes || "No notes"}</span>
                        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Default Columns */}
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Default Columns:</h4>
                    {profile.default_column_arrays.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {profile.default_column_arrays.map((column, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {column}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No default columns set</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProfile(profile.admin_name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* System Status */}
      <Card className="mt-8 p-4 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 mb-2">System Status</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Total profiles: {profiles.length}</div>
          <div>• Data source: Supabase table `z_joey_01`</div>
          <div>• Default admin: {profiles.length > 0 ? profiles[0].admin_name : "None"}</div>
        </div>
      </Card>
    </div>
  );
} 