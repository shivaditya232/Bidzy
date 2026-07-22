const Player=require('../models/Player');

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
        const players=await Player.find().sort({order:1});
        res.status(200).json(players);
    }
    catch(error){
        res.status(500).send({message:'Servor error',error:error.message});
    }
};

const createPlayer=async (req,res)=>{
    try{
        const startOrder=await getNextOrderStart();
        const player=await Player.create({...req.body,order:startOrder});
        res.status(201).json({message:'Player created succesfully'});
    }
    catch(error){
        res.status(500).send({message:'Servor error',error:error.message});
    }
}

const updatePlayer=async (req,res)=>{
    try{
        const player=await Player.findByIdAndUpdate(req.params.id,req.body,{
            new:true,
            runValidtors:true
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
module.exports={bulkCreatePlayers,getPlayers,createPlayer,updatePlayer};