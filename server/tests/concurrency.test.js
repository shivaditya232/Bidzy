// Concurrency test for A2. Run with: npm test
// Uses a separate database (bidzy_test) so real data is never touched.
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const {test,before,after}=require('node:test');
const assert=require('node:assert');
const http=require('http');
const mongoose=require('mongoose');
const socketConfig=require('../config/socket');
socketConfig.init(http.createServer()); // controllers call getIO().emit, so it must exist

const AuctionSession=require('../models/AuctionSession');
const Player=require('../models/Player');
const User=require('../models/User');
const Bid=require('../models/Bid');
const Set=require('../models/Set');
const {placeBid,finalizeAndAdvance,autoAdvanceTimer}=require('../controllers/auctionController');

const TEST_DB='bidzy_test';
const TEAM_COUNT=20;
let teams=[];
let players=[];

// call the real controller with a fake req/res, resolve with {code, body}
const callPlaceBid=(teamId)=>new Promise((resolve)=>{
    const res={
        code:200,
        status(code){ this.code=code; return this; },
        json(body){ resolve({code:this.code,body}); }
    };
    placeBid({user:{id:teamId.toString(),role:'team'}},res);
});

before(async()=>{
    // stop the 1s auto-advance loop; otherwise it creates its own empty session before ours exists
    clearInterval(autoAdvanceTimer);
    await mongoose.connect(process.env.MONGO_URI,{dbName:TEST_DB});
    assert.strictEqual(mongoose.connection.name,TEST_DB,'refusing to run outside the test database');

    await Promise.all([AuctionSession.deleteMany({}),Player.deleteMany({}),User.deleteMany({}),Bid.deleteMany({}),Set.deleteMany({})]);

    const set=await Set.create({name:'Test Set',sequence:1});
    players=await Player.create([
        {name:'Test Player A',role:'Batsman',basePrice:50,order:1,set:set._id,status:'live'},
        {name:'Test Player B',role:'Bowler',basePrice:50,order:2,set:set._id}
    ]);

    const teamDocs=[];
    for(let i=0;i<TEAM_COUNT;i++){
        teamDocs.push({name:'Team '+i,email:'team'+i+'@test.com',password:'x',role:'team',teamName:'Team '+i,purse:1000,purseRemaining:1000});
    }
    teams=await User.create(teamDocs);

    await AuctionSession.create({
        currentPlayer:players[0]._id,
        currentPrice:50,
        status:'live',
        timerEndsAt:new Date(Date.now()+60*1000)
    });
});

after(async()=>{
    clearInterval(autoAdvanceTimer);
    await mongoose.disconnect();
});

test('parallel bids: exactly one winner per price step',async()=>{
    const ROUNDS=5;
    const winningAmounts=[];

    for(let round=1;round<=ROUNDS;round++){
        const session=await AuctionSession.findOne();
        // every team except the current highest bidder presses "bid" at the same time
        const bidders=teams.filter(t=>!session.highestBidder || t._id.toString()!==session.highestBidder.toString());
        const results=await Promise.all(bidders.map(t=>callPlaceBid(t._id)));

        const winners=results.filter(r=>r.code===200);
        const others=results.filter(r=>r.code!==200);
        assert.ok(winners.length>=1,`round ${round}: someone should win`);
        // a request that reads AFTER a winner wrote can legally bid one step higher, so >1 winners is fine,
        // as long as every loser got a clean rejection and no two winners share an amount
        for(const r of others){
            assert.ok([409,400].includes(r.code),`round ${round}: unexpected ${r.code} ${r.body.message}`);
        }
        winningAmounts.push(...winners.map(r=>r.body.session.currentPrice));
    }

    // the real guarantee: each price step has exactly one winner (old code gave two 200s for the same amount)
    const sorted=[...winningAmounts].sort((a,b)=>a-b);
    assert.strictEqual(new globalThis.Set(sorted).size,sorted.length,`two bids won the same price step: ${sorted.join(', ')}`);
    sorted.forEach((amount,i)=>assert.strictEqual(amount,55+i*5,`price steps should be 55, 60, 65... got ${sorted.join(', ')}`));

    const finalSession=await AuctionSession.findOne();
    assert.strictEqual(finalSession.currentPrice,sorted[sorted.length-1],'final price = last accepted bid');
    const bidCount=await Bid.countDocuments({player:players[0]._id});
    assert.strictEqual(bidCount,sorted.length,'one Bid document per accepted bid');
    console.log(`  accepted ${sorted.length} bids across ${ROUNDS} rounds: ${sorted.join(', ')}`);
});


test('finalize fired many times at once: purse deducted exactly once',async()=>{
    const session=await AuctionSession.findOne();
    const winnerId=session.highestBidder;
    const price=session.currentPrice;
    const purseBefore=(await User.findById(winnerId)).purseRemaining;

    // pretend the timer just ran out, then fire finalize 10 times in parallel (like overlapping ticks)
    await AuctionSession.updateOne({_id:session._id},{$set:{timerEndsAt:new Date(Date.now()-1000)}});
    await Promise.all(Array.from({length:10},()=>finalizeAndAdvance()));

    const purseAfter=(await User.findById(winnerId)).purseRemaining;
    assert.strictEqual(purseAfter,purseBefore-price,'purse must be deducted exactly once');

    const soldPlayer=await Player.findById(players[0]._id);
    assert.strictEqual(soldPlayer.status,'sold');
    assert.strictEqual(soldPlayer.soldPrice,price);

    const advanced=await AuctionSession.findOne();
    assert.strictEqual(advanced.currentPlayer.toString(),players[1]._id.toString(),'session should move to the next player once');
    assert.strictEqual(advanced.currentPrice,50);
    assert.strictEqual((await Player.findById(players[1]._id)).status,'live');
});

test('late bid after the timer ends is rejected',async()=>{
    await AuctionSession.updateOne({},{$set:{timerEndsAt:new Date(Date.now()-1000)}});
    const result=await callPlaceBid(teams[0]._id);
    assert.strictEqual(result.code,400);
    assert.strictEqual(result.body.message,'The time is over');
});
