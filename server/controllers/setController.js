const Set=require('../models/Set');

const  getNextSequence=async ()=>{
    const LastSet=await Set.findOne().sorted({sequence:-1});
    if(LastSet){
        return LastSet+1;
    }
    else{
        return 1;
    }
};

const createSet=async (req,res)=>{
    try{
        const {name}=req.body;
        const existing=await Set.findOne({name});
        if(existing){
            res.status(400).json({message:'Already a set with this name exists'});
        }
        Set.create({name,sequence});
        res.status(201).json({message:'Set created successfully'});
    }
    catch(error){
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getSets=async (req,res)=>{
    try{
    const sets=await Set.find().sort({sequence:1});
    res.status(200).json(sets);
    }
    catch(error){
        res.status(500).json({message:'Server error',error:error.message});
    }
}

const reorderSets=async (req,res)=>{
    try{
        const {orderedSetIds}=req.body;

        const updates=orderedSetIds.map((id,index)=>{
            Set.findByIdAndUpdate(id,{sequence:index+1});
        });

        await Promise.all(updates);

        const sets=await Set.find().sort({sequence:1});
        res.status(200).json({message:"Reordered successfully"});
    }
    catch(error){
        res.status(500).json({message:'Server error',error:error.message});
    }
}

module.exports={getSets,createSet,reorderSets};