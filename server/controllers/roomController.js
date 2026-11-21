const crypto=require('crypto');
const mongoose=require('mongoose');
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const seedDefaultSets=require('../config/seedSets');
const {getSquad,getRoomSquads}=require('../utils/auctionRules');
const {FRANCHISES,getFranchise}=require('../config/franchises');
const {emptyLineup}=require('../models/Membership');

const HEX_COLOR=/^#[0-9A-Fa-f]{6}$/;

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
//current = the room's settings right now ({purse, rules}), needed because the rules are checked as a whole
const validateSettings=(body,current)=>{
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
        //there are only 10 franchises to go round
        if(current.type==='ipl'&&body.maxTeams>10) return {error:'An IPL room can have at most 10 teams'};
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
    //squad rules: the host may send some or all of them. merged with the current ones and checked together,
    //so e.g. min 25 / max 19 can never be saved. a purse change is also checked against them.
    if(body.rules!==undefined||values.purse!==undefined){
        const sent=body.rules===undefined ? {} : body.rules;
        if(typeof sent!=='object'||sent===null||Array.isArray(sent)) return {error:'Rules must be an object'};
        const rules={...current.rules,...sent};
        if(!isInt(rules.squadMin,1,50)||!isInt(rules.squadMax,1,50)) return {error:'Squad size must be between 1 and 50'};
        if(rules.squadMin>rules.squadMax) return {error:'Squad minimum cannot be more than the maximum'};
        if(!isInt(rules.overseasMin,0,50)||!isInt(rules.overseasMax,0,50)) return {error:'Overseas limits must be between 0 and 50'};
        if(rules.overseasMin>rules.overseasMax) return {error:'Overseas minimum cannot be more than the maximum'};
        if(rules.overseasMax>rules.squadMax) return {error:'Overseas maximum cannot be more than the squad maximum'};
        if(!isInt(rules.minPlayerPrice,0,1000000000)) return {error:'Minimum player price must be a whole number, 0 or more'};
        if(typeof rules.homeCountry!=='string'||!rules.homeCountry.trim()||rules.homeCountry.trim().length>40) return {error:'Home country is required (max 40 characters)'};
        //otherwise no team could ever complete a minimum squad
        const purse=values.purse!==undefined ? values.purse : current.purse;
        if(rules.squadMin*rules.minPlayerPrice>purse){
            return {error:`A purse of ${purse} can't buy ${rules.squadMin} players at ${rules.minPlayerPrice} each`};
        }
        if(body.rules!==undefined){
            values.rules={
                squadMin:rules.squadMin,
                squadMax:rules.squadMax,
                overseasMin:rules.overseasMin,
                overseasMax:rules.overseasMax,
                minPlayerPrice:rules.minPlayerPrice,
                homeCountry:rules.homeCountry.trim()
            };
        }
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
        const type=req.body.type===undefined ? 'ipl' : req.body.type;
        if(type!=='ipl'&&type!=='custom'){
            return res.status(400).json({message:'Room type must be ipl or custom'});
        }
        const {error,values}=validateSettings(req.body.settings||{},{type,purse:12000,rules:Room.DEFAULT_RULES});
        if(error){
            return res.status(400).json({message:error});
        }


        let room=null;
        for(let attempt=0;attempt<5&&!room;attempt++){
            try{
                room=await Room.create({name,type,inviteCode:makeInviteCode(),host:req.user.id,settings:values});
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
        if(!inviteCode){
            return res.status(400).json({message:'Invite code is required'});
        }

        const room=await Room.findOne({inviteCode});
        if(!room){
            return res.status(404).json({message:'No room with that code'});
        }

        //who you are in this room: IPL rooms -> a franchise (its name and colour), custom rooms -> your own name and colour
        let teamName,franchise,color;
        if(room.type==='custom'){
            teamName=cleanName(req.body.teamName,40);
            if(!teamName){
                return res.status(400).json({message:'Team name is required (max 40 characters)'});
            }
            if(typeof req.body.color!=='string'||!HEX_COLOR.test(req.body.color)){
                return res.status(400).json({message:'Pick a team colour'});
            }
            color=req.body.color.toUpperCase();
        }
        else{
            const picked=getFranchise(req.body.franchise);
            if(!picked){
                return res.status(400).json({message:'Pick a franchise'});
            }
            franchise=picked.code;
            teamName=picked.name;
            color=picked.primary;
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
                franchise,
                color,
                purse:claimed.settings.purse,
                purseRemaining:claimed.settings.purse,
                lineup:emptyLineup()
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
                //in an IPL room the team name IS the franchise name, so a clash can trip either index first
                const clash=error.keyPattern||{};
                let message="You're already in this room";
                if(clash.franchise||(clash.teamName&&room.type==='ipl')) message='That franchise is already taken in this room';
                else if(clash.teamName) message='That team name is already taken in this room';
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
            .populate('room','name type inviteCode status teamCount settings host createdAt')
            .sort({createdAt:-1});

        const rooms=memberships
            .filter(m=>m.room)
            .map(m=>({
                room:m.room,
                myRole:m.role,
                teamName:m.teamName||null,
                franchise:m.franchise||null,
                color:m.color||null,
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
                franchise:req.member.franchise||null,
                color:req.member.color||null,
                purseRemaining:req.member.purseRemaining??null
            },
            members:members.map(m=>({
                id:m._id,
                userId:m.user ? m.user._id : null,
                name:m.user ? m.user.name : null,
                role:m.role,
                teamName:m.teamName||null,
                franchise:m.franchise||null,
                color:m.color||null,
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
        const currentSettings=req.room.toObject().settings;
        const {error,values}=validateSettings(req.body,{type:req.room.type,purse:currentSettings.purse,rules:currentSettings.rules});
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

//my own membership in this room 
const getMyMember=async (req,res)=>{
    try{
        const squad=req.member.role==='team'
            ? await getSquad(req.room._id,req.member._id,req.room.settings.rules)
            : {size:0,overseas:0};
        res.status(200).json({...req.member.toObject(),squadSize:squad.size,overseasCount:squad.overseas});
    }
    catch(error){
        console.error('getMyMember failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//the teams in this room 
const getMembers=async (req,res)=>{
    try{
        const [teams,squads]=await Promise.all([
            Membership.find({room:req.room._id,role:'team'}).populate('user','name email').sort({createdAt:1}),
            getRoomSquads(req.room._id,req.room.settings.rules)
        ]);
        const isHost=req.member.role==='host';
        res.status(200).json(teams.map(t=>({
            _id:t._id,
            teamName:t.teamName,
            franchise:t.franchise||null,
            color:t.color||null,
            purse:t.purse,
            purseRemaining:t.purseRemaining,
            squadSize:squads[t._id.toString()] ? squads[t._id.toString()].size : 0,
            overseasCount:squads[t._id.toString()] ? squads[t._id.toString()].overseas : 0,
            name:t.user ? t.user.name : null,
            email:isHost&&t.user ? t.user.email : undefined
        })));
    }
    catch(error){
        console.error('getMembers failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//host edits a team's name or purse 
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

//the 10 IPL franchises with their colours, for the join screen
const getFranchises=async (req,res)=>{
    res.status(200).json(FRANCHISES);
};

//what a room looks like before you join it: name, type, how full, and which franchises are taken.
//only safe facts, no member details. you still need the code to see it.
const previewRoom=async (req,res)=>{
    try{
        const inviteCode=typeof req.params.inviteCode==='string' ? req.params.inviteCode.trim().toUpperCase() : '';
        const room=await Room.findOne({inviteCode});
        if(!room){
            return res.status(404).json({message:'No room with that code'});
        }
        const taken=await Membership.find({room:room._id,role:'team',franchise:{$type:'string'}}).select('franchise');
        res.status(200).json({
            name:room.name,
            type:room.type,
            status:room.status,
            teamCount:room.teamCount,
            maxTeams:room.settings.maxTeams,
            purse:room.settings.purse,
            takenFranchises:taken.map(m=>m.franchise)
        });
    }
    catch(error){
        console.error('previewRoom failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

module.exports={createRoom,joinRoom,getMyRooms,getRoom,updateRoomSettings,getMyMember,getMembers,updateMember,getFranchises,previewRoom};
