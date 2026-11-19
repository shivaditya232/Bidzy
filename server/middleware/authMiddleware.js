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
        //the token only carries the id. role comes from the DB, so a deleted user or changed role takes effect immediately.
        const user=await User.findById(decoded.id).select('role');
        if(!user){
            return res.status(401).json({message:"Account no longer exists"});
        }
        req.user={id:user._id.toString(),role:user.role||null};
        next();
    }
    catch(error){
        console.error('protect failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const authorize=(...allowedRoles)=>{
    return (req,res,next)=>{
        if(!allowedRoles.includes(req.user.role)){
            return res.status(403).json({message:"access denied"});
        }
        next();
    };
};
module.exports={protect,authorize};