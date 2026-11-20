const mongoose=require('mongoose');
const Room=require('../models/Room');
const Membership=require('../models/Membership');

//runs after protect. loads the room from :roomId and checks you're in it.
//sets req.room and req.member for the routes after it.
const loadRoomMember=async (req,res,next)=>{
    try{
        const {roomId}=req.params;
        if(!mongoose.isValidObjectId(roomId)){
            return res.status(404).json({message:'Room not found'});
        }
        const room=await Room.findById(roomId);
        if(!room){
            return res.status(404).json({message:'Room not found'});
        }
        const member=await Membership.findOne({room:room._id,user:req.user.id});
        if(!member){
            return res.status(403).json({message:"You're not a member of this room"});
        }
        req.room=room;
        req.member=member;
        next();
    }
    catch(error){
        console.error('loadRoomMember failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

//who can do what inside a room (these replaced the old global admin/team roles)
const requireHost=(req,res,next)=>{
    if(req.member.role!=='host'){
        return res.status(403).json({message:'Only the host can do this'});
    }
    next();
};

const requireTeam=(req,res,next)=>{
    if(req.member.role!=='team'){
        return res.status(403).json({message:'Only teams can do this'});
    }
    next();
};

module.exports={loadRoomMember,requireHost,requireTeam};
