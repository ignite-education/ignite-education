import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '545d73a2-419c-4224-b004-93b0b70624c6';
const userEmail = 'maxshillam@test.co.uk';

console.log('🔍 Searching Stripe for customer with email:', userEmail);

// Search for customer by email
const customers = await stripe.customers.list({
  email: userEmail,
  limit: 1
});

if (customers.data.length === 0) {
  console.error('❌ No Stripe customer found for this email');
  process.exit(1);
}

const customer = customers.data[0];
console.log('✅ Found Stripe customer:', customer.id);

// Get active subscriptions for this customer
const subscriptions = await stripe.subscriptions.list({
  customer: customer.id,
  status: 'active',
  limit: 1
});

if (subscriptions.data.length === 0) {
  console.error('❌ No active subscriptions found for this customer');
  process.exit(1);
}

const subscription = subscriptions.data[0];
console.log('✅ Found active subscription:', subscription.id);
console.log('📊 Subscription status:', subscription.status);

// Update Supabase user metadata
console.log('\n🔄 Updating user metadata in Supabase...');

const { data, error } = await supabase.auth.admin.updateUserById(
  userId,
  {
    user_metadata: {
      is_ad_free: true,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status
    }
  }
);

if (error) {
  console.error('❌ Failed to update user:', error);
  process.exit(1);
}

console.log('\n✅ ============ BACKFILL COMPLETE ============');
console.log('👤 User ID:', userId);
console.log('💳 Stripe Customer ID:', customer.id);
console.log('📋 Stripe Subscription ID:', subscription.id);
console.log('📊 Subscription Status:', subscription.status);
console.log('✅ User metadata updated successfully!\n');
console.log('💡 User can now access billing portal');

