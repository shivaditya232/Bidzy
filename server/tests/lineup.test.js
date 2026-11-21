// Franchises + playing XI tests. Run with: npm test
// Part 1 tests validateLineup on its own (no database). Part 2 goes through the real controllers (bidzy_test_lineup DB).
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const {test,before,after}=require('node:test');
const assert=require('node:assert');
const mongoose=require('mongoose');

const {validateLineup,getUnplaced}=require('../utils/lineupRules');
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const User=require('../models/User');
const Player=require('../models/Player');
const SetModel=require('../models/Set');
const {createRoom,joinRoom,previewRoom}=require('../controllers/roomController');
const {getMyLineup,saveLineup,getAllLineups}=require('../controllers/lineupController');

const RULES={...Room.DEFAULT_RULES};
const oid=()=>new mongoose.Types.ObjectId();
const empty=()=>Array.from({length:11},()=>({player:null,backups:[]}));

// ---------- part 1: validateLineup on its own ----------

// a squad of 8 home + 6 overseas players
const home=Array.from({length:8},()=>({_id:oid(),country:'India'}));
const away=Array.from({length:6},()=>({_id:oid(),country:'Australia'}));
const bought=[...home,...away];

test('an empty XI is fine (you start with nothing)',()=>{
    assert.ok(validateLineup(empty(),bought,RULES).lineup);
});

test('XI must have exactly 11 positions',()=>{
    assert.match(validateLineup(empty().slice(0,10),bought,RULES).error,/exactly 11/);
    assert.match(validateLineup('nope',bought,RULES).error,/exactly 11/);
});

test('only your own players, each starting once',()=>{
    const notMine=empty(); notMine[0].player=oid();
    assert.match(validateLineup(notMine,bought,RULES).error,/isn't in your squad/);
    const twice=empty(); twice[0].player=home[0]._id; twice[5].player=home[0]._id;
    assert.match(validateLineup(twice,bought,RULES).error,/only one position/);
});

test('a backup must back up someone, and can cover several positions',()=>{
    const noStarter=empty(); noStarter[3].backups=[home[1]._id];
    assert.match(validateLineup(noStarter,bought,RULES).error,/no starter to back up/);

    // one backup covering two bowlers (positions 9 and 10)
    const xi=empty();
    xi[8]={player:home[0]._id,backups:[home[2]._id]};
    xi[9]={player:home[1]._id,backups:[home[2]._id]};
    assert.ok(validateLineup(xi,bought,RULES).lineup);
});

test('a starter cannot also be a backup, and a backup cannot repeat in one position',()=>{
    const both=empty();
    both[0]={player:home[0]._id,backups:[home[1]._id]};
    both[6]={player:home[1]._id,backups:[]};
    assert.match(validateLineup(both,bought,RULES).error,/can't also be a backup/);
    const dup=empty(); dup[0]={player:home[0]._id,backups:[home[1]._id,home[1]._id]};
    assert.match(validateLineup(dup,bought,RULES).error,/listed twice/);
});

test('max 4 overseas starters; overseas backups do not count',()=>{
    const five=empty();
    away.slice(0,5).forEach((p,i)=>{ five[i].player=p._id; });
    assert.match(validateLineup(five,bought,RULES).error,/Only 4 overseas.*you have 5/);

    const four=empty();
    away.slice(0,4).forEach((p,i)=>{ four[i].player=p._id; });
    four[0].backups=[away[4]._id,away[5]._id]; // overseas backups are fine
    assert.ok(validateLineup(four,bought,RULES).lineup);
});

test('unplaced = bought players not starting and not backing anyone up',()=>{
    const xi=empty();
    xi[0]={player:home[0]._id,backups:[home[1]._id]};
    const unplaced=getUnplaced(validateLineup(xi,bought,RULES).lineup,bought);
    assert.strictEqual(unplaced.length,bought.length-2);
    assert.ok(!unplaced.includes(home[0]._id.toString()));
    assert.ok(!unplaced.includes(home[1]._id.toString()));
});

// ---------- part 2: through the real controllers ----------

const TEST_DB='bidzy_test_lineup';
const run=(handlers,req)=>new Promise((resolve)=>{
    const res={code:200,status(c){this.code=c;return this;},json(b){resolve({code:this.code,body:b});}};
    let i=0; const next=()=>handlers[i++](req,res,next); next();
});
const makeUser=(name)=>User.create({name,email:name.toLowerCase()+'@lineup.test',password:'x'});
const asUser=(u,extra)=>({user:{id:u._id.toString()},...extra});

let host;

before(async()=>{
    await mongoose.connect(process.env.MONGO_URI,{dbName:TEST_DB});
    assert.strictEqual(mongoose.connection.name,TEST_DB,'refusing to run outside the test database');
    await Promise.all([Room,Membership,User,Player,SetModel].map(m=>m.deleteMany({})));
    await Promise.all([Room,Membership,SetModel].map(m=>m.syncIndexes()));
    host=await makeUser('Host');
});

after(async()=>{
    await mongoose.disconnect();
});

test('IPL room: join with a franchise, get its name and colour; each franchise once',async()=>{
    const created=await run([createRoom],asUser(host,{body:{name:'IPL Night'}}));
    assert.strictEqual(created.body.room.type,'ipl');
    const code=created.body.room.inviteCode;

    const a=await makeUser('Anu');
    const joined=await run([joinRoom],asUser(a,{body:{inviteCode:code,franchise:'CSK'}}));
    assert.strictEqual(joined.code,201);
    assert.strictEqual(joined.body.member.teamName,'Chennai Super Kings');
    assert.strictEqual(joined.body.member.color,'#FDB913');
    assert.strictEqual(joined.body.member.lineup.length,11,'starts with 11 empty positions');

    assert.match((await run([joinRoom],asUser(await makeUser('Noone'),{body:{inviteCode:code}}))).body.message,/Pick a franchise/);

    // 5 people grab MI at the same instant: exactly one gets it
    const racers=await Promise.all(['R1','R2','R3','R4','R5'].map(makeUser));
    const results=await Promise.all(racers.map(u=>run([joinRoom],asUser(u,{body:{inviteCode:code,franchise:'MI'}}))));
    assert.strictEqual(results.filter(r=>r.code===201).length,1);
    const loserMessages=results.filter(r=>r.code!==201).map(r=>r.code+" "+r.body.message);
    assert.ok(loserMessages.every(m=>/franchise is already taken/.test(m)),loserMessages.join(" | "));
    assert.strictEqual((await Room.findOne({inviteCode:code})).teamCount,2,'losers gave their slots back');

    const preview=await run([previewRoom],asUser(a,{params:{inviteCode:code.toLowerCase()}}));
    assert.deepStrictEqual(preview.body.takenFranchises.sort(),['CSK','MI']);
    assert.strictEqual(preview.body.type,'ipl');
});

test('IPL room is capped at 10 teams; custom room needs a name and a colour',async()=>{
    assert.match((await run([createRoom],asUser(host,{body:{name:'Too Big',settings:{maxTeams:12}}}))).body.message,/at most 10 teams/);

    const custom=await run([createRoom],asUser(host,{body:{name:'Gully League',type:'custom'}}));
    const code=custom.body.room.inviteCode;
    const u=await makeUser('Gully');
    assert.match((await run([joinRoom],asUser(u,{body:{inviteCode:code,teamName:'Gully XI'}}))).body.message,/colour/);
    const ok=await run([joinRoom],asUser(u,{body:{inviteCode:code,teamName:'Gully XI',color:'#12ab9c'}}));
    assert.strictEqual(ok.code,201);
    assert.strictEqual(ok.body.member.color,'#12AB9C');
});

test('save and read your XI; unplaced players listed; everyone XI only after the auction',async()=>{
    const room=await Room.create({name:'XI Room',inviteCode:'XIROOM',host:host._id,status:'live',teamCount:1});
    const hostMember=await Membership.create({room:room._id,user:host._id,role:'host'});
    const owner=await makeUser('Owner');
    const member=await Membership.create({room:room._id,user:owner._id,role:'team',teamName:'XI Team',purse:12000,purseRemaining:12000,lineup:empty()});
    const set=await SetModel.create({room:room._id,name:'S',sequence:1});
    const players=await Player.create(['Dhoni','Jadeja','Mukesh'].map((n,i)=>({room:room._id,name:n,role:'Batsman',basePrice:20,order:i+1,set:set._id,status:'sold',soldTo:member._id,soldPrice:20,country:'India'})));
    const asTeam={room,member,user:{id:owner._id.toString()}};

    const xi=empty();
    xi[6]={player:players[0]._id.toString(),backups:[]};                       // Dhoni at 7
    xi[9]={player:players[1]._id.toString(),backups:[players[2]._id.toString()]}; // Mukesh backs up Jadeja
    const saved=await run([saveLineup],{...asTeam,body:{lineup:xi}});
    assert.strictEqual(saved.code,200);
    assert.deepStrictEqual(saved.body.unplaced,[]);

    const fresh=await Membership.findById(member._id);
    const mine=await run([getMyLineup],{...asTeam,member:fresh});
    assert.strictEqual(mine.body.lineup[6].player.toString(),players[0]._id.toString());

    // private while live
    assert.strictEqual((await run([getAllLineups],{room,member:hostMember})).code,403);
    // revealed when ended, with names filled in
    room.status='ended';
    const all=await run([getAllLineups],{room,member:hostMember});
    assert.strictEqual(all.code,200);
    assert.strictEqual(all.body[0].lineup[6].player.name,'Dhoni');
    assert.strictEqual(all.body[0].lineup[9].backups[0].name,'Mukesh');
});
