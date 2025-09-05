import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/subscriptions';
const TEST_TOKEN = 'YOUR_TOKEN_HERE'; // Replace with actual token

async function testSubscriptionFlow() {
  console.log('🧪 Testing New Subscription Flow\n');

  try {
    // Step 1: Get available plans
    console.log('1️⃣ Getting subscription plans...');
    const plansResponse = await fetch(`${BASE_URL}/plans`);
    const plansData = await plansResponse.json();
    console.log('Plans:', plansData);
    console.log('');

    // Step 2: Check current status
    console.log('2️⃣ Checking subscription status...');
    const statusResponse = await fetch(`${BASE_URL}/status`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    const statusData = await statusResponse.json();
    console.log('Status:', JSON.stringify(statusData, null, 2));
    console.log('');

    // Step 3: Start trial (if possible)
    if (statusData.nextAction === 'start_trial') {
      console.log('3️⃣ Starting trial subscription...');
      const trialResponse = await fetch(`${BASE_URL}/start-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify({ planType: 'monthly' })
      });
      const trialData = await trialResponse.json();
      console.log('Trial started:', JSON.stringify(trialData, null, 2));
      console.log('');

      // Step 4: Check status again
      console.log('4️⃣ Checking status after trial start...');
      const statusResponse2 = await fetch(`${BASE_URL}/status`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      const statusData2 = await statusResponse2.json();
      console.log('Status after trial:', JSON.stringify(statusData2, null, 2));
      console.log('');

    } else if (statusData.nextAction === 'create_payment') {
      console.log('3️⃣ Creating payment order for expired trial...');
      const paymentResponse = await fetch(`${BASE_URL}/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      const paymentData = await paymentResponse.json();
      console.log('Payment order created:', JSON.stringify(paymentData, null, 2));
      console.log('');

    } else {
      console.log('3️⃣ No action needed. Current status:', statusData.status);
      console.log('');
    }

    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSubscriptionFlow();
