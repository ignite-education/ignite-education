import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '545d73a2-419c-4224-b004-93b0b70624c6';
const customerId = 'cus_TR5ej0yaEq2eR0';
const subscriptionId = 'sub_1SUDTURxlg2WD2fjMblYwtAj';

console.log('🔄 Updating user metadata...\n');

const { data, error } = await supabase.auth.admin.updateUserById(
  userId,
  {
    user_metadata: {
      is_ad_free: true,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active'
    }
  }
);

if (error) {
  console.error('❌ Failed to update user:', error);
  process.exit(1);
}

console.log('✅ ============ UPDATE COMPLETE ============');
console.log('👤 User ID:', userId);
console.log('💳 Stripe Customer ID:', customerId);
console.log('📋 Stripe Subscription ID:', subscriptionId);
console.log('📊 Subscription Status: active');
console.log('✅ User metadata updated successfully!\n');
console.log('💡 User can now access billing portal');
console.log('🔄 User needs to refresh their session to see changes');

