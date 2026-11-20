const jwt=require('jsonwebtoken');
const User=require('../models/User');

const protect=async (req,res,next)=>{
    const authHeader=req.headers.authorization;
    if(!authHeader||!authHeader.startsWith('Bearer ')){
        return res.status(401).json({message:"No token provided,access denied"});
    }
    const token=authHeader.split(' ')[1];

    let decoded;
    try{
        decoded=jwt.verify(token,process.env.JWT_SECRET);
    }
    catch(error){
        return res.status(401).json({message:"Invalid or expired token"});
    }

    try{
        //make sure the account still exists, so a deleted user is locked out straight away.
        //what you may do inside a room is checked later by loadRoomMember / requireHost / requireTeam.
        const user=await User.findById(decoded.id).select('_id');
        if(!user){
            return res.status(401).json({message:"Account no longer exists"});
        }
        req.user={id:user._id.toString()};
        next();
    }
    catch(error){
        console.error('protect failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

module.exports={protect};