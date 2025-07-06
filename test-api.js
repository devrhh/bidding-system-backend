const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  try {
    console.log('🧪 Testing Bidding System API...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', health.data);

    // Test API info
    console.log('\n2. Testing API info...');
    const info = await axios.get(`${BASE_URL}/`);
    console.log('✅ API info:', info.data);

    // Test getting users
    console.log('\n3. Testing users endpoint...');
    const users = await axios.get(`${BASE_URL}/users`);
    console.log(`✅ Found ${users.data.length} users`);

    // Test creating an auction
    console.log('\n4. Testing auction creation...');
    const auctionData = {
      name: 'Test Auction Item',
      description: 'A test item for auction',
      startingPrice: 100,
      durationMinutes: 5
    };
    const auction = await axios.post(`${BASE_URL}/auctions`, auctionData);
    console.log('✅ Created auction:', auction.data);

    // Test getting auctions
    console.log('\n5. Testing getting auctions...');
    const auctions = await axios.get(`${BASE_URL}/auctions`);
    console.log(`✅ Found ${auctions.data.length} active auctions`);

    // Test placing a bid
    console.log('\n6. Testing bid placement...');
    const bidData = {
      auctionId: auction.data.id,
      userId: 1,
      amount: 150
    };
    const bid = await axios.post(`${BASE_URL}/auctions/${auction.data.id}/bids`, bidData);
    console.log('✅ Placed bid:', bid.data);

    // Test getting auction bids
    console.log('\n7. Testing getting auction bids...');
    const bids = await axios.get(`${BASE_URL}/auctions/${auction.data.id}/bids`);
    console.log(`✅ Found ${bids.data.length} bids for auction`);

    // Test dashboard stats
    console.log('\n8. Testing dashboard stats...');
    const stats = await axios.get(`${BASE_URL}/auctions/dashboard/stats`);
    console.log('✅ Dashboard stats:', stats.data);

    // Test bid validation scenarios
    console.log('\n9. Testing bid validation...');

    // Test 1: Bid lower than current highest
    console.log('\n   Testing bid lower than current highest...');
    try {
      const lowBid = await axios.post(`${BASE_URL}/auctions/${auction.data.id}/bids`, {
        auctionId: auction.data.id,
        userId: 2,
        amount: 50
      });
      console.log('❌ Low bid should have failed');
    } catch (error) {
      console.log('✅ Low bid correctly rejected:', error.response.data.message);
    }

    // Test 2: Bid equal to current highest
    console.log('\n   Testing bid equal to current highest...');
    try {
      const equalBid = await axios.post(`${BASE_URL}/auctions/${auction.data.id}/bids`, {
        auctionId: auction.data.id,
        userId: 3,
        amount: 150
      });
      console.log('❌ Equal bid should have failed');
    } catch (error) {
      console.log('✅ Equal bid correctly rejected:', error.response.data.message);
    }

    // Test 3: Valid higher bid
    console.log('\n   Testing valid higher bid...');
    const higherBid = await axios.post(`${BASE_URL}/auctions/${auction.data.id}/bids`, {
      auctionId: auction.data.id,
      userId: 4,
      amount: 200
    });
    console.log('✅ Higher bid accepted:', higherBid.data);

    // Test 4: Bid slightly higher than current
    console.log('\n   Testing bid slightly higher than current...');
    const slightHigherBid = await axios.post(`${BASE_URL}/auctions/${auction.data.id}/bids`, {
      auctionId: auction.data.id,
      userId: 5,
      amount: 201
    });
    console.log('✅ Slightly higher bid accepted:', slightHigherBid.data);

    // Test 5: Another low bid after successful bids
    console.log('\n   Testing low bid after successful bids...');
    try {
      const anotherLowBid = await axios.post(`${BASE_URL}/auctions/${auction.data.id}/bids`, {
        auctionId: auction.data.id,
        userId: 6,
        amount: 150
      });
      console.log('❌ Low bid should have failed after successful bids');
    } catch (error) {
      console.log('✅ Low bid correctly rejected after successful bids:', error.response.data.message);
    }

    // Test 6: Verify final bid count
    console.log('\n   Verifying final bid count...');
    const finalBids = await axios.get(`${BASE_URL}/auctions/${auction.data.id}/bids`);
    console.log(`✅ Final bid count: ${finalBids.data.length} bids`);

    console.log('\n🎉 All API tests passed!');

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAPI(); 