const Player=require('../models/Player');
const Set=require('../models/Set');
const getNextOrderStart=async ()=>{
    const lastPlayer=await Player.findOne().sort({order:-1});
    if(lastPlayer){
        return lastPlayer.order+1;
    }
    else{
        return 1;
    }
}

const getPlayers=async (req,res)=>{
    try{
        const players=await Player.find().populate('set').populate('soldTo','teamName');
        const sorted=players.sort((a,b)=>{
            if(a.set.sequence!==b.set.sequence){
                return a.set.sequence-b.set.sequence;
            }
            return a.order-b.order;
        });
        res.status(200).json(sorted);
    }
    catch(error){
        res.status(500).send({message:'Servor error',error:error.message});
    }
};

const createPlayer=async (req,res)=>{
    try{
        const {set}=req.body;
        const setExists=await Set.findById(set);
        if(!setExists){
            return res.status(400).json({message:'No existing set'});
        }
        const startOrder=await getNextOrderStart();
        const player=await Player.create({...req.body,order:startOrder});
        res.status(201).json({message:'Player created succesfully',player});
    }
    catch(error){
        res.status(500).send({message:'Servor error',error:error.message});
    }
}

const updatePlayer=async (req,res)=>{
    try{
        const player=await Player.findByIdAndUpdate(req.params.id,req.body,{
            new:true,
            runValidators:true
        });

        if(!player){
            return res.status(404).json({message:"Player not found"});
        }

        res.status(200).json({message:"Player updated successfully",player});

    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

const bulkCreatePlayers=async (req,res)=>{
    try{
        const players=req.body.players;

        for (const player of players) {
      const setExists = await Set.findById(player.set);
      if (!setExists) {
        return res.status(400).json({ message: `Invalid set ID for player ${player.name}` });
      }
    }

        const startOrder=await getNextOrderStart();

        const withOrder=players.map((player,index)=>{
            return {...player,order:startOrder+index};
        })

        const created=await Player.insertMany(withOrder);
        res.status(201).json({message:created.length+"players uploaded",players:created});
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }

};
const deletePlayer=async (req,res)=>{
    try{
        const player=await Player.findById(req.params.id);
        if(!player){
            return res.status(404).json({message:'Player not found'});
        }
        if(player.status!=='pending'){
            return res.status(400).json({message:'Only pending players can be deleted'});
        }
        await Player.findByIdAndDelete(req.params.id);
        res.status(200).json({message:'Player deleted successfully'});
    }
    catch(error){
        res.status(500).json({message:'Server error',error:error.message});
    }
};

module.exports={bulkCreatePlayers,getPlayers,createPlayer,updatePlayer,deletePlayer};