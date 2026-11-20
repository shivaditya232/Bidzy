// IPL rules tests (A4). Run with: npm test
// Part 1 tests checkBid on its own (no database). Part 2 goes through the real controllers (bidzy_test_rules DB).
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const {test,before,after}=require('node:test');
const assert=require('node:assert');
const http=require('http');
const mongoose=require('mongoose');
const socketConfig=require('../config/socket');
socketConfig.init(http.createServer());

const {checkBid,isOverseas}=require('../utils/auctionRules');
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const User=require('../models/User');
const Player=require('../models/Player');
const SetModel=require('../models/Set');
const AuctionSession=require('../models/AuctionSession');
const Bid=require('../models/Bid');
const {placeBid,autoAdvanceTimer}=require('../controllers/auctionController');
const {updateRoomSettings,getMembers}=require('../controllers/roomController');

const RULES={...Room.DEFAULT_RULES}; // min 19, max 25, overseas 5..8, min price 20, India
const home={country:'India'};
const away={country:'Australia'};

// ---------- part 1: checkBid on its own ----------

test('overseas = any country that is not the home country',()=>{
    assert.strictEqual(isOverseas({country:'Australia'},RULES),true);
    assert.strictEqual(isOverseas({country:'india'},RULES),false,'case does not matter');
    assert.strictEqual(isOverseas({country:''},RULES),false,'no country = home player');
    assert.strictEqual(isOverseas({},RULES),false);
});

test('a normal early bid is allowed',()=>{
    assert.strictEqual(checkBid({rules:RULES,squad:{size:0,overseas:0},player:home,purseRemaining:12000,amount:200}),null);
});

test('squad max: 25 players = no more bids',()=>{
    assert.match(checkBid({rules:RULES,squad:{size:25,overseas:8},player:home,purseRemaining:5000,amount:20}),/squad is full/);
    assert.strictEqual(checkBid({rules:RULES,squad:{size:24,overseas:8},player:home,purseRemaining:5000,amount:20}),null,'24 can still buy one more');
});

test('overseas max: 8 overseas = no more overseas, home players still fine',()=>{
    assert.match(checkBid({rules:RULES,squad:{size:10,overseas:8},player:away,purseRemaining:5000,amount:20}),/maximum 8 overseas/);
    assert.strictEqual(checkBid({rules:RULES,squad:{size:10,overseas:8},player:home,purseRemaining:5000,amount:20}),null);
});

test('overseas min: must leave spots to reach 5 overseas',()=>{
    // 22 players, only 2 overseas: 3 spots left and 3 overseas still needed -> a home player would make it impossible
    assert.match(checkBid({rules:RULES,squad:{size:22,overseas:2},player:home,purseRemaining:5000,amount:20}),/Keep 3 squad spots for overseas/);
    // an overseas player is fine (it helps)
    assert.strictEqual(checkBid({rules:RULES,squad:{size:22,overseas:2},player:away,purseRemaining:5000,amount:20}),null);
    // with 3 overseas, a home player still leaves 2 spots for the 2 needed
    assert.strictEqual(checkBid({rules:RULES,squad:{size:22,overseas:3},player:home,purseRemaining:5000,amount:20}),null);
});

test('purse reserve: keep enough for the rest of the minimum squad',()=>{
    // empty squad, purse 1000: after this buy you still need 18 players x 20 = 360 -> can spend up to 640
    assert.strictEqual(checkBid({rules:RULES,squad:{size:0,overseas:0},player:away,purseRemaining:1000,amount:640}),null);
    assert.match(checkBid({rules:RULES,squad:{size:0,overseas:0},player:away,purseRemaining:1000,amount:645}),/keep 360 in your purse for the 18 more players/);
    // once you have 19, no reserve is needed
    assert.strictEqual(checkBid({rules:RULES,squad:{size:19,overseas:5},player:home,purseRemaining:100,amount:100}),null);
});

test('purse reserve also counts overseas players still needed',()=>{
    // 18 players, 0 overseas, squad min would be met at 19 but 5 overseas are still needed
    // buying an overseas player: 4 overseas still needed -> reserve 4 x 20 = 80
    assert.match(checkBid({rules:RULES,squad:{size:18,overseas:0},player:away,purseRemaining:100,amount:25}),/keep 80/);
    assert.strictEqual(checkBid({rules:RULES,squad:{size:18,overseas:0},player:away,purseRemaining:100,amount:20}),null);
});

// ---------- part 2: through the real controllers ----------

const TEST_DB='bidzy_test_rules';
const run=(handlers,req)=>new Promise((resolve)=>{
    const res={code:200,status(c){this.code=c;return this;},json(b){resolve({code:this.code,body:b});}};
    let i=0; const next=()=>handlers[i++](req,res,next); next();
});
let room,host,hostMember,team,set;

before(async()=>{
    clearInterval(autoAdvanceTimer);
    await mongoose.connect(process.env.MONGO_URI,{dbName:TEST_DB});
    assert.strictEqual(mongoose.connection.name,TEST_DB,'refusing to run outside the test database');
    await Promise.all([Room,Membership,User,Player,SetModel,AuctionSession,Bid].map(m=>m.deleteMany({})));

    host=await User.create({name:'Host',email:'host@rules.test',password:'x'});
    const teamUser=await User.create({name:'Team',email:'team@rules.test',password:'x'});
    room=await Room.create({name:'Rules Room',inviteCode:'RULES1',host:host._id,teamCount:1,status:'live'});
    hostMember=await Membership.create({room:room._id,user:host._id,role:'host'});
    team=await Membership.create({room:room._id,user:teamUser._id,role:'team',teamName:'Rules XI',purse:12000,purseRemaining:5000});
    set=await SetModel.create({room:room._id,name:'S',sequence:1});
});

after(async()=>{
    clearInterval(autoAdvanceTimer);
    await mongoose.disconnect();
});

// give the team `n` bought players, `overseas` of them from abroad
const giveSquad=async(n,overseas)=>{
    await Player.deleteMany({room:room._id,status:'sold'});
    await Player.create(Array.from({length:n},(_,i)=>({room:room._id,name:'Bought '+i,role:'Batsman',basePrice:20,order:100+i,set:set._id,status:'sold',soldPrice:20,soldTo:team._id,country:i<overseas?'England':'India'})));
};
// put one player up for bidding
const liveAuctionOn=async(country)=>{
    await Player.deleteMany({room:room._id,status:{$ne:'sold'}});
    await AuctionSession.deleteMany({room:room._id});
    const p=await Player.create({room:room._id,name:'Up Now',role:'Bowler',basePrice:50,order:1,set:set._id,status:'live',country});
    await AuctionSession.create({room:room._id,currentPlayer:p._id,currentPrice:50,status:'live',timerEndsAt:new Date(Date.now()+60000)});
};
const bid=()=>run([placeBid],{room,member:team,user:{id:team.user.toString()}});

test('placeBid: full squad is refused with a clear message',async()=>{
    await giveSquad(25,8);
    await liveAuctionOn('India');
    const r=await bid();
    assert.strictEqual(r.code,400);
    assert.match(r.body.message,/squad is full/);
});

test('placeBid: 9th overseas player refused, home player allowed',async()=>{
    await giveSquad(10,8);
    await liveAuctionOn('South Africa');
    assert.match((await bid()).body.message,/maximum 8 overseas/);
    await liveAuctionOn('India');
    assert.strictEqual((await bid()).code,200);
});

test('settings: host can change rules; bad combinations are refused',async()=>{
    await Room.updateOne({_id:room._id},{$set:{status:'lobby'}});
    room=await Room.findById(room._id);
    const send=(body)=>run([updateRoomSettings],{room,member:hostMember,user:{id:host._id.toString()},params:{roomId:room._id.toString()},body});

    const ok=await send({rules:{squadMin:18,overseasMax:6}});
    assert.strictEqual(ok.code,200);
    assert.deepStrictEqual([ok.body.room.settings.rules.squadMin,ok.body.room.settings.rules.squadMax,ok.body.room.settings.rules.overseasMax],[18,25,6],'partial update keeps the other rules');

    room=await Room.findById(room._id);
    assert.match((await send({rules:{squadMin:30}})).body.message,/minimum cannot be more than the maximum/);
    assert.match((await send({rules:{overseasMin:7}})).body.message,/Overseas minimum cannot be more/);
    assert.match((await send({purse:100})).body.message,/can't buy 18 players at 20 each/,'purse change is checked against the rules');
});

test('members list shows each team squad size and overseas count',async()=>{
    await giveSquad(6,2);
    const r=await run([getMembers],{room,member:hostMember});
    assert.strictEqual(r.code,200);
    assert.strictEqual(r.body[0].squadSize,6);
    assert.strictEqual(r.body[0].overseasCount,2);
});
