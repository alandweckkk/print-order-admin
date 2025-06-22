'use server';

import { createAdminClient } from '@/lib/supabase/admin';

// Define proper types for complex data structures
interface ShippingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

interface StripePayload {
  data?: {
    object?: {
      id?: string;
      payment_intent?: string;
    };
  };
  payment_intent_id?: string;
  [key: string]: unknown;
}

interface OrderItems {
  [key: string]: unknown;
}

interface OrderMetadata {
  [key: string]: unknown;
}

interface ModelRunInputData {
  [key: string]: unknown;
}

interface ModelRunOutputData {
  [key: string]: unknown;
}

interface ModelRunMetadata {
  [key: string]: unknown;
}

interface ModelRunOutputImages {
  [key: string]: unknown;
}

// Helper function to format shipping address JSON into readable string
function formatShippingAddress(shippingAddress: ShippingAddress | null | undefined): string | null {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return null;
  }

  const {
    name,
    line1,
    line2,
    city,
    state,
    postal_code
  } = shippingAddress;

  if (!name && !line1 && !city) {
    return null; // Not enough data to format
  }

  const parts = [];
  
  if (name) parts.push(name);
  if (line1) parts.push(line1);
  if (line2) parts.push(line2);
  if (city) {
    const cityStateParts = [city];
    if (state) cityStateParts.push(state);
    if (postal_code) cityStateParts.push(postal_code);
    parts.push(cityStateParts.join(', '));
  } else {
    if (state) parts.push(state);
    if (postal_code) parts.push(postal_code);
  }

  return parts.filter(Boolean).join(', ');
}

export interface StripeCapturedEvent {
  id: number;
  payload: StripePayload;
  transaction_id: string | null;
  amount: number | null;
  created_timestamp: number | null;
  created_timestamp_est: string | null;
  payment_source: string | null;
  user_id: string | null;
  pack_type: string | null;
  model_run_id: string | null;
  output_image_url: string | null;
  credits: string | null;
}

export interface CombinedOrderEvent extends StripeCapturedEvent {
  // Management record fields
  stripe_payment_id: string | null;
  // Physical mail orders fields (prefixed to avoid conflicts)
  pmo_id: string | null;
  pmo_payment_intent_id: string | null;
  pmo_user_id: string | null;
  pmo_model_run_id: string | null;
  pmo_status: string | null;
  pmo_amount: number | null;
  pmo_currency: string | null;
  pmo_shipping_address: string | null;
  pmo_items: OrderItems | null;
  pmo_metadata: OrderMetadata | null;
  pmo_order_type: string | null;
  pmo_output_image_url: string | null;
  pmo_email: string | null;
  pmo_tracking_number: string | null;
  pmo_shipped_at: string | null;
  pmo_delivered_at: string | null;
  pmo_created_at: string | null;
  pmo_updated_at: string | null;
  pmo_order_number: string | null;
  // Model runs fields (prefixed to avoid conflicts)
  mr_id: string | null;
  mr_user_id: string | null;
  mr_created_at: string | null;
  mr_updated_at: string | null;
  mr_status: string | null;
  mr_model_name: string | null;
  mr_input_data: ModelRunInputData | null;
  mr_output_data: ModelRunOutputData | null;
  mr_error: string | null;
  mr_duration_ms: number | null;
  mr_cost: number | null;
  mr_metadata: ModelRunMetadata | null;
  mr_prompt: string | null;
  mr_input_image_url: string | null;
  mr_output_image_url: string | null;
  mr_original_output_image_url: string | null;
  mr_output_images: ModelRunOutputImages | null;
  mr_credits_used: number | null;
  mr_model_version: string | null;
  // Batch management fields
  batch_status: string | null;
  order_notes: string | null;
  batch_id: string | null;
}

export async function fetchStripeEventColumns(): Promise<string[]> {
  "use server";
  
  try {
    const supabase = await createAdminClient();
    
    // Query the table schema to get all column names
    const { data, error } = await supabase
      .from('stripe_captured_events')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching stripe events table schema:', error);
      return [];
    }

    // Extract column names from the first row (if any data exists)
    if (data && data.length > 0) {
      return Object.keys(data[0]);
    }

    // Fallback: return the columns we know about from the interface
    return [
      'id',
      'payload',
      'transaction_id',
      'amount',
      'created_timestamp',
      'created_timestamp_est',
      'payment_source',
      'user_id',
      'pack_type',
      'model_run_id',
      'output_image_url',
      'credits'
    ];
  } catch (error) {
    console.error('Error fetching stripe events table columns:', error);
    return [];
  }
}

export async function fetchPhysicalMailOrderColumns(): Promise<string[]> {
  "use server";
  
  try {
    const supabase = await createAdminClient();
    
    // Query the table schema to get all column names
    const { data, error } = await supabase
      .from('physical_mail_orders')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching physical mail orders table schema:', error);
      return [];
    }

    // Extract column names from the first row (if any data exists)
    if (data && data.length > 0) {
      return Object.keys(data[0]);
    }

    // Fallback: return the columns we know about from the interface
    return [
      'id',
      'payment_intent_id',
      'user_id',
      'model_run_id',
      'status',
      'amount',
      'currency',
      'shipping_address',
      'items',
      'metadata',
      'order_type',
      'output_image_url',
      'email',
      'tracking_number',
      'shipped_at',
      'delivered_at',
      'created_at',
      'updated_at',
      'order_number'
    ];
  } catch (error) {
    console.error('Error fetching physical mail orders table columns:', error);
    return [];
  }
}

export async function fetchModelRunsColumns(): Promise<string[]> {
  "use server";
  
  try {
    const supabase = await createAdminClient();
    
    // Query the table schema to get all column names
    const { data, error } = await supabase
      .from('model_runs')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching model runs table schema:', error);
      return [];
    }

    // Extract column names from the first row (if any data exists)
    if (data && data.length > 0) {
      console.log('Model runs columns found:', Object.keys(data[0]));
      return Object.keys(data[0]);
    }

    // Fallback: return common columns we expect in model_runs
    return [
      'id',
      'user_id',
      'created_at',
      'updated_at',
      'status',
      'model_name',
      'input_data',
      'output_data',
      'error',
      'duration_ms',
      'cost',
      'metadata'
    ];
  } catch (error) {
    console.error('Error fetching model runs table columns:', error);
    return [];
  }
}

export async function fetchTableColumns(): Promise<string[]> {
  "use server";
  
  try {
    const supabase = await createAdminClient();
    
    // Query the table schema to get all column names
    const { data, error } = await supabase
      .from('stripe_captured_events')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching table schema:', error);
      return [];
    }

    // Extract column names from the first row (if any data exists)
    if (data && data.length > 0) {
      return Object.keys(data[0]);
    }

    // Fallback: return the columns we know about from the interface
    return [
      'id',
      'payload',
      'transaction_id',
      'amount',
      'created_timestamp',
      'created_timestamp_est',
      'payment_source',
      'user_id',
      'pack_type',
      'model_run_id',
      'output_image_url',
      'credits'
    ];
  } catch (error) {
    console.error('Error fetching table columns:', error);
    return [];
  }
}

export async function fetchPhysicalStripeEvents(page: number = 1, limit: number = 100): Promise<{ events: CombinedOrderEvent[], total: number }> {
  "use server";
  
  try {
    console.log('=== STARTING DATA FETCH ===');
    console.log(`Fetching page ${page} with limit ${limit}`);
    console.log('Attempting to create admin client...');
    const supabase = await createAdminClient();
    console.log('Admin client created successfully');
    
    // First get total count from z_print_order_management (only visible records)
    console.log('Getting total count of z_print_order_management (visible only)...');
    const { count: totalCount, error: countError } = await supabase
      .from('z_print_order_management')
      .select('*', { count: 'exact', head: true })
      .eq('visible', true);

    if (countError) {
      console.error('COUNT ERROR:', countError);
      return { events: [], total: 0 };
    }

    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get paginated records from z_print_order_management (only visible records)
    console.log(`Fetching z_print_order_management (visible only)... offset: ${offset}, limit: ${limit}`);
    const { data: managementRecords, error: managementError } = await supabase
      .from('z_print_order_management')
      .select('*')
      .eq('visible', true)
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('Management records query result:', { 
      data: managementRecords?.length, 
      error: managementError,
      firstRecord: managementRecords?.[0] ? 'EXISTS' : 'NONE'
    });

    if (managementError) {
      console.error('MANAGEMENT RECORDS ERROR:', managementError);
      return { events: [], total: 0 };
    }

    if (!managementRecords || managementRecords.length === 0) {
      console.error('NO MANAGEMENT RECORDS FOUND - returning empty array');
      return { events: [], total: totalCount || 0 };
    }

    // Extract unique payment intent IDs from z_print_order_management
    const paymentIntentIds = managementRecords
      .map(record => record.stripe_payment_id)
      .filter(Boolean);

    // Get physical mail orders that match the payment intent IDs
    console.log('Fetching physical_mail_orders for current page...');
    const { data: physicalOrders, error: physicalError } = await supabase
      .from('physical_mail_orders')
      .select('*')
      .in('payment_intent_id', paymentIntentIds);

    console.log('Physical orders query result:', { 
      data: physicalOrders?.length, 
      error: physicalError,
      firstRecord: physicalOrders?.[0] ? 'EXISTS' : 'NONE'
    });

    if (physicalError) {
      console.error('PHYSICAL ORDERS ERROR:', physicalError);
      // Continue anyway - we can still show management data without physical order data
    }

    // Extract model run IDs from physical orders for additional data
    const modelRunIds = physicalOrders
      ?.map(order => order.model_run_id)
      .filter(Boolean) || [];

    // Get model runs that match the model run IDs from physical orders
    console.log('Fetching model_runs for current page...');
    const { data: modelRuns, error: modelRunsError } = await supabase
      .from('model_runs')
      .select('*')
      .in('id', modelRunIds);

    console.log('Model runs query result:', { 
      data: modelRuns?.length, 
      error: modelRunsError,
      firstRecord: modelRuns?.[0] ? 'EXISTS' : 'NONE'
    });

    if (modelRunsError) {
      console.error('MODEL RUNS ERROR:', modelRunsError);
      // Continue anyway - we can still show order data without model runs data
    }

    // Get corresponding stripe events for additional metadata (optional)
    // Note: This is a complex query since we need to match against nested JSON
    console.log('Fetching stripe_captured_events for current page...');
    const { data: allStripeEvents, error: allStripeError } = await supabase
      .from('stripe_captured_events')
      .select('*')
      .eq('amount', 7.99);

    // Filter stripe events that match our payment intent IDs
    const stripeEvents = allStripeEvents?.filter(event => {
      const eventPaymentIntentId = (event.payload as StripePayload)?.data?.object?.id || (event.payload as StripePayload)?.payment_intent_id;
      return paymentIntentIds.includes(eventPaymentIntentId);
    }) || [];

    const stripeError = allStripeError;

    console.log('Stripe events query result:', { 
      data: stripeEvents?.length, 
      error: stripeError,
      firstRecord: stripeEvents?.[0] ? 'EXISTS' : 'NONE'
    });

    if (stripeError) {
      console.error('STRIPE EVENTS ERROR:', stripeError);
      // Continue anyway - we can still show order data without stripe event metadata
    }

    console.log('=== DATA SUMMARY ===');
    console.log('Management records found:', managementRecords?.length);
    console.log('Physical orders found:', physicalOrders?.length);
    console.log('Model runs found:', modelRuns?.length);
    console.log('Stripe events found:', stripeEvents?.length);

    // Sample first few payment_intent_ids for debugging
    if (managementRecords?.length > 0) {
      console.log('Sample management records (first 3):');
      managementRecords.slice(0, 3).forEach((record, i) => {
        console.log(`  ${i + 1}: stripe_payment_id =`, record.stripe_payment_id);
      });
    }

    if (physicalOrders && physicalOrders.length > 0) {
      console.log('Sample physical order payment_intent_ids (first 3):');
      physicalOrders.slice(0, 3).forEach((order, i) => {
        console.log(`  ${i + 1}: payment_intent_id =`, order.payment_intent_id);
      });
    }

    // Combine the data by matching payment_intent_id from management records
    let joinMatches = 0;
    let modelRunMatches = 0;
    let stripeMatches = 0;
    const combinedData = managementRecords.map((managementRecord: { id: string; stripe_payment_id: string; status: string; order_notes: string }) => {
      const paymentIntentId = managementRecord.stripe_payment_id;
      
      // Find matching physical order (should exist for most records)
      const matchingOrder = physicalOrders?.find((order: { payment_intent_id: string }) => 
        order.payment_intent_id === paymentIntentId
      );
      
      if (matchingOrder) {
        joinMatches++;
      }

      // Find matching model run by model_run_id from physical order
      const matchingModelRun = modelRuns?.find((run: { id: string }) => 
        run.id === matchingOrder?.model_run_id
      );

      if (matchingModelRun) {
        modelRunMatches++;
      }

      // Find matching stripe event for additional metadata (optional)
      const matchingStripeEvent = stripeEvents?.find((event: StripeCapturedEvent) => {
        const stripePaymentIntentId = (event.payload as StripePayload)?.data?.object?.id || (event.payload as StripePayload)?.payment_intent_id;
        return stripePaymentIntentId === paymentIntentId;
      });

      if (matchingStripeEvent) {
        stripeMatches++;
      }

      return {
        // Use stripe event data if available, otherwise create minimal structure
        id: matchingStripeEvent?.id || 0,
        payload: matchingStripeEvent?.payload || {},
        transaction_id: matchingStripeEvent?.transaction_id || null,
        amount: matchingStripeEvent?.amount || 7.99,
        created_timestamp: matchingStripeEvent?.created_timestamp || null,
        created_timestamp_est: matchingStripeEvent?.created_timestamp_est || matchingOrder?.created_at || null,
        payment_source: matchingStripeEvent?.payment_source || 'physical_mail',
        user_id: matchingStripeEvent?.user_id || matchingOrder?.user_id || null,
        pack_type: matchingStripeEvent?.pack_type || 'physical',
        model_run_id: matchingStripeEvent?.model_run_id || matchingOrder?.model_run_id || null,
        output_image_url: matchingStripeEvent?.output_image_url || matchingOrder?.output_image_url || null,
        credits: matchingStripeEvent?.credits || null,
        // Management record fields
        stripe_payment_id: managementRecord.stripe_payment_id || null,
        // Add prefixed physical mail order fields
        pmo_id: matchingOrder?.id || null,
        pmo_payment_intent_id: matchingOrder?.payment_intent_id || null,
        pmo_user_id: matchingOrder?.user_id || null,
        pmo_model_run_id: matchingOrder?.model_run_id || null,
        pmo_status: matchingOrder?.status || null,
        pmo_amount: matchingOrder?.amount || null,
        pmo_currency: matchingOrder?.currency || null,
        pmo_shipping_address: formatShippingAddress(matchingOrder?.shipping_address) || null,
        pmo_items: matchingOrder?.items || null,
        pmo_metadata: matchingOrder?.metadata || null,
        pmo_order_type: matchingOrder?.order_type || null,
        pmo_output_image_url: matchingOrder?.output_image_url || null,
        pmo_email: matchingOrder?.email || null,
        pmo_tracking_number: matchingOrder?.tracking_number || null,
        pmo_shipped_at: matchingOrder?.shipped_at || null,
        pmo_delivered_at: matchingOrder?.delivered_at || null,
        pmo_created_at: matchingOrder?.created_at || null,
        pmo_updated_at: matchingOrder?.updated_at || null,
        pmo_order_number: matchingOrder?.order_number || null,
        // Add prefixed model runs fields
        mr_id: matchingModelRun?.id || null,
        mr_user_id: matchingModelRun?.user_id || null,
        mr_created_at: matchingModelRun?.created_at || null,
        mr_updated_at: matchingModelRun?.updated_at || null,
        mr_status: matchingModelRun?.status || null,
        mr_model_name: matchingModelRun?.model_name || null,
        mr_input_data: matchingModelRun?.input_data || null,
        mr_output_data: matchingModelRun?.output_data || null,
        mr_error: matchingModelRun?.error || null,
        mr_duration_ms: matchingModelRun?.duration_ms || null,
        mr_cost: matchingModelRun?.cost || null,
        mr_metadata: matchingModelRun?.metadata || null,
        mr_prompt: matchingModelRun?.prompt || null,
        mr_input_image_url: matchingModelRun?.input_image_url || null,
        mr_output_image_url: matchingModelRun?.output_image_url || null,
        mr_original_output_image_url: matchingModelRun?.original_output_image_url || null,
        mr_output_images: matchingModelRun?.output_images || null,
        mr_credits_used: matchingModelRun?.credits_used || null,
        mr_model_version: matchingModelRun?.model_version || null,
        // Batch management fields - now reads from database
        batch_status: managementRecord.status || 'No Status',
        order_notes: managementRecord.order_notes || null,
        batch_id: managementRecord.batch_id || null,
      };
    });

    console.log('=== FINAL RESULT ===');
    console.log('Combined records created:', combinedData?.length);
    console.log('Physical order matches found:', joinMatches, 'out of', managementRecords.length, 'management records');
    console.log('Model run matches found:', modelRunMatches, 'out of', managementRecords.length, 'management records');
    console.log('Stripe event matches found:', stripeMatches, 'out of', managementRecords.length, 'management records');
    
    // Debug: Log first 10 records to see what data we have
    console.log('=== FIRST 10 RECORDS (SAMPLE) ===');
    combinedData.slice(0, 10).forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log('Management Record Payment ID:', paymentIntentIds[index]);
      console.log('Physical Order ID:', record.pmo_id);
      console.log('Model Run ID:', record.model_run_id);
      console.log('Model Run Data (mr_id):', record.mr_id);
      console.log('Output Image URLs:');
      console.log('  - stripe output_image_url:', record.output_image_url);
      console.log('  - pmo_output_image_url:', record.pmo_output_image_url);
      console.log('  - mr_output_image_url:', record.mr_output_image_url);
      console.log('Order details:');
      console.log('  - pmo_status:', record.pmo_status);
      console.log('  - pmo_tracking_number:', record.pmo_tracking_number);
      console.log('  - pmo_order_number:', record.pmo_order_number);
    });
    
    console.log('Returning data to UI...');
    return { 
      events: combinedData as CombinedOrderEvent[], 
      total: totalCount || 0 
    };
  } catch (error) {
    console.error('=== CRITICAL ERROR ===');
    console.error('Error fetching stripe events:', error);
    return { events: [], total: 0 };
  }
}

/**
 * Analyze missing physical mail order records after primary Stripe filter
 * Returns detailed analysis of join gaps between stripe_captured_events and physical_mail_orders
 */
export async function analyzePhysicalMailOrderJoinGaps(): Promise<{
  success: boolean;
  analysis?: {
    totalStripeEvents: number;
    eventsWithPhysicalOrders: number;
    eventsWithoutPhysicalOrders: number;
    missingPercentage: number;
    sampleMissingEvents: Array<{
      stripe_id: number;
      payment_intent_id: string | null;
      created_timestamp_est: string | null;
      amount: number | null;
    }>;
  };
  error?: string;
}> {
  "use server";
  
  try {
    console.log('=== ANALYZING PHYSICAL MAIL ORDER JOIN GAPS ===');
    const supabase = await createAdminClient();
    
    // Step 1: Get all Stripe events with amount = 7.99 (primary filter)
    console.log('Step 1: Fetching all Stripe events with amount = 7.99...');
    const { data: stripeEvents, error: stripeError } = await supabase
      .from('stripe_captured_events')
      .select('id, payload, amount, created_timestamp_est')
      .eq('amount', '7.99')
      .order('created_timestamp_est', { ascending: false });

    if (stripeError) {
      console.error('Error fetching Stripe events:', stripeError);
      return { success: false, error: stripeError.message };
    }

    if (!stripeEvents || stripeEvents.length === 0) {
      return { 
        success: true, 
        analysis: {
          totalStripeEvents: 0,
          eventsWithPhysicalOrders: 0,
          eventsWithoutPhysicalOrders: 0,
          missingPercentage: 0,
          sampleMissingEvents: []
        }
      };
    }

    console.log(`Found ${stripeEvents.length} Stripe events with amount = 7.99`);

    // Step 2: Extract payment intent IDs from Stripe events
    console.log('Step 2: Extracting payment intent IDs from Stripe payloads...');
    const stripeEventsWithPaymentIntents = stripeEvents.map(event => {
      const paymentIntentId = (event.payload as StripePayload)?.data?.object?.id || 
                             (event.payload as StripePayload)?.payment_intent_id;
      return {
        stripe_id: event.id,
        payment_intent_id: paymentIntentId,
        created_timestamp_est: event.created_timestamp_est,
        amount: event.amount
      };
    }).filter(event => event.payment_intent_id); // Only events with valid payment intent IDs

    const allPaymentIntentIds = stripeEventsWithPaymentIntents.map(e => e.payment_intent_id);
    console.log(`Extracted ${allPaymentIntentIds.length} valid payment intent IDs`);

    // Step 3: Fetch all matching physical mail orders
    console.log('Step 3: Fetching physical mail orders for all payment intent IDs...');
    const { data: physicalOrders, error: physicalError } = await supabase
      .from('physical_mail_orders')
      .select('payment_intent_id')
      .in('payment_intent_id', allPaymentIntentIds);

    if (physicalError) {
      console.error('Error fetching physical mail orders:', physicalError);
      return { success: false, error: physicalError.message };
    }

    console.log(`Found ${physicalOrders?.length || 0} matching physical mail orders`);

    // Step 4: Analyze the gaps
    const physicalOrderPaymentIntents = new Set(
      physicalOrders?.map(order => order.payment_intent_id) || []
    );

    const eventsWithPhysicalOrders = stripeEventsWithPaymentIntents.filter(
      event => physicalOrderPaymentIntents.has(event.payment_intent_id)
    );

    const eventsWithoutPhysicalOrders = stripeEventsWithPaymentIntents.filter(
      event => !physicalOrderPaymentIntents.has(event.payment_intent_id)
    );

    const missingPercentage = stripeEventsWithPaymentIntents.length > 0 
      ? (eventsWithoutPhysicalOrders.length / stripeEventsWithPaymentIntents.length) * 100 
      : 0;

    // Get sample of missing events (first 10)
    const sampleMissingEvents = eventsWithoutPhysicalOrders
      .slice(0, 10)
      .map(event => ({
        stripe_id: event.stripe_id,
        payment_intent_id: event.payment_intent_id || null,
        created_timestamp_est: event.created_timestamp_est || null,
        amount: event.amount || null
      }));

    const analysis = {
      totalStripeEvents: stripeEventsWithPaymentIntents.length,
      eventsWithPhysicalOrders: eventsWithPhysicalOrders.length,
      eventsWithoutPhysicalOrders: eventsWithoutPhysicalOrders.length,
      missingPercentage: Math.round(missingPercentage * 100) / 100,
      sampleMissingEvents
    };

    console.log('=== JOIN GAP ANALYSIS RESULTS ===');
    console.log(`Total Stripe events (with payment intent IDs): ${analysis.totalStripeEvents}`);
    console.log(`Events WITH physical orders: ${analysis.eventsWithPhysicalOrders}`);
    console.log(`Events WITHOUT physical orders: ${analysis.eventsWithoutPhysicalOrders}`);
    console.log(`Missing percentage: ${analysis.missingPercentage}%`);
    console.log(`Sample missing events:`, sampleMissingEvents);

    return { success: true, analysis };

  } catch (error) {
    console.error('Error analyzing physical mail order join gaps:', error);
    return { success: false, error: 'Failed to analyze join gaps' };
  }
}

