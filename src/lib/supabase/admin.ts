"use server";

import { createClient } from "@supabase/supabase-js";

export async function createAdminClient() {
  // Force the correct remote URL for this admin tool
  const supabaseUrl = 'https://bdrzgznzjnpkheqfmqgd.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcnpnem56am5wa2hlcWZtcWdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzYzNTk0NSwiZXhwIjoyMDMzMjExOTQ1fQ.YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE';
  
  console.log('Environment check:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceRoleKey,
    url: supabaseUrl,
    serviceKeyLength: serviceRoleKey?.length,
    serviceKeyPrefix: serviceRoleKey?.substring(0, 20),
    fromEnv: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }
  
  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
} 