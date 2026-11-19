const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const User=require('../models/User');

const registerUser=async (req,res)=>{
    try{
        //only these three are read. role/teamName/purse in the body are ignored on purpose.
        const name=typeof req.body.name==='string' ? req.body.name.trim() : '';
        const email=typeof req.body.email==='string' ? req.body.email.trim().toLowerCase() : '';
        const password=typeof req.body.password==='string' ? req.body.password : '';

        if(!name||!email||!password){
            return res.status(400).json({message:"Name, email and password are required"});
        }
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
            return res.status(400).json({message:"Enter a valid email"});
        }
        if(password.length<6){
            return res.status(400).json({message:"Password must be at least 6 characters"});
        }

        const existingUser= await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message:"User already exists with this email"});
        }

        const hashedPassword=await bcrypt.hash(password,10);

        const newUser=await User.create({
            name,
            email,
            password:hashedPassword
        });

        //log them straight in after sign-up
        const token=jwt.sign({id:newUser._id},process.env.JWT_SECRET,{expiresIn:'7d'});

        res.status(201).json({
            message:"User created successfully",
            token,
            user:{
                id:newUser._id,
                name:newUser.name,
                email:newUser.email,
                role:newUser.role||null
            }
        });
    }
    catch(error){
        //two sign-ups with the same email at the same instant: both pass findOne, the unique index rejects the second
        if(error.code===11000){
            return res.status(400).json({message:"User already exists with this email"});
        }
        console.error('registerUser failed:',error.message);
        res.status(500).json({message:"server error",error:error.message});
    }
};

const loginUser=async(req,res)=>{
    try{
        const email=typeof req.body.email==='string' ? req.body.email.trim().toLowerCase() : '';
        const password=typeof req.body.password==='string' ? req.body.password : '';
        if(!email||!password){
            return res.status(400).json({message:"Email and password are required"});
        }

        const user=await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"Invalid email or password"});
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({message:'Invalid email or password'});
        }
        //token only says who you are. what you're allowed to do is looked up fresh on each request.
        const token=jwt.sign({
            id:user._id
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
        console.error('loginUser failed:',error.message);
        res.status(500).json({message:"Servor error",error:error.message});
    }
};

module.exports={registerUser,loginUser};