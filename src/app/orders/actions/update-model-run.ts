"use server";

import { createAdminClient } from '@/lib/supabase/admin';

export async function updateModelRun(
  modelRunId: string, 
  fieldName: 'original_output_image_url',
  newValue: string
) {
  console.log('🔧 updateModelRun server action called:', { modelRunId, fieldName, newValue });
  
  try {
    const supabase = await createAdminClient();
    console.log('📡 Supabase admin client created');
    
    // Update the field in the model_runs table
    const updateData = { [fieldName]: newValue };
    const { data, error } = await supabase
      .from('model_runs')
      .update(updateData)
      .eq('id', modelRunId)
      .select();

    console.log('🗃️ Supabase update result:', { data, error });

    if (error) {
      console.error('❌ Supabase error updating model run:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Successfully updated model run in database:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception in updateModelRun:', error);
    return { success: false, error: 'Failed to update model run' };
  }
} 