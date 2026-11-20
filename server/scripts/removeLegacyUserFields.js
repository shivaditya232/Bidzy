// One-time cleanup for A3.6: users no longer carry role / teamName / purse / purseRemaining
// (those live on Membership, per room). Removes the leftover fields from existing user docs.
// Run from server/:  npm run cleanup:users
// Safe to run twice. Backs up the users collection first (server/backups/).
// Note: run migrateToRooms.js BEFORE this; it reads the old role field to find the admin.
const path=require('path');
const fs=require('fs');
require('dotenv').config({path:path.join(__dirname,'..','.env'),quiet:true});
const mongoose=require('mongoose');
const {EJSON}=mongoose.mongo.BSON;

const LEGACY_FIELDS=['role','teamName','purse','purseRemaining'];

const run=async()=>{
    await mongoose.connect(process.env.MONGO_URI);
    const db=mongoose.connection.db;
    console.log('Connected to database:',db.databaseName);
    const users=db.collection('users');

    const all=await users.find().toArray();
    const backupDir=path.join(__dirname,'..','backups');
    fs.mkdirSync(backupDir,{recursive:true});
    const backupFile=path.join(backupDir,`users-before-cleanup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
    fs.writeFileSync(backupFile,EJSON.stringify(all,null,1));
    console.log('Backup written:',backupFile,'users='+all.length);

    const hasLegacy={$or:LEGACY_FIELDS.map(f=>({[f]:{$exists:true}}))};
    const unset=Object.fromEntries(LEGACY_FIELDS.map(f=>[f,'']));
    const result=await users.updateMany(hasLegacy,{$unset:unset});
    console.log('Users cleaned:',result.modifiedCount);
    console.log('Users still with legacy fields:',await users.countDocuments(hasLegacy));
};

run()
    .catch(error=>{
        console.error('Cleanup failed:',error.message);
        process.exitCode=1;
    })
    .finally(()=>mongoose.disconnect());
