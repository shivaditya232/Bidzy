const Player=require('../models/Player');
const Set=require('../models/Set');

//order is per room: each room's players are numbered 1,2,3...
const getNextOrderStart=async (roomId)=>{
    const lastPlayer=await Player.findOne({room:roomId}).sort({order:-1});
    if(lastPlayer){
        return lastPlayer.order+1;
    }
    else{
        return 1;
    }
}

const getPlayers=async (req,res)=>{
    try{
        const players=await Player.find({room:req.room._id}).populate('set').populate('soldTo','teamName');
        const sorted=players.sort((a,b)=>{
            if(a.set.sequence!==b.set.sequence){
                return a.set.sequence-b.set.sequence;
            }
            return a.order-b.order;
        });
        res.status(200).json(sorted);
    }
    catch(error){
        console.error('getPlayers failed:',error.message);
        res.status(500).send({message:'Servor error',error:error.message});
    }
};

const createPlayer=async (req,res)=>{
    try{
        const {set}=req.body;
        //the set has to be one of THIS room's sets
        const setExists=await Set.findOne({_id:set,room:req.room._id});
        if(!setExists){
            return res.status(400).json({message:'No existing set'});
        }
        const startOrder=await getNextOrderStart(req.room._id);
        const player=await Player.create({...req.body,order:startOrder,room:req.room._id});
        res.status(201).json({message:'Player created succesfully',player});
    }
    catch(error){
        console.error('createPlayer failed:',error.message);
        res.status(500).send({message:'Servor error',error:error.message});
    }
}

const updatePlayer=async (req,res)=>{
    try{
        const {room,...updates}=req.body;
        if(updates.set!==undefined){
            const setExists=await Set.findOne({_id:updates.set,room:req.room._id});
            if(!setExists){
                return res.status(400).json({message:'No existing set'});
            }
        }
        const player=await Player.findOneAndUpdate({_id:req.params.id,room:req.room._id},updates,{
            new:true,
            runValidators:true
        });

        if(!player){
            return res.status(404).json({message:"Player not found"});
        }

        res.status(200).json({message:"Player updated successfully",player});

    }
    catch(error){
        console.error('updatePlayer failed:',error.message);
        res.status(500).json({message:"Server error",error:error.message});
    }
};

const bulkCreatePlayers=async (req,res)=>{
    try{
        const players=req.body.players;

        for (const player of players) {
      const setExists = await Set.findOne({_id:player.set,room:req.room._id});
      if (!setExists) {
        return res.status(400).json({ message: `Invalid set ID for player ${player.name}` });
      }
    }

        const startOrder=await getNextOrderStart(req.room._id);

        const withOrder=players.map((player,index)=>{
            return {...player,order:startOrder+index,room:req.room._id};
        })

        const created=await Player.insertMany(withOrder);
        res.status(201).json({message:created.length+"players uploaded",players:created});
    }
    catch(error){
        console.error('bulkCreatePlayers failed:',error.message);
        res.status(500).json({message:"Server error",error:error.message});
    }

};
const deletePlayer=async (req,res)=>{
    try{
        const player=await Player.findOne({_id:req.params.id,room:req.room._id});
        if(!player){
            return res.status(404).json({message:'Player not found'});
        }
        if(player.status!=='pending'){
            return res.status(400).json({message:'Only pending players can be deleted'});
        }
        await Player.deleteOne({_id:player._id});
        res.status(200).json({message:'Player deleted successfully'});
    }
    catch(error){
        console.error('deletePlayer failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

module.exports={bulkCreatePlayers,getPlayers,createPlayer,updatePlayer,deletePlayer};
