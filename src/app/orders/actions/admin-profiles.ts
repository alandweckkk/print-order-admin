"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ColumnConfig {
  name: string;
  width: number;
}

export interface AdminProfile {
  admin_name: string;
  notes?: string;
  default_column_arrays: string[] | ColumnConfig[]; // Support both old and new format
}

/**
 * Save or update default column visibility settings for an admin
 * If no adminName provided, uses the current admin (oldest in database)
 */
export async function saveAdminColumnDefaults(
  adminNameOrColumns: string | string[] | ColumnConfig[],
  defaultColumns?: string[] | ColumnConfig[],
  notes?: string
) {
  try {
    // Handle both signatures: (adminName, columns, notes) and (columns, notes)
    let adminName: string;
    let columnsToSave: string[] | ColumnConfig[];
    let notesToSave: string | undefined;

    if (Array.isArray(adminNameOrColumns)) {
      // Called as: saveAdminColumnDefaults(columns, notes)
      adminName = await getCurrentAdmin();
      columnsToSave = adminNameOrColumns;
      notesToSave = defaultColumns as string | undefined;
    } else {
      // Called as: saveAdminColumnDefaults(adminName, columns, notes)
      adminName = adminNameOrColumns;
      columnsToSave = defaultColumns || [];
      notesToSave = notes;
    }

    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("z_joey_01")
      .upsert({
        admin_name: adminName,
        default_column_arrays: columnsToSave,
        notes: notesToSave || null,
      })
      .select();

    if (error) {
      console.error("Error saving admin column defaults:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in saveAdminColumnDefaults:", error);
    return { success: false, error: "Failed to save admin column defaults" };
  }
}

/**
 * Save default column visibility settings for the current admin (oldest in database)
 */
export async function saveCurrentAdminDefaults(
  defaultColumns: string[] | ColumnConfig[],
  notes?: string
) {
  const currentAdmin = await getCurrentAdmin();
  return saveAdminColumnDefaults(currentAdmin, defaultColumns, notes);
}

/**
 * Get default column visibility settings for the current admin (oldest in database)
 */
export async function getCurrentAdminDefaults() {
  return getAdminColumnDefaults();
}

/**
 * Get the oldest admin profile from the database
 */
export async function getOldestAdmin() {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("z_joey_01")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error("Error getting oldest admin:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getOldestAdmin:", error);
    return { success: false, error: "Failed to get oldest admin" };
  }
}

/**
 * Get the current admin name (defaults to oldest admin in database)
 */
export async function getCurrentAdmin(): Promise<string> {
  const result = await getOldestAdmin();
  if (result.success && result.data) {
    return result.data.admin_name;
  }
  // Fallback to "Joey" if no records exist
  return "Joey";
}

/**
 * Get default column visibility settings for an admin
 * If no adminName provided, uses the current admin (oldest in database)
 */
export async function getAdminColumnDefaults(adminName?: string) {
  try {
    const currentAdmin = adminName || await getCurrentAdmin();
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("z_joey_01")
      .select("*")
      .eq("admin_name", currentAdmin)
      .single();

    if (error) {
      // If no profile exists, return empty defaults for the current admin
      if (error.code === "PGRST116") {
        return { 
          success: true, 
          data: { 
            admin_name: currentAdmin,
            default_column_arrays: [],
            notes: null 
          } 
        };
      }
      console.error("Error getting admin column defaults:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getAdminColumnDefaults:", error);
    return { success: false, error: "Failed to get admin column defaults" };
  }
}

/**
 * Get all admin profiles (useful for admin management)
  * Returns profiles ordered by created_at (oldest first)
 */
export async function getAllAdminProfiles() {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("z_joey_01")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error getting all admin profiles:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error in getAllAdminProfiles:", error);
    return { success: false, error: "Failed to get admin profiles" };
  }
}

/**
 * Create a new admin profile
 */
export async function createAdminProfile(
  adminName: string,
  notes?: string,
  defaultColumns?: string[] | ColumnConfig[]
) {
  try {
    const supabase = await createAdminClient();

    // Check if admin already exists
    const { data: existing } = await supabase
      .from("z_joey_01")
      .select("admin_name")
      .eq("admin_name", adminName)
      .single();

    if (existing) {
      return { success: false, error: "Admin profile already exists" };
    }

    const { data, error } = await supabase
      .from("z_joey_01")
      .insert({
        admin_name: adminName,
        notes: notes || null,
        default_column_arrays: defaultColumns || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating admin profile:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in createAdminProfile:", error);
    return { success: false, error: "Failed to create admin profile" };
  }
}

/**
 * Delete an admin profile
 */
export async function deleteAdminProfile(adminName: string) {
  try {
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("z_joey_01")
      .delete()
      .eq("admin_name", adminName);

    if (error) {
      console.error("Error deleting admin profile:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteAdminProfile:", error);
    return { success: false, error: "Failed to delete admin profile" };
  }
} 