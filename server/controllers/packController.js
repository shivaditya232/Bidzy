const Player=require('../models/Player');
const Set=require('../models/Set');
const Room=require('../models/Room');
const pack=require('../data/iplPlayers2026.json');
const {DEFAULT_SETS}=require('../config/seedSets');
const {packSummary,planPackLoad}=require('../utils/playerPack');

const LOAD_LOCK_MS=60*1000;

//GET /rooms/:roomId/players/pack : the IPL 2026 pack's groups of sets, for the host to pick from
const getPack=async (req,res)=>{
    try{
        res.status(200).json(packSummary(pack));
    }
    catch(error){
        console.error('getPack failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//POST /rooms/:roomId/players/pack {groups:['Marquee','Batters',...]} : load those sets into the room in one go
const loadPack=async (req,res)=>{
    const room=req.room;
    let claimed=false;
    try{
        if(room.status!=='lobby'){
            return res.status(400).json({message:'Players can only be loaded before the auction starts'});
        }
        //claim the load: only one request can flip the lock on. a second one at the same moment matches nothing.
        //(reading "names already in the room" and then inserting is a gap two requests could both slip through)
        const now=new Date();
        const locked=await Room.findOneAndUpdate(
            {_id:room._id,status:'lobby',$or:[{packLoadingUntil:null},{packLoadingUntil:{$lte:now}}]},
            {$set:{packLoadingUntil:new Date(now.getTime()+LOAD_LOCK_MS)}}
        );
        if(!locked){
            return res.status(409).json({message:'Players are already being loaded'});
        }
        claimed=true;

        const [sets,players]=await Promise.all([
            Set.find({room:room._id}),
            Player.find({room:room._id}).select('name set')
        ]);
        const roomSets=sets.map(s=>({
            _id:String(s._id),
            name:s.name,
            sequence:s.sequence,
            playerCount:players.filter(p=>String(p.set)===String(s._id)).length
        }));
        const plan=planPackLoad({
            pack,
            groups:req.body.groups,
            roomSets,
            roomPlayerNames:players.map(p=>p.name),
            defaultSetNames:DEFAULT_SETS
        });
        if(plan.error){
            return res.status(400).json({message:plan.error});
        }

        //an empty set can be dropped only if it's still empty (a player may have been added since we read)
        for(const setId of plan.dropSetIds){
            const used=await Player.exists({room:room._id,set:setId});
            if(!used) await Set.deleteOne({_id:setId,room:room._id});
        }
        //upsert: reuses a set of that name if there is one
        for(const set of plan.newSets){
            await Set.updateOne({room:room._id,name:set.name},{$setOnInsert:{sequence:set.sequence}},{upsert:true});
        }
        const setIdByName=Object.fromEntries((await Set.find({room:room._id})).map(s=>[s.name,s._id]));

        const lastPlayer=await Player.findOne({room:room._id}).sort({order:-1});
        const startOrder=lastPlayer ? lastPlayer.order+1 : 1;
        const created=await Player.insertMany(plan.players.map((player,index)=>({
            ...player,
            set:setIdByName[player.set],
            order:startOrder+index,
            room:room._id
        })));

        res.status(201).json({
            message:`${created.length} players added`,
            added:created.length,
            skipped:plan.skipped,
            sets:plan.newSets.length
        });
    }
    catch(error){
        console.error('loadPack failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
    finally{
        if(claimed){
            await Room.updateOne({_id:room._id},{$set:{packLoadingUntil:null}}).catch(()=>{});
        }
    }
};

module.exports={getPack,loadPack};
