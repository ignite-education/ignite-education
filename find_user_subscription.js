import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const targetUserId = '545d73a2-419c-4224-b004-93b0b70624c6';

console.log('🔍 Searching for checkout sessions with userId:', targetUserId, '\n');

// Get recent checkout sessions
const sessions = await stripe.checkout.sessions.list({
  limit: 20
});

console.log(`Checking ${sessions.data.length} recent checkout sessions...\n`);

for (const session of sessions.data) {
  if (session.metadata?.userId === targetUserId) {
    console.log('✅ FOUND MATCHING SESSION!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎫 Session ID:', session.id);
    console.log('💳 Customer ID:', session.customer);
    console.log('📋 Subscription ID:', session.subscription);
    console.log('📧 Customer Email:', session.customer_details?.email);
    console.log('👤 Customer Name:', session.customer_details?.name);
    console.log('📊 Payment Status:', session.payment_status);
    console.log('📅 Created:', new Date(session.created * 1000).toISOString());
    console.log('');
    
    // This is the data we need to update the user
    console.log('📝 Data to add to user metadata:');
    console.log('  stripe_customer_id:', session.customer);
    console.log('  stripe_subscription_id:', session.subscription);
    console.log('');
  }
}

