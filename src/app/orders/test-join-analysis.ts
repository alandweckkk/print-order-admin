import { analyzePhysicalMailOrderJoinGaps } from './actions/pull-orders-from-supabase';

/**
 * Simple test script to analyze physical mail order join gaps
 * Run this to see missing records analysis
 */
async function runJoinAnalysis() {
  console.log('Starting physical mail order join gap analysis...');
  
  const result = await analyzePhysicalMailOrderJoinGaps();
  
  if (result.success && result.analysis) {
    console.log('\n=== PHYSICAL MAIL ORDER JOIN ANALYSIS ===');
    console.log(`Total Stripe Events (amount = $7.99): ${result.analysis.totalStripeEvents}`);
    console.log(`Events WITH Physical Orders: ${result.analysis.eventsWithPhysicalOrders}`);
    console.log(`Events WITHOUT Physical Orders: ${result.analysis.eventsWithoutPhysicalOrders}`);
    console.log(`Missing Percentage: ${result.analysis.missingPercentage}%`);
    
    if (result.analysis.sampleMissingEvents.length > 0) {
      console.log('\n=== SAMPLE MISSING EVENTS ===');
      result.analysis.sampleMissingEvents.forEach((event, index) => {
        console.log(`${index + 1}. Stripe ID: ${event.stripe_id}`);
        console.log(`   Payment Intent ID: ${event.payment_intent_id}`);
        console.log(`   Created: ${event.created_timestamp_est}`);
        console.log(`   Amount: $${event.amount}`);
        console.log('');
      });
    }
  } else {
    console.error('Analysis failed:', result.error);
  }
}

// Export for manual execution
export { runJoinAnalysis }; 