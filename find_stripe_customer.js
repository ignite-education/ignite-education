import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔍 Searching for recent Stripe customers and subscriptions...\n');

// Get recent customers
const customers = await stripe.customers.list({
  limit: 10
});

console.log(`Found ${customers.data.length} recent customers:\n`);

for (const customer of customers.data) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💳 Customer ID:', customer.id);
  console.log('📧 Email:', customer.email);
  console.log('👤 Name:', customer.name || 'N/A');
  console.log('📅 Created:', new Date(customer.created * 1000).toISOString());
  
  // Get subscriptions for this customer
  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    limit: 5
  });
  
  if (subs.data.length > 0) {
    console.log('📋 Subscriptions:');
    for (const sub of subs.data) {
      console.log(`  - ${sub.id} (${sub.status})`);
      if (sub.metadata?.userId) {
        console.log(`    👤 User ID in metadata: ${sub.metadata.userId}`);
      }
    }
  }
  console.log('');
}

