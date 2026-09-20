const User=require('../models/User');

const getTeams=async (req,res)=>{
    try{
        const teams=await User.find({role:'team'}).select('-password');
        res.status(200).json(teams);
    }
    catch(error){
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const updateTeam=async (req,res)=>{
    try{
        const {teamName,purseRemaining}=req.body;
        const updateData={};
        if(teamName!==undefined) updateData.teamName=teamName;
        if(purseRemaining!==undefined) updateData.purseRemaining=purseRemaining;

        const team=await User.findByIdAndUpdate(req.params.id,updateData,{
            new:true,
            runValidators:true
        }).select('-password');

        if(!team){
            return res.status(404).json({message:'Team not found'});
        }

        res.status(200).json({message:'Team updated successfully',team});
    }
    catch(error){
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getPublicTeams=async (req,res)=>{
    try{
        const teams=await User.find({role:'team'}).select('teamName purseRemaining');
        res.status(200).json(teams);
    }
    catch(error){
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getMyProfile=async (req,res)=>{
    try{
        const user=await User.findById(req.user.id).select('-password');
        if(!user){
            return res.status(404).json({message:'User not found'});
        }
        res.status(200).json(user);
    }
    catch(error){
        res.status(500).json({message:'Server error',error:error.message});
    }
};

module.exports={getTeams,updateTeam,getMyProfile,getPublicTeams};
