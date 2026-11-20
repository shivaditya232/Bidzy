// Room tests for A3.2. Run with: npm test
// Uses its own database (bidzy_test_rooms).
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const {test,before,after}=require('node:test');
const assert=require('node:assert');
const mongoose=require('mongoose');

const User=require('../models/User');
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const Set=require('../models/Set');
const {createRoom,joinRoom,getMyRooms,getRoom,updateRoomSettings}=require('../controllers/roomController');
const {loadRoomMember,requireHost}=require('../middleware/roomMiddleware');

const TEST_DB='bidzy_test_rooms';
let host,alice,bob,outsider;

// run middleware + handler like Express would; resolve with {code, body}
const run=(handlers,{user,params={},body={}})=>new Promise((resolve)=>{
    const req={user:{id:user._id.toString()},params,body};
    const res={
        code:200,
        status(code){ this.code=code; return this; },
        json(body){ resolve({code:this.code,body}); }
    };
    let i=0;
    const next=()=>{ const h=handlers[i++]; h(req,res,next); };
    next();
});

const makeUser=(name)=>User.create({name,email:name.toLowerCase()+'@test.com',password:'x'});

before(async()=>{
    await mongoose.connect(process.env.MONGO_URI,{dbName:TEST_DB});
    assert.strictEqual(mongoose.connection.name,TEST_DB,'refusing to run outside the test database');
    await Promise.all([User.deleteMany({}),Room.deleteMany({}),Membership.deleteMany({}),Set.deleteMany({})]);
    await Promise.all([Room.syncIndexes(),Membership.syncIndexes(),User.syncIndexes(),Set.syncIndexes()]);
    [host,alice,bob,outsider]=await Promise.all(['Host','Alice','Bob','Outsider'].map(makeUser));
});

after(async()=>{
    await mongoose.disconnect();
});

let roomId,inviteCode;

test('create room: you become host, room gets defaults and an invite code',async()=>{
    const r=await run([createRoom],{user:host,body:{name:'  Friday League  '}});
    assert.strictEqual(r.code,201);
    const room=r.body.room;
    roomId=room._id.toString();
    inviteCode=room.inviteCode;
    assert.strictEqual(room.name,'Friday League');
    assert.match(inviteCode,/^[A-HJ-NP-Z2-9]{6}$/);
    assert.strictEqual(room.status,'lobby');
    assert.strictEqual(room.settings.purse,12000);
    assert.strictEqual(room.settings.timerSeconds,15);
    assert.strictEqual(room.settings.increments.length,4);

    const m=await Membership.findOne({room:roomId,user:host._id});
    assert.strictEqual(m.role,'host');

    const sets=await Set.find({room:roomId}).sort({sequence:1});
    assert.deepStrictEqual(sets.map(s=>s.name+':'+s.sequence),
        ['Marquee:1','Batsman Set 1:2','Allrounder Set 1:3','Bowler Set 1:4','Wicketkeeper Set 1:5'],
        'new room gets the 5 default sets in order');
});

test('create room validation',async()=>{
    assert.strictEqual((await run([createRoom],{user:host,body:{}})).code,400);
    assert.strictEqual((await run([createRoom],{user:host,body:{name:'X',settings:{timerSeconds:1}}})).code,400);
});

test('join by code (any casing) gives a team membership with the room purse',async()=>{
    const r=await run([joinRoom],{user:alice,body:{inviteCode:inviteCode.toLowerCase(),teamName:'Chennai'}});
    assert.strictEqual(r.code,201);
    assert.strictEqual(r.body.member.role,'team');
    assert.strictEqual(r.body.member.purseRemaining,12000);
    assert.strictEqual((await Room.findById(roomId)).teamCount,1);
});

test('join errors: bad code, already in, host joining own room, duplicate team name',async()=>{
    assert.strictEqual((await run([joinRoom],{user:bob,body:{inviteCode:'ZZZZZZ',teamName:'Mumbai'}})).code,404);
    assert.strictEqual((await run([joinRoom],{user:alice,body:{inviteCode,teamName:'Other'}})).code,400);
    assert.strictEqual((await run([joinRoom],{user:host,body:{inviteCode,teamName:'HostTeam'}})).code,400);

    const dup=await run([joinRoom],{user:bob,body:{inviteCode,teamName:'CHENNAI'}});
    assert.strictEqual(dup.code,400);
    assert.match(dup.body.message,/team name/);
    assert.strictEqual((await Room.findById(roomId)).teamCount,1,'a failed join gives its slot back');

    assert.strictEqual((await run([joinRoom],{user:bob,body:{inviteCode,teamName:'Mumbai'}})).code,201);
});

test('10 people join a room with 3 free slots at the same instant: exactly 3 get in',async()=>{
    const r=await run([createRoom],{user:host,body:{name:'Tiny Room',settings:{maxTeams:3}}});
    const tiny=r.body.room;
    const joiners=await Promise.all(Array.from({length:10},(_,i)=>makeUser('Joiner'+i)));

    const results=await Promise.all(joiners.map((u,i)=>run([joinRoom],{user:u,body:{inviteCode:tiny.inviteCode,teamName:'Team '+i}})));
    assert.strictEqual(results.filter(x=>x.code===201).length,3);
    assert.strictEqual(results.filter(x=>x.code===400&&x.body.message==='This room is full').length,7);
    assert.strictEqual((await Room.findById(tiny._id)).teamCount,3);
    assert.strictEqual(await Membership.countDocuments({room:tiny._id,role:'team'}),3);
});

test('room details: members only',async()=>{
    const r=await run([loadRoomMember,getRoom],{user:alice,params:{roomId}});
    assert.strictEqual(r.code,200);
    assert.strictEqual(r.body.me.role,'team');
    assert.strictEqual(r.body.members.length,3);

    assert.strictEqual((await run([loadRoomMember,getRoom],{user:outsider,params:{roomId}})).code,403);
    assert.strictEqual((await run([loadRoomMember,getRoom],{user:alice,params:{roomId:'not-an-id'}})).code,404);
});

test('my rooms lists every room with my role in it',async()=>{
    const r=await run([getMyRooms],{user:host});
    assert.strictEqual(r.code,200);
    assert.ok(r.body.length>=2);
    assert.ok(r.body.every(x=>x.myRole==='host'));
    const a=await run([getMyRooms],{user:alice});
    assert.strictEqual(a.body.length,1);
    assert.strictEqual(a.body[0].teamName,'Chennai');
});

test('settings: host only, validated, purse change reaches every team',async()=>{
    const settings=[loadRoomMember,requireHost,updateRoomSettings];
    assert.strictEqual((await run(settings,{user:alice,params:{roomId},body:{purse:500}})).code,403);
    assert.strictEqual((await run(settings,{user:host,params:{roomId},body:{increments:[{upTo:100,step:5},{upTo:50,step:10},{upTo:null,step:20}]}})).code,400,'bands must go up');
    assert.strictEqual((await run(settings,{user:host,params:{roomId},body:{maxTeams:1}})).code,400,'2 teams already in');

    const ok=await run(settings,{user:host,params:{roomId},body:{purse:500,timerSeconds:20,increments:[{upTo:50,step:2},{upTo:null,step:10}]}});
    assert.strictEqual(ok.code,200);
    assert.strictEqual(ok.body.room.settings.timerSeconds,20);
    const teams=await Membership.find({room:roomId,role:'team'});
    assert.ok(teams.every(t=>t.purse===500&&t.purseRemaining===500));
});

test('settings and joining are locked once the auction starts',async()=>{
    await Room.updateOne({_id:roomId},{$set:{status:'live'}});
    const r=await run([loadRoomMember,requireHost,updateRoomSettings],{user:host,params:{roomId},body:{purse:900}});
    assert.strictEqual(r.code,409);
    const late=await run([joinRoom],{user:outsider,body:{inviteCode,teamName:'Late'}});
    assert.strictEqual(late.code,400);
    assert.match(late.body.message,/already started/);
});
