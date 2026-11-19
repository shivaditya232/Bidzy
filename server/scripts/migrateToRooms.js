// One-time migration for A3.3: moves the old single global auction into a room called "Bidzy Classic".
// Run from server/:  npm run migrate:rooms
// Safe to run twice: everything that already has a room is skipped.
// Takes a full JSON backup of every collection first (server/backups/).
const path=require('path');
const fs=require('fs');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const mongoose=require('mongoose');
const {EJSON}=mongoose.mongo.BSON;
const crypto=require('crypto');

const Room=require('../models/Room');
const Membership=require('../models/Membership');
const Set=require('../models/Set');
const Player=require('../models/Player');
const AuctionSession=require('../models/AuctionSession');
const Bid=require('../models/Bid');
const AuctionRound=require('../models/AuctionRound');

const ROOM_NAME='Bidzy Classic';
const COLLECTIONS=['users','players','sets','auctionsessions','bids','auctionrounds','rooms','memberships'];

const makeInviteCode=()=>{
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code='';
    for(let i=0;i<6;i++) code+=chars[crypto.randomInt(chars.length)];
    return code;
};

const run=async()=>{
    await mongoose.connect(process.env.MONGO_URI);
    const db=mongoose.connection.db;
    console.log('Connected to database:',db.databaseName);

    //1. backup
    const backup={};
    for(const name of COLLECTIONS){
        backup[name]=await db.collection(name).find().toArray();
    }
    const backupDir=path.join(__dirname,'..','backups');
    fs.mkdirSync(backupDir,{recursive:true});
    const backupFile=path.join(backupDir,`before-rooms-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
    fs.writeFileSync(backupFile,EJSON.stringify(backup,null,1));
    console.log('Backup written:',backupFile,COLLECTIONS.map(n=>`${n}=${backup[n].length}`).join(' '));

    const users=db.collection('users');

    //2. the room, hosted by the old admin
    const admin=await users.findOne({role:'admin'});
    if(!admin){
        throw new Error('No admin user found, nothing to migrate into');
    }
    const teamUsers=await users.find({role:'team'}).sort({createdAt:1}).toArray();
    const purses=[...new globalThis.Set(teamUsers.map(t=>t.purse).filter(p=>Number.isInteger(p)))];
    const purse=purses.length===1 ? purses[0] : 12000;

    let room=await Room.findOne({name:ROOM_NAME,host:admin._id});
    if(!room){
        room=await Room.create({
            name:ROOM_NAME,
            inviteCode:makeInviteCode(),
            host:admin._id,
            settings:{purse,maxTeams:Math.max(10,teamUsers.length)}
        });
        console.log('Created room',ROOM_NAME,'invite code',room.inviteCode);
    }
    else{
        console.log('Room already exists, reusing it:',room.inviteCode);
    }

    //3. memberships: admin -> host, each old team account -> team with its name and purse
    await Membership.updateOne({room:room._id,user:admin._id},{$setOnInsert:{role:'host'}},{upsert:true});
    const memberOf={};
    for(const t of teamUsers){
        await Membership.updateOne(
            {room:room._id,user:t._id},
            {$setOnInsert:{
                role:'team',
                teamName:t.teamName||t.name,
                purse:t.purse??purse,
                purseRemaining:t.purseRemaining??t.purse??purse
            }},
            {upsert:true}
        );
        const m=await Membership.findOne({room:room._id,user:t._id});
        memberOf[t._id.toString()]=m._id;
    }
    const teamCount=await Membership.countDocuments({room:room._id,role:'team'});
    await Room.updateOne({_id:room._id},{$set:{teamCount}});
    console.log('Memberships: 1 host +',teamCount,'teams');

    const toMember=(userId)=>userId ? (memberOf[userId.toString()]||null) : null;
    const noRoom={room:{$exists:false}};

    //4. sets: give them the room, then swap the old "name is unique everywhere" index for "unique per room"
    const sets=await db.collection('sets').updateMany(noRoom,{$set:{room:room._id}});
    const setIndexes=await db.collection('sets').indexes();
    if(setIndexes.some(i=>i.name==='name_1')){
        await db.collection('sets').dropIndex('name_1');
        console.log('Dropped old global unique index sets.name_1');
    }
    console.log('Sets moved:',sets.modifiedCount);

    //5. players: room + soldTo (user id -> membership id)
    const players=await db.collection('players').find(noRoom).toArray();
    for(const p of players){
        await db.collection('players').updateOne({_id:p._id},{$set:{room:room._id,soldTo:toMember(p.soldTo)}});
    }
    console.log('Players moved:',players.length);

    //6. the auction session: only one may exist per room now. keep the newest, drop stale extras.
    const sessions=await db.collection('auctionsessions').find(noRoom).sort({updatedAt:-1}).toArray();
    //only decided when we actually move a session in this run. a second run must not touch the status.
    let roomStatus=null;
    if(sessions.length>0){
        const s=sessions[0];
        const already=await db.collection('auctionsessions').findOne({room:room._id});
        if(!already){
            await db.collection('auctionsessions').updateOne({_id:s._id},{$set:{room:room._id,highestBidder:toMember(s.highestBidder)}});
            roomStatus=s.status==='live' ? 'live' : s.status==='ended' ? 'ended' : 'lobby';
        }
        const extras=sessions.slice(already ? 0 : 1).map(x=>x._id);
        if(extras.length>0){
            await db.collection('auctionsessions').deleteMany({_id:{$in:extras}});
            console.log('Removed stale sessions:',extras.length);
        }
    }
    if(roomStatus){
        await Room.updateOne({_id:room._id},{$set:{status:roomStatus}});
        console.log('Session moved, room status:',roomStatus);
    }
    else{
        console.log('No session to move');
    }

    //7. bids: room + team (user id -> membership id)
    const bids=await db.collection('bids').find(noRoom).toArray();
    for(const b of bids){
        await db.collection('bids').updateOne({_id:b._id},{$set:{room:room._id,team:toMember(b.team)}});
    }
    console.log('Bids moved:',bids.length);

    //8. history
    const rounds=await db.collection('auctionrounds').updateMany(noRoom,{$set:{room:room._id}});
    console.log('Auction rounds moved:',rounds.modifiedCount);

    //9. build the new indexes (per-room set names, one session per room, ...)
    for(const model of [Room,Membership,Set,Player,AuctionSession,Bid,AuctionRound]){
        await model.syncIndexes();
    }
    console.log('Indexes synced. Done.');
    console.log(`Room "${ROOM_NAME}" id ${room._id} invite code ${room.inviteCode}`);
};

run()
    .catch(error=>{
        console.error('Migration failed:',error.message);
        process.exitCode=1;
    })
    .finally(()=>mongoose.disconnect());
