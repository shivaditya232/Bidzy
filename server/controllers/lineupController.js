const Player=require('../models/Player');
const Membership=require('../models/Membership');
const {emptyLineup}=Membership;
const {validateLineup,getUnplaced}=require('../utils/lineupRules');

const getBought=(roomId,memberId)=>Player.find({room:roomId,soldTo:memberId,status:'sold'}).select('country');

//your XI + the players you bought who aren't placed yet. teams only.
const getMyLineup=async (req,res)=>{
    try{
        const lineup=req.member.lineup&&req.member.lineup.length ? req.member.lineup : emptyLineup();
        const bought=await getBought(req.room._id,req.member._id);
        res.status(200).json({lineup,unplaced:getUnplaced(lineup,bought)});
    }
    catch(error){
        console.error('getMyLineup failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//save the whole XI. works any time during or after the auction: it's a planning tool that grows as you buy.
const saveLineup=async (req,res)=>{
    try{
        const bought=await getBought(req.room._id,req.member._id);
        const {error,lineup}=validateLineup(req.body.lineup,bought,req.room.settings.rules);
        if(error){
            return res.status(400).json({message:error});
        }
        await Membership.updateOne({_id:req.member._id},{$set:{lineup}});
        res.status(200).json({message:'XI saved',lineup,unplaced:getUnplaced(lineup,bought)});
    }
    catch(error){
        console.error('saveLineup failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//everyone's XI. private while the auction runs, revealed to the whole room once it ends.
const getAllLineups=async (req,res)=>{
    try{
        if(req.room.status!=='ended'){
            return res.status(403).json({message:'Every XI is revealed when the auction ends'});
        }
        const teams=await Membership.find({room:req.room._id,role:'team'})
            .populate('lineup.player','name role country')
            .populate('lineup.backups','name role country')
            .sort({createdAt:1});
        res.status(200).json(teams.map(t=>({
            _id:t._id,
            teamName:t.teamName,
            franchise:t.franchise||null,
            color:t.color||null,
            lineup:t.lineup&&t.lineup.length ? t.lineup : emptyLineup()
        })));
    }
    catch(error){
        console.error('getAllLineups failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

module.exports={getMyLineup,saveLineup,getAllLineups};
