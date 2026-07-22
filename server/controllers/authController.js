const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const User=require('../models/User');

const registerUser=async (req,res)=>{
    try{
        const {name,email,password,role,teamName,purse}=req.body;

        const existingUser= await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message:"User already exists with this email"});
        }

        const hashedPassword=await bcrypt.hash(password,10);

        const newUser=await User.create({
            name,
            email,
            password:hashedPassword,
            role,
            teamName,
            purse:purse||100,
            purseRemaining:purse||100
        });

        res.status(201).json({
            message:"User created successfully",
            user:{
                id:newUser._id,
                name:newUser.name,
                email:newUser.email,
                role:newUser.role
            }
        });
    }
    catch(error){
        res.status(500).json({message:"server error",error:error.message});
    }
};

const loginUser=async(req,res)=>{
    try{
        const {email,password}=req.body;

        const user=await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"Invalid email or password"});
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({message:'Invalid email or password'});
        }
        const token=jwt.sign({
            id:user._id,role:user.role
        },process.env.JWT_SECRET,{
            expiresIn:'7d'
        });
        res.status(200).json({
            token,
            user:{
                id:user._id,
                name:user.name,
                email:user.email,
                role:user.role,
                teamName:user.teamName,
                purseRemaining:user.purseRemaining
            }
        });
    }
    catch(error){
        res.status(500).json({message:"Servor error",error:error.message});
    }
};

module.exports={registerUser,loginUser};