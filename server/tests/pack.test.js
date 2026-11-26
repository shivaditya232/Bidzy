// B2 tests: player photos (link or small upload) and the IPL 2026 pack. Run with: npm test
// Uses its own database (bidzy_test_pack).
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const {test,before,after}=require('node:test');
const assert=require('node:assert');
const mongoose=require('mongoose');
require('../config/socket').init(require('http').createServer());

const User=require('../models/User');
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const Set=require('../models/Set');
const Player=require('../models/Player');
const {createRoom,joinRoom}=require('../controllers/roomController');
const {createPlayer,updatePlayer}=require('../controllers/playerController');
const {getPack,loadPack}=require('../controllers/packController');
const {loadRoomMember,requireHost}=require('../middleware/roomMiddleware');
const {checkImage,cleanCredit}=require('../utils/playerImage');
const {planPackLoad,packGroups}=require('../utils/playerPack');
const pack=require('../data/iplPlayers2026.json');

const TEST_DB='bidzy_test_pack';
let host,team,roomId;

const run=(handlers,{user,params={},body={}})=>new Promise((resolve)=>{
    const req={user:{id:user._id.toString()},params,body};
    const res={
        code:200,
        status(code){ this.code=code; return this; },
        json(body){ resolve({code:this.code,body}); },
        send(body){ resolve({code:this.code,body}); }
    };
    let i=0;
    const next=()=>{ const h=handlers[i++]; h(req,res,next); };
    next();
});
const asHost=(handler,extra={})=>run([loadRoomMember,requireHost,handler],{user:host,params:{roomId,...extra.params},body:extra.body});

const tinyWebp=(kb)=>'data:image/webp;base64,'+'A'.repeat(Math.ceil(kb*1024*4/3));

// ---------- pure ----------
test('checkImage: empty, links and small uploads are fine',()=>{
    assert.strictEqual(checkImage(''),null);
    assert.strictEqual(checkImage(undefined),null);
    assert.strictEqual(checkImage('https://upload.wikimedia.org/x.jpg'),null);
    assert.strictEqual(checkImage(tinyWebp(25)),null);
    assert.strictEqual(checkImage('data:image/jpeg;base64,/9j/4AAQ=='),null);
});

test('checkImage: rejects big uploads, other types and fake links',()=>{
    assert.match(checkImage(tinyWebp(80)),/80 KB/);
    assert.match(checkImage('data:image/svg+xml;base64,PHN2Zz4='),/webp, jpeg or png/);
    assert.match(checkImage('data:image/png;base64,<script>'),/webp, jpeg or png/);
    assert.match(checkImage('javascript:alert(1)'),/http/);
    assert.ok(checkImage(42));
});

test('cleanCredit keeps known fields and real links only',()=>{
    assert.strictEqual(cleanCredit(null),undefined);
    assert.strictEqual(cleanCredit({author:'  '}),undefined);
    assert.deepStrictEqual(cleanCredit({author:' RIGI ',license:'CC BY 3.0',page:'javascript:x',hack:1}),{author:'RIGI',license:'CC BY 3.0'});
});

test('pack: 274 players, every set belongs to a group, base prices are real slabs',()=>{
    assert.strictEqual(pack.players.length,274);
    const groups=packGroups(pack);
    assert.strictEqual(groups[0].name,'Marquee');
    assert.strictEqual(groups.reduce((n,g)=>n+g.count,0),274);
    for(const p of pack.players){
        assert.ok(pack.sets.some(s=>s.name===p.set),p.name+' has a real set');
        assert.ok([20,30,40,50,75,100,125,150,200].includes(p.basePrice),p.name+' base price');
        assert.strictEqual(checkImage(p.image),null,p.name+' photo');
    }
});

test('planPackLoad: drops empty starter sets, reuses Marquee, skips players already in',()=>{
    const roomSets=[
        {_id:'m',name:'Marquee',sequence:1,playerCount:0},
        {_id:'b',name:'Batsman Set 1',sequence:2,playerCount:0},
        {_id:'w',name:'Wicketkeeper Set 1',sequence:3,playerCount:2},
        {_id:'o',name:'Openers',sequence:4,playerCount:0}
    ];
    const plan=planPackLoad({pack,groups:['Marquee','Spinners','Nope'],roomSets,roomPlayerNames:['rishabh pant'],
        defaultSetNames:['Marquee','Batsman Set 1','Wicketkeeper Set 1']});
    assert.deepStrictEqual(plan.dropSetIds,['b'],'only the empty starter set the pack does not use');
    assert.deepStrictEqual(plan.newSets,[{name:'Spinners 1',sequence:5},{name:'Spinners 2',sequence:6}]);
    assert.strictEqual(plan.skipped,1);
    assert.strictEqual(plan.players.length,16+17-1);
    assert.ok(!plan.players.some(p=>p.name==='Rishabh Pant'));
    assert.match(planPackLoad({pack,groups:[],roomSets,roomPlayerNames:[],defaultSetNames:[]}).error,/Pick/);
});

// ---------- with the database ----------
before(async()=>{
    await mongoose.connect(process.env.MONGO_URI,{dbName:TEST_DB});
    assert.strictEqual(mongoose.connection.name,TEST_DB,'refusing to run outside the test database');
    await Promise.all([User,Room,Membership,Set,Player].map(m=>m.deleteMany({})));
    await Promise.all([Room,Membership,User,Set].map(m=>m.syncIndexes()));
    [host,team]=await Promise.all(['Host','Team'].map(n=>User.create({name:n,email:n.toLowerCase()+'@test.com',password:'x'})));
    const r=await run([createRoom],{user:host,body:{name:'Pack Room',type:'custom'}});
    roomId=String(r.body.room._id);
    await run([joinRoom],{user:team,body:{inviteCode:r.body.room.inviteCode,teamName:'Team',color:'#22AA55'}});
});

after(async()=>{
    await mongoose.disconnect();
});

test('only the host sees and loads the pack',async()=>{
    const r=await run([loadRoomMember,requireHost,getPack],{user:team,params:{roomId}});
    assert.strictEqual(r.code,403);
    const p=await asHost(getPack);
    assert.strictEqual(p.body.total,274);
    assert.strictEqual(p.body.groups.length,7);
});

test('five loads at the same time: one wins, each player and set is added once',async()=>{
    const body={groups:['Marquee','Spinners']};
    const results=await Promise.all(Array.from({length:5},()=>asHost(loadPack,{body})));
    const codes=results.map(r=>r.code).sort();
    assert.deepStrictEqual(codes,[201,409,409,409,409],'exactly one load runs, the rest are told it is already loading');
    const sets=await Set.find({room:roomId}).sort({sequence:1});
    assert.deepStrictEqual(sets.map(s=>s.name),['Marquee','Spinners 1','Spinners 2'],'starter sets dropped, no duplicate sets');
    assert.strictEqual(await Player.countDocuments({room:roomId}),33,'no player twice');
    assert.strictEqual((await Room.findById(roomId)).packLoadingUntil,null,'lock released');
    const again=await asHost(loadPack,{body});
    assert.strictEqual(again.body.added,0);
    assert.strictEqual(again.body.skipped,33);
});

test('pack players keep photos and credits; uploads replace them',async()=>{
    const pant=await Player.findOne({room:roomId,name:'Rishabh Pant'});
    assert.match(pant.image,/^https:\/\/(upload|thumb)\.wikimedia\.org\//);
    assert.ok(pant.imageCredit.author);
    const r=await asHost(updatePlayer,{params:{id:String(pant._id)},body:{image:tinyWebp(20),imageCredit:null}});
    assert.strictEqual(r.code,200);
    const after=await Player.findById(pant._id);
    assert.match(after.image,/^data:image\/webp/);
    assert.strictEqual(after.imageCredit?.author,undefined,'old Commons credit removed with the old photo');
    const big=await asHost(updatePlayer,{params:{id:String(pant._id)},body:{image:tinyWebp(90)}});
    assert.strictEqual(big.code,400);
});

test('a new player with an upload and a typed credit',async()=>{
    const set=await Set.findOne({room:roomId,name:'Marquee'});
    const r=await asHost(createPlayer,{body:{name:'Our Captain',role:'Batsman',country:'India',basePrice:50,set:String(set._id),image:tinyWebp(10),imageCredit:{author:'Photo by Asha'}}});
    assert.strictEqual(r.code,201);
    assert.strictEqual(r.body.player.imageCredit.author,'Photo by Asha');
    const bad=await asHost(createPlayer,{body:{name:'X',role:'Batsman',country:'India',basePrice:50,set:String(set._id),image:'ftp://x'}});
    assert.strictEqual(bad.code,400);
});

test('no loading once the auction is live',async()=>{
    await Room.updateOne({_id:roomId},{$set:{status:'live'}});
    const r=await asHost(loadPack,{body:{groups:['Batters']}});
    assert.strictEqual(r.code,400);
    await Room.updateOne({_id:roomId},{$set:{status:'lobby'}});
});
