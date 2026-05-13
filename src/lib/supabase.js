import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Key from the Supabase Dashboard
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseKey = 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const syncTransactions = async (transactions) => {
  if (!transactions || transactions.length === 0) return { success: true };
  
  try {
    const { data, error } = await supabase
      .from('transactions')
      .upsert(transactions, { onConflict: 'id' });
      
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Cloud Sync Error:', err);
    return { success: false, error: err.message };
  }
};
