"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface PhysicalMailOrder {
  id: string;
  shipping_address: {
    city: string;
    name: string;
    line1: string;
    line2: string | null;
    state: string;
    country: string;
    postal_code: string;
  };
}

export async function fetchPhysicalMailOrders() {
  try {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('physical_mail_orders')
      .select('id, shipping_address')
      .order('id');

    if (error) {
      console.error('Error fetching physical mail orders:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { 
      success: true, 
      data: data as PhysicalMailOrder[],
      count: data.length 
    };

  } catch (error) {
    console.error('Error in fetchPhysicalMailOrders:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
} 