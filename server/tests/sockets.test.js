// Socket tests for A3.4: login required to connect, members-only rooms, events stay inside their room.
// Run with: npm test. Uses its own database (bidzy_test_sockets) and a real server on a random port.
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const {test,before,after}=require('node:test');
const assert=require('node:assert');
const http=require('http');
const mongoose=require('mongoose');
const jwt=require('jsonwebtoken');
const {io:connectClient}=require('socket.io-client');

const socketConfig=require('../config/socket');
const User=require('../models/User');
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const Player=require('../models/Player');
const Set=require('../models/Set');
const AuctionSession=require('../models/AuctionSession');
const Bid=require('../models/Bid');
const {placeBid,autoAdvanceTimer}=require('../controllers/auctionController');

const TEST_DB='bidzy_test_sockets';
let server,url;
const openSockets=[];

const tokenFor=(user)=>jwt.sign({id:user._id},process.env.JWT_SECRET);

// connect and resolve with the socket, or reject with the server's refusal message
const connect=(token)=>new Promise((resolve,reject)=>{
    const s=connectClient(url,{auth:token ? {token} : {},transports:['websocket'],reconnection:false,forceNew:true});
    openSockets.push(s);
    s.on('connect',()=>resolve(s));
    s.on('connect_error',(err)=>reject(err));
});

const joinRoom=(s,roomId)=>new Promise((resolve)=>s.emit('join-room',roomId,resolve));

// collect every event of one name a socket receives
const record=(s,event)=>{
    const got=[];
    s.on(event,(data)=>got.push(data));
    return got;
};

const wait=(ms)=>new Promise(r=>setTimeout(r,ms));

const makeRoom=async(name)=>{
    const host=await User.create({name:name+' host',email:`${name}-host@test.com`,password:'x'});
    const teamUser=await User.create({name:name+' team',email:`${name}-team@test.com`,password:'x'});
    const room=await Room.create({name,inviteCode:name.slice(0,6).toUpperCase(),host:host._id,teamCount:1});
    await Membership.create({room:room._id,user:host._id,role:'host'});
    const team=await Membership.create({room:room._id,user:teamUser._id,role:'team',teamName:name+' XI',purse:1000,purseRemaining:1000});
    const set=await Set.create({room:room._id,name:'S',sequence:1});
    const player=await Player.create({room:room._id,name:name+' star',role:'Batsman',basePrice:50,order:1,set:set._id,status:'live'});
    await AuctionSession.create({room:room._id,currentPlayer:player._id,currentPrice:50,status:'live',timerEndsAt:new Date(Date.now()+60000)});
    return {room,host,teamUser,team};
};

before(async()=>{
    clearInterval(autoAdvanceTimer);
    await mongoose.connect(process.env.MONGO_URI,{dbName:TEST_DB});
    assert.strictEqual(mongoose.connection.name,TEST_DB,'refusing to run outside the test database');
    await Promise.all([User,Room,Membership,Player,Set,AuctionSession,Bid].map(m=>m.deleteMany({})));

    server=http.createServer();
    socketConfig.init(server);
    await new Promise(r=>server.listen(0,r));
    url=`http://localhost:${server.address().port}`;
});

after(async()=>{
    clearInterval(autoAdvanceTimer);
    openSockets.forEach(s=>s.close());
    socketConfig.getIO().close();
    await new Promise(r=>server.close(r));
    await mongoose.disconnect();
});

test('no token or a forged token: connection refused',async()=>{
    await assert.rejects(connect(null),/No token provided/);
    const forged=jwt.sign({id:new mongoose.Types.ObjectId()},'not-the-real-secret');
    await assert.rejects(connect(forged),/Invalid or expired token/);
    const ghost=jwt.sign({id:new mongoose.Types.ObjectId()},process.env.JWT_SECRET);
    await assert.rejects(connect(ghost),/Account no longer exists/);
});

test('you can only join rooms you are a member of',async()=>{
    const A=await makeRoom('apple');
    const B=await makeRoom('berry');
    const s=await connect(tokenFor(A.teamUser));

    const ok=await joinRoom(s,A.room._id.toString());
    assert.deepStrictEqual(ok,{ok:true,role:'team'});

    const no=await joinRoom(s,B.room._id.toString());
    assert.strictEqual(no.ok,false);
    const junk=await joinRoom(s,'not-an-id');
    assert.strictEqual(junk.ok,false);
});

test('a bid in room A reaches room A only',async()=>{
    const A=await makeRoom('cedar');
    const B=await makeRoom('daisy');

    const aHost=await connect(tokenFor(A.host));
    const aTeam=await connect(tokenFor(A.teamUser));
    const bTeam=await connect(tokenFor(B.teamUser));
    await Promise.all([joinRoom(aHost,A.room._id.toString()),joinRoom(aTeam,A.room._id.toString()),joinRoom(bTeam,B.room._id.toString())]);

    const seenByAHost=record(aHost,'bid-placed');
    const seenByATeam=record(aTeam,'bid-placed');
    const seenByB=record(bTeam,'bid-placed');

    // place a real bid in room A through the controller
    const r=await new Promise((resolve)=>{
        const res={code:200,status(c){this.code=c;return this;},json(b){resolve({code:this.code,body:b});}};
        placeBid({room:A.room,member:A.team,user:{id:A.teamUser._id.toString()}},res);
    });
    assert.strictEqual(r.code,200);
    await wait(500);

    assert.strictEqual(seenByAHost.length,1,'host of A sees the bid');
    assert.strictEqual(seenByATeam.length,1,'team of A sees the bid');
    assert.strictEqual(seenByAHost[0].currentPrice,55);
    assert.strictEqual(seenByB.length,0,'room B hears nothing');
});

test('switching rooms leaves the old one',async()=>{
    const A=await makeRoom('eagle');
    const B=await makeRoom('fjord');
    // one user who is a team in both rooms
    const both=await User.create({name:'Both',email:'both@test.com',password:'x'});
    await Membership.create({room:A.room._id,user:both._id,role:'team',teamName:'Both A',purse:10,purseRemaining:10});
    await Membership.create({room:B.room._id,user:both._id,role:'team',teamName:'Both B',purse:10,purseRemaining:10});

    const s=await connect(tokenFor(both));
    await joinRoom(s,A.room._id.toString());
    await joinRoom(s,B.room._id.toString());
    const seen=record(s,'test-event');

    socketConfig.emitToRoom(A.room._id,'test-event',{from:'A'});
    socketConfig.emitToRoom(B.room._id,'test-event',{from:'B'});
    await wait(400);
    assert.deepStrictEqual(seen.map(e=>e.from),['B'],'only the room joined last');
});
