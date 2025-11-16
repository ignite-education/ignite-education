import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '545d73a2-419c-4224-b004-93b0b70624c6';

console.log('Checking user subscription data...\n');

const { data, error } = await supabase.auth.admin.getUserById(userId);

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ USER SUBSCRIPTION CHECK:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 User ID:', userId);
  console.log('📧 Email:', data.user.email);
  console.log('');
  console.log('📦 Current metadata:');
  console.log('  is_ad_free:', data.user.user_metadata?.is_ad_free);
  console.log('  stripe_customer_id:', data.user.user_metadata?.stripe_customer_id || '❌ MISSING');
  console.log('  stripe_subscription_id:', data.user.user_metadata?.stripe_subscription_id || '❌ MISSING');
  console.log('  subscription_status:', data.user.user_metadata?.subscription_status || '❌ MISSING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!data.user.user_metadata?.stripe_customer_id) {
    console.log('⚠️  This user needs their Stripe customer ID added to metadata');
    console.log('💡 We can fetch it from Stripe using their email');
  }
}
