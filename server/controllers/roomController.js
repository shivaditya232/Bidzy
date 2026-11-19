const crypto=require('crypto');
const mongoose=require('mongoose');
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const seedDefaultSets=require('../config/seedSets');

//no 0/O/1/I so codes are easy to read out loud
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH=6;

const makeInviteCode=()=>{
    let code='';
    for(let i=0;i<CODE_LENGTH;i++){
        code+=CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    }
    return code;
};

const isInt=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;

//checks only the fields that were sent. returns {error} or {values}
const validateSettings=(body)=>{
    const values={};
    if(body.purse!==undefined){
        if(!isInt(body.purse,1,1000000000)) return {error:'Purse must be a whole number above 0'};
        values.purse=body.purse;
    }
    if(body.timerSeconds!==undefined){
        if(!isInt(body.timerSeconds,5,120)) return {error:'Timer must be between 5 and 120 seconds'};
        values.timerSeconds=body.timerSeconds;
    }
    if(body.maxTeams!==undefined){
        if(!isInt(body.maxTeams,2,20)) return {error:'Max teams must be between 2 and 20'};
        values.maxTeams=body.maxTeams;
    }
    if(body.increments!==undefined){
        const bands=body.increments;
        if(!Array.isArray(bands)||bands.length<1||bands.length>10){
            return {error:'Increments must be a list of 1 to 10 price bands'};
        }
        let lastUpTo=0;
        for(let i=0;i<bands.length;i++){
            const band=bands[i]||{};
            const isLast=i===bands.length-1;
            if(!isInt(band.step,1,1000000000)) return {error:'Each band needs a step above 0'};
            if(isLast){
                if(band.upTo!==null&&band.upTo!==undefined) return {error:'The last band must have no upper limit (upTo: null)'};
            }
            else{
                if(!isInt(band.upTo,1,1000000000)||band.upTo<=lastUpTo) return {error:'Band limits must go up in order'};
                lastUpTo=band.upTo;
            }
        }
        values.increments=bands.map((band,i)=>({upTo:i===bands.length-1 ? null : band.upTo,step:band.step}));
    }
    return {values};
};

const cleanName=(value,max)=>{
    if(typeof value!=='string') return '';
    const trimmed=value.trim();
    return trimmed.length<=max ? trimmed : '';
};

const createRoom=async (req,res)=>{
    try{
        const name=cleanName(req.body.name,60);
        if(!name){
            return res.status(400).json({message:'Room name is required (max 60 characters)'});
        }
        const {error,values}=validateSettings(req.body.settings||{});
        if(error){
            return res.status(400).json({message:error});
        }

        //a clash is very unlikely (32^6 ≈ 1 billion codes), but the unique index will tell us. just try again.
        let room=null;
        for(let attempt=0;attempt<5&&!room;attempt++){
            try{
                room=await Room.create({name,inviteCode:makeInviteCode(),host:req.user.id,settings:values});
            }
            catch(error){
                if(error.code!==11000) throw error;
            }
        }
        if(!room){
            return res.status(500).json({message:'Could not create an invite code, try again'});
        }

        await Membership.create({room:room._id,user:req.user.id,role:'host'});
        await seedDefaultSets(room._id);

        res.status(201).json({message:'Room created',room});
    }
    catch(error){
        console.error('createRoom failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const joinRoom=async (req,res)=>{
    try{
        const inviteCode=typeof req.body.inviteCode==='string' ? req.body.inviteCode.trim().toUpperCase() : '';
        const teamName=cleanName(req.body.teamName,40);
        if(!inviteCode){
            return res.status(400).json({message:'Invite code is required'});
        }
        if(!teamName){
            return res.status(400).json({message:'Team name is required (max 40 characters)'});
        }

        const room=await Room.findOne({inviteCode});
        if(!room){
            return res.status(404).json({message:'No room with that code'});
        }
        const alreadyIn=await Membership.findOne({room:room._id,user:req.user.id});
        if(alreadyIn){
            return res.status(400).json({message:"You're already in this room"});
        }

        //claim a slot atomically: "add 1 to teamCount, but only if it's below maxTeams and still in the lobby".
        //same idea as placeBid. if 10 people join a room with 1 free slot, only one of them matches.
        const claimed=await Room.findOneAndUpdate(
            {_id:room._id,status:'lobby',$expr:{$lt:['$teamCount','$settings.maxTeams']}},
            {$inc:{teamCount:1}},
            {returnDocument:'after'}
        );
        if(!claimed){
            const latest=await Room.findById(room._id);
            if(latest.status!=='lobby'){
                return res.status(400).json({message:'This auction has already started'});
            }
            return res.status(400).json({message:'This room is full'});
        }

        try{
            const member=await Membership.create({
                room:room._id,
                user:req.user.id,
                role:'team',
                teamName,
                purse:claimed.settings.purse,
                purseRemaining:claimed.settings.purse
            });
            //the host may have changed the purse between our read and our insert. settings saves the room first,
            //then updates every team, so if we got in after that update, the room already shows the new purse here.
            const latest=await Room.findById(room._id).select('settings.purse');
            if(latest.settings.purse!==claimed.settings.purse){
                await Membership.updateOne({_id:member._id,purse:claimed.settings.purse},{$set:{purse:latest.settings.purse,purseRemaining:latest.settings.purse}});
                member.purse=latest.settings.purse;
                member.purseRemaining=latest.settings.purse;
            }
            res.status(201).json({message:'Joined room',room:claimed,member});
        }
        catch(error){
            //we took a slot but couldn't use it -> give it back
            await Room.updateOne({_id:room._id},{$inc:{teamCount:-1}});
            if(error.code===11000){
                const message=error.keyPattern&&error.keyPattern.teamName
                    ? 'That team name is already taken in this room'
                    : "You're already in this room";
                return res.status(400).json({message});
            }
            throw error;
        }
    }
    catch(error){
        console.error('joinRoom failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getMyRooms=async (req,res)=>{
    try{
        const memberships=await Membership.find({user:req.user.id})
            .populate('room','name inviteCode status teamCount settings host createdAt')
            .sort({createdAt:-1});

        const rooms=memberships
            .filter(m=>m.room)
            .map(m=>({
                room:m.room,
                myRole:m.role,
                teamName:m.teamName||null,
                purseRemaining:m.purseRemaining??null
            }));
        res.status(200).json(rooms);
    }
    catch(error){
        console.error('getMyRooms failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getRoom=async (req,res)=>{
    try{
        const members=await Membership.find({room:req.room._id}).populate('user','name').sort({createdAt:1});
        res.status(200).json({
            room:req.room,
            me:{
                id:req.member._id,
                role:req.member.role,
                teamName:req.member.teamName||null,
                purseRemaining:req.member.purseRemaining??null
            },
            members:members.map(m=>({
                id:m._id,
                userId:m.user ? m.user._id : null,
                name:m.user ? m.user.name : null,
                role:m.role,
                teamName:m.teamName||null,
                purseRemaining:m.purseRemaining??null
            }))
        });
    }
    catch(error){
        console.error('getRoom failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const updateRoomSettings=async (req,res)=>{
    try{
        const {error,values}=validateSettings(req.body);
        if(error){
            return res.status(400).json({message:error});
        }
        const update={};
        if(req.body.name!==undefined){
            const name=cleanName(req.body.name,60);
            if(!name) return res.status(400).json({message:'Room name is required (max 60 characters)'});
            update.name=name;
        }
        for(const key of Object.keys(values)){
            update['settings.'+key]=values[key];
        }
        if(Object.keys(update).length===0){
            return res.status(400).json({message:'Nothing to update'});
        }

        //only while in the lobby, and maxTeams can't drop below the teams already in
        const filter={_id:req.room._id,status:'lobby'};
        if(values.maxTeams!==undefined){
            filter.teamCount={$lte:values.maxTeams};
        }
        const room=await Room.findOneAndUpdate(filter,{$set:update},{returnDocument:'after',runValidators:true});
        if(!room){
            const latest=await Room.findById(req.room._id);
            if(latest.status!=='lobby'){
                return res.status(409).json({message:'Settings are locked once the auction starts'});
            }
            return res.status(400).json({message:`There are already ${latest.teamCount} teams in this room`});
        }

        //nothing has been spent in the lobby, so a new purse simply replaces the old one for every team
        if(values.purse!==undefined){
            await Membership.updateMany({room:room._id,role:'team'},{$set:{purse:values.purse,purseRemaining:values.purse}});
        }

        res.status(200).json({message:'Settings updated',room});
    }
    catch(error){
        console.error('updateRoomSettings failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//my own membership in this room (replaces /users/me for the auction board)
const getMyMember=async (req,res)=>{
    try{
        res.status(200).json(req.member);
    }
    catch(error){
        console.error('getMyMember failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//the teams in this room (replaces /users/teams and /users/public-teams). the host also sees emails.
const getMembers=async (req,res)=>{
    try{
        const teams=await Membership.find({room:req.room._id,role:'team'}).populate('user','name email').sort({createdAt:1});
        const isHost=req.member.role==='host';
        res.status(200).json(teams.map(t=>({
            _id:t._id,
            teamName:t.teamName,
            purse:t.purse,
            purseRemaining:t.purseRemaining,
            name:t.user ? t.user.name : null,
            email:isHost&&t.user ? t.user.email : undefined
        })));
    }
    catch(error){
        console.error('getMembers failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//host edits a team's name or purse (replaces PATCH /users/:id)
const updateMember=async (req,res)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.memberId)){
            return res.status(404).json({message:'Team not found'});
        }
        const updateData={};
        if(req.body.teamName!==undefined){
            const teamName=cleanName(req.body.teamName,40);
            if(!teamName) return res.status(400).json({message:'Team name is required (max 40 characters)'});
            updateData.teamName=teamName;
        }
        if(req.body.purseRemaining!==undefined){
            const purseRemaining=Number(req.body.purseRemaining);
            if(!Number.isInteger(purseRemaining)||purseRemaining<0) return res.status(400).json({message:'Purse must be a whole number, 0 or more'});
            updateData.purseRemaining=purseRemaining;
        }
        const team=await Membership.findOneAndUpdate(
            {_id:req.params.memberId,room:req.room._id,role:'team'},
            {$set:updateData},
            {returnDocument:'after',runValidators:true}
        );
        if(!team){
            return res.status(404).json({message:'Team not found'});
        }
        res.status(200).json({message:'Team updated successfully',team});
    }
    catch(error){
        if(error.code===11000){
            return res.status(400).json({message:'That team name is already taken in this room'});
        }
        console.error('updateMember failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

module.exports={createRoom,joinRoom,getMyRooms,getRoom,updateRoomSettings,getMyMember,getMembers,updateMember};
