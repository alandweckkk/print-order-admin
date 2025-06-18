'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export interface StripeCapturedEvent {
  id: number;
  payload: any;
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
  // Physical mail orders fields (prefixed to avoid conflicts)
  pmo_id: string | null;
  pmo_payment_intent_id: string | null;
  pmo_user_id: string | null;
  pmo_model_run_id: string | null;
  pmo_status: string | null;
  pmo_amount: number | null;
  pmo_currency: string | null;
  pmo_shipping_address: any | null;
  pmo_items: any | null;
  pmo_metadata: any | null;
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
  mr_input_data: any | null;
  mr_output_data: any | null;
  mr_error: string | null;
  mr_duration_ms: number | null;
  mr_cost: number | null;
  mr_metadata: any | null;
  mr_prompt: string | null;
  mr_output_image_url: string | null;
  mr_output_images: any | null;
  mr_credits_used: number | null;
  mr_model_version: string | null;
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
    
    // First get total count
    console.log('Getting total count of stripe_captured_events...');
    const { count: totalCount, error: countError } = await supabase
      .from('stripe_captured_events')
      .select('*', { count: 'exact', head: true })
      .eq('amount', '7.99');

    if (countError) {
      console.error('COUNT ERROR:', countError);
      return { events: [], total: 0 };
    }

    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get paginated stripe events
    console.log(`Fetching stripe_captured_events... offset: ${offset}, limit: ${limit}`);
    const { data: stripeEvents, error: stripeError } = await supabase
      .from('stripe_captured_events')
      .select('*')
      .eq('amount', '7.99')
      .order('created_timestamp_est', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('Stripe query result:', { 
      data: stripeEvents?.length, 
      error: stripeError,
      firstRecord: stripeEvents?.[0] ? 'EXISTS' : 'NONE'
    });

    if (stripeError) {
      console.error('STRIPE EVENTS ERROR:', stripeError);
      return { events: [], total: 0 };
    }

    if (!stripeEvents || stripeEvents.length === 0) {
      console.error('NO STRIPE EVENTS FOUND - returning empty array');
      return { events: [], total: totalCount || 0 };
    }

    // Extract unique payment intent IDs and model run IDs from current page
    const paymentIntentIds = stripeEvents
      .map(event => event.payload?.data?.object?.id || event.payload?.payment_intent_id)
      .filter(Boolean);
    
    const modelRunIds = stripeEvents
      .map(event => event.model_run_id)
      .filter(Boolean);

    // Get only the physical mail orders that match current page's payment intents
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
      // Continue anyway - we can still show stripe data without physical order data
    }

    // Get only the model runs that match current page's model run IDs
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
      // Continue anyway - we can still show stripe data without model runs data
    }

    console.log('=== DATA SUMMARY ===');
    console.log('Stripe events found:', stripeEvents?.length);
    console.log('Physical orders found:', physicalOrders?.length);
    console.log('Model runs found:', modelRuns?.length);

    // Sample first few payment_intent_ids for debugging
    if (stripeEvents?.length > 0) {
      console.log('Sample stripe payloads (first 3):');
      stripeEvents.slice(0, 3).forEach((event, i) => {
        const paymentIntentId = event.payload?.payment_intent_id || event.payload?.data?.object?.payment_intent;
        console.log(`  ${i + 1}: payment_intent_id =`, paymentIntentId);
      });
    }

    if (physicalOrders?.length > 0) {
      console.log('Sample physical order payment_intent_ids (first 3):');
      physicalOrders.slice(0, 3).forEach((order, i) => {
        console.log(`  ${i + 1}: payment_intent_id =`, order.payment_intent_id);
      });
    }

    // Combine the data by matching payment_intent_id from stripe payload
    let joinMatches = 0;
    let modelRunMatches = 0;
    const combinedData = stripeEvents.map((stripe: any) => {
      // Extract payment_intent_id from stripe payload - the ID is nested in data.object.id
      const paymentIntentId = stripe.payload?.data?.object?.id || stripe.payload?.payment_intent_id;
      
      // Find matching physical order (optional - not all stripe events have physical orders)
      const matchingOrder = physicalOrders?.find((order: any) => 
        order.payment_intent_id === paymentIntentId
      );
      
      if (matchingOrder) {
        joinMatches++;
      }

      // Find matching model run by model_run_id from stripe event
      const matchingModelRun = modelRuns?.find((run: any) => 
        run.id === stripe.model_run_id
      );

      if (matchingModelRun) {
        modelRunMatches++;
      }

      return {
        ...stripe,
        // Add prefixed physical mail order fields
        pmo_id: matchingOrder?.id || null,
        pmo_payment_intent_id: matchingOrder?.payment_intent_id || null,
        pmo_user_id: matchingOrder?.user_id || null,
        pmo_model_run_id: matchingOrder?.model_run_id || null,
        pmo_status: matchingOrder?.status || null,
        pmo_amount: matchingOrder?.amount || null,
        pmo_currency: matchingOrder?.currency || null,
        pmo_shipping_address: matchingOrder?.shipping_address || null,
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
        mr_output_image_url: matchingModelRun?.output_image_url || null,
        mr_output_images: matchingModelRun?.output_images || null,
        mr_credits_used: matchingModelRun?.credits_used || null,
        mr_model_version: matchingModelRun?.model_version || null,
      };
    });

    console.log('=== FINAL RESULT ===');
    console.log('Combined records created:', combinedData?.length);
    console.log('Join matches found:', joinMatches, 'out of', stripeEvents.length, 'stripe events');
    console.log('Model run matches found:', modelRunMatches, 'out of', stripeEvents.length, 'stripe events');
    
    // Debug: Log first 10 records to see what data we have
    console.log('=== FIRST 10 RECORDS (SAMPLE) ===');
    combinedData.slice(0, 10).forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log('Stripe Event ID:', record.id);
      console.log('Model Run ID (stripe):', record.model_run_id);
      console.log('Model Run Data (mr_id):', record.mr_id);
      console.log('Output Image URLs:');
      console.log('  - stripe output_image_url:', record.output_image_url);
      console.log('  - pmo_output_image_url:', record.pmo_output_image_url);
      console.log('  - mr_output_image_url:', record.mr_output_image_url);
      console.log('Other mr_ fields sample:');
      console.log('  - mr_status:', record.mr_status);
      console.log('  - mr_model_name:', record.mr_model_name);
      console.log('  - mr_created_at:', record.mr_created_at);
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