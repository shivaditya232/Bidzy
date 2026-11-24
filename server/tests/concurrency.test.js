// Concurrency tests (A2, now per room after A3.3). Run with: npm test
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
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const Bid=require('../models/Bid');
const Set=require('../models/Set');
const {placeBid,startAuction,finalizeAndAdvance,getCurrentAuction,resetAuction,autoAdvanceTimer}=require('../controllers/auctionController');

const TEST_DB='bidzy_test';
const TEAM_COUNT=20;

// builds a room with a host, N teams, a set and players. returns everything the tests need.
const makeRoom=async(name,teamCount,playerNames,purse=1000)=>{
    const host=await User.create({name:name+' host',email:`${name}-host@test.com`,password:'x'});
    const room=await Room.create({name,inviteCode:name.slice(0,6).toUpperCase(),host:host._id,teamCount,settings:{purse,timerSeconds:15}});
    await Membership.create({room:room._id,user:host._id,role:'host'});
    const users=await User.create(Array.from({length:teamCount},(_,i)=>({name:`${name} ${i}`,email:`${name}-${i}@test.com`,password:'x'})));
    const members=await Membership.create(users.map((u,i)=>({room:room._id,user:u._id,role:'team',teamName:`${name} Team ${i}`,purse,purseRemaining:purse})));
    const set=await Set.create({room:room._id,name:'Test Set',sequence:1});
    const players=await Player.create(playerNames.map((p,i)=>({room:room._id,name:p,role:'Batsman',basePrice:50,order:i+1,set:set._id})));
    return {room,host,members,players};
};

// call the real controller with a fake req/res, resolve with {code, body}
const callAs=(handler,room,member)=>new Promise((resolve)=>{
    const res={
        code:200,
        status(code){ this.code=code; return this; },
        json(body){ resolve({code:this.code,body}); }
    };
    handler({room,member,user:{id:member.user.toString()}},res);
});

let A; // the main room

before(async()=>{
    // stop the 1s auto-advance loop; tests call finalizeAndAdvance themselves
    clearInterval(autoAdvanceTimer);
    await mongoose.connect(process.env.MONGO_URI,{dbName:TEST_DB});
    assert.strictEqual(mongoose.connection.name,TEST_DB,'refusing to run outside the test database');

    await Promise.all([AuctionSession,Player,User,Room,Membership,Bid,Set].map(m=>m.deleteMany({})));
    await Promise.all([AuctionSession,Set,Membership,Room].map(m=>m.syncIndexes()));

    A=await makeRoom('alpha',TEAM_COUNT,['Test Player A','Test Player B']);
    const hostMember=await Membership.findOne({room:A.room._id,role:'host'});
    const r=await callAs(startAuction,A.room,hostMember);
    assert.strictEqual(r.code,200,'auction should start');
});

after(async()=>{
    clearInterval(autoAdvanceTimer);
    await mongoose.disconnect();
});

test('starting twice at once: only one start wins',async()=>{
    const B=await makeRoom('double',2,['P1']);
    const hostMember=await Membership.findOne({room:B.room._id,role:'host'});
    const results=await Promise.all(Array.from({length:5},()=>callAs(startAuction,B.room,hostMember)));
    assert.strictEqual(results.filter(r=>r.code===200).length,1);
});

test('parallel bids: exactly one winner per price step',async()=>{
    const ROUNDS=5;
    const winningAmounts=[];

    for(let round=1;round<=ROUNDS;round++){
        const session=await AuctionSession.findOne({room:A.room._id});
        // every team except the current highest bidder presses "bid" at the same time
        const bidders=A.members.filter(m=>!session.highestBidder || m._id.toString()!==session.highestBidder.toString());
        const results=await Promise.all(bidders.map(m=>callAs(placeBid,A.room,m)));

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

    const finalSession=await AuctionSession.findOne({room:A.room._id});
    assert.strictEqual(finalSession.currentPrice,sorted[sorted.length-1],'final price = last accepted bid');
    const bidCount=await Bid.countDocuments({room:A.room._id,player:A.players[0]._id});
    assert.strictEqual(bidCount,sorted.length,'one Bid document per accepted bid');
    console.log(`  accepted ${sorted.length} bids across ${ROUNDS} rounds: ${sorted.join(', ')}`);

    // the board's bid feed after a reload: the latest bids on this player, newest first
    const current=await callAs(getCurrentAuction,A.room,A.members[0]);
    const feed=current.body.recentBids.map(b=>b.amount);
    assert.deepStrictEqual(feed,[...sorted].reverse().slice(0,5),'recentBids = last 5 bids, newest first');
});

test('finalize fired many times at once: purse deducted exactly once',async()=>{
    const session=await AuctionSession.findOne({room:A.room._id});
    const winnerId=session.highestBidder;
    const price=session.currentPrice;
    const purseBefore=(await Membership.findById(winnerId)).purseRemaining;

    // pretend the timer just ran out, then fire finalize 10 times in parallel (like overlapping ticks)
    await AuctionSession.updateOne({_id:session._id},{$set:{timerEndsAt:new Date(Date.now()-1000)}});
    await Promise.all(Array.from({length:10},()=>finalizeAndAdvance(A.room._id)));

    const purseAfter=(await Membership.findById(winnerId)).purseRemaining;
    assert.strictEqual(purseAfter,purseBefore-price,'purse must be deducted exactly once');

    const soldPlayer=await Player.findById(A.players[0]._id);
    assert.strictEqual(soldPlayer.status,'sold');
    assert.strictEqual(soldPlayer.soldPrice,price);

    const advanced=await AuctionSession.findOne({room:A.room._id});
    assert.strictEqual(advanced.currentPlayer.toString(),A.players[1]._id.toString(),'session should move to the next player once');
    assert.strictEqual(advanced.currentPrice,50);
    assert.strictEqual((await Player.findById(A.players[1]._id)).status,'live');
});

test('late bid after the timer ends is rejected',async()=>{
    await AuctionSession.updateOne({room:A.room._id},{$set:{timerEndsAt:new Date(Date.now()-1000)}});
    const result=await callAs(placeBid,A.room,A.members[0]);
    assert.strictEqual(result.code,400);
    assert.strictEqual(result.body.message,'The time is over');
});

test('two rooms at the same time: bids and sales never cross over',async()=>{
    const X=await makeRoom('xray',5,['X Star']);
    const Y=await makeRoom('yank',5,['Y Star'],500);
    // room Y uses its own bands: +50 every step
    await Room.updateOne({_id:Y.room._id},{$set:{'settings.increments':[{upTo:null,step:50}]}});
    Y.room=await Room.findById(Y.room._id);

    const [hx,hy]=await Promise.all([X,Y].map(r=>Membership.findOne({room:r.room._id,role:'host'})));
    const started=await Promise.all([callAs(startAuction,X.room,hx),callAs(startAuction,Y.room,hy)]);
    assert.deepStrictEqual(started.map(r=>r.code),[200,200]);

    // both rooms bid in the same burst
    const burst=await Promise.all([
        ...X.members.map(m=>callAs(placeBid,X.room,m)),
        ...Y.members.map(m=>callAs(placeBid,Y.room,m))
    ]);
    assert.strictEqual(burst.slice(0,5).filter(r=>r.code===200).length>=1,true);
    assert.strictEqual(burst.slice(5).filter(r=>r.code===200).length>=1,true);

    const [sx,sy]=await Promise.all([X,Y].map(r=>AuctionSession.findOne({room:r.room._id})));
    assert.strictEqual((sx.currentPrice-50)%5,0,'room X used +5 steps');
    assert.strictEqual((sy.currentPrice-50)%50,0,'room Y used its own +50 steps');
    assert.ok(X.members.some(m=>m._id.equals(sx.highestBidder)),'X leader is an X team');
    assert.ok(Y.members.some(m=>m._id.equals(sy.highestBidder)),'Y leader is a Y team');

    // remember Y's leader so we can check the sale went to them
    const leaderBefore=sy.highestBidder.toString();

    // both timers run out; finalize both rooms in parallel like the timer loop does
    await AuctionSession.updateMany({room:{$in:[X.room._id,Y.room._id]}},{$set:{timerEndsAt:new Date(Date.now()-1000)}});
    await Promise.all([finalizeAndAdvance(X.room._id),finalizeAndAdvance(Y.room._id),finalizeAndAdvance(X.room._id),finalizeAndAdvance(Y.room._id)]);

    const [px,py]=await Promise.all([Player.findById(X.players[0]._id),Player.findById(Y.players[0]._id)]);
    assert.strictEqual(px.status,'sold');
    assert.strictEqual(py.status,'sold');
    assert.ok(px.soldTo.equals(sx.highestBidder));
    assert.strictEqual(py.soldTo.toString(),leaderBefore);
    assert.strictEqual(px.soldPrice,sx.currentPrice);
    assert.strictEqual(py.soldPrice,sy.currentPrice);

    const [wx,wy]=await Promise.all([Membership.findById(sx.highestBidder),Membership.findById(sy.highestBidder)]);
    assert.strictEqual(wx.purseRemaining,1000-sx.currentPrice,'X winner paid once from the X purse');
    assert.strictEqual(wy.purseRemaining,500-sy.currentPrice,'Y winner paid once from the Y purse');

    // each room had one player, so both auctions end on their own
    const [rx,ry]=await Promise.all([Room.findById(X.room._id),Room.findById(Y.room._id)]);
    assert.strictEqual(rx.status,'ended');
    assert.strictEqual(ry.status,'ended');
    // and room A's auction was not touched by any of this
    const a=await AuctionSession.findOne({room:A.room._id});
    assert.strictEqual(a.status,'live');
});

test('reset clears the old bids, so a new round starts with an empty bid feed',async()=>{
    const R=await makeRoom('resetfeed',2,['Feed Player']);
    const hostMember=await Membership.findOne({room:R.room._id,role:'host'});
    assert.strictEqual((await callAs(startAuction,R.room,hostMember)).code,200);
    assert.strictEqual((await callAs(placeBid,R.room,R.members[0])).code,200);
    assert.strictEqual(await Bid.countDocuments({room:R.room._id}),1);

    assert.strictEqual((await callAs(resetAuction,R.room,hostMember)).code,200);
    assert.strictEqual(await Bid.countDocuments({room:R.room._id}),0,'old bids are gone after a reset');

    const lobbyRoom=await Room.findById(R.room._id);
    assert.strictEqual((await callAs(startAuction,lobbyRoom,hostMember)).code,200);
    const current=await callAs(getCurrentAuction,lobbyRoom,R.members[0]);
    assert.deepStrictEqual(current.body.recentBids,[],'the same player up again shows no bids from the last round');
});
