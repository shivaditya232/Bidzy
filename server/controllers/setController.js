const Set=require('../models/Set');
const Player=require('../models/Player');

const  getNextSequence=async (roomId)=>{
    const LastSet=await Set.findOne({room:roomId}).sort({sequence:-1});
    if(LastSet){
        return LastSet.sequence+1;
    }
    else{
        return 1;
    }
};

const createSet=async (req,res)=>{
    try{
        const {name}=req.body;
        const existing=await Set.findOne({name,room:req.room._id});
        if(existing){
            return res.status(400).json({message:'Already a set with this name exists'});
        }
        const sequence = await getNextSequence(req.room._id);
        const newSet=await Set.create({name,sequence,room:req.room._id});
        res.status(201).json({message:'Set created successfully',set:newSet});
    }
    catch(error){
        if(error.code===11000){
            return res.status(400).json({message:'Already a set with this name exists'});
        }
        console.error('createSet failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getSets=async (req,res)=>{
    try{
    const sets=await Set.find({room:req.room._id}).sort({sequence:1});
    res.status(200).json(sets);
    }
    catch(error){
        console.error('getSets failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
}

const reorderSets=async (req,res)=>{
    try{
        const {orderedSetIds}=req.body;

        //room in the filter: ids from another room just don't match
        const updates=orderedSetIds.map((id,index)=>{
            return Set.updateOne({_id:id,room:req.room._id},{sequence:index+1});
        });

        await Promise.all(updates);

        res.status(200).json({message:"Reordered successfully"});
    }
    catch(error){
        console.error('reorderSets failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
}

const updateSet=async (req,res)=>{
    try{
        const {name}=req.body;
        const updatedSet=await Set.findOneAndUpdate({_id:req.params.id,room:req.room._id},{name},{
            new:true,
            runValidators:true
        });
        if(!updatedSet){
            return res.status(404).json({message:'Set not found'});
        }
        res.status(200).json({message:'Set updated successfully',set:updatedSet});
    }
    catch(error){
        if(error.code===11000){
            return res.status(400).json({message:'Already a set with this name exists'});
        }
        console.error('updateSet failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const deleteSet=async (req,res)=>{
    try{
        const playersInSet=await Player.countDocuments({set:req.params.id,room:req.room._id});
        if(playersInSet>0){
            return res.status(400).json({message:'Cannot delete a set that still has players assigned to it'});
        }
        const deletedSet=await Set.findOneAndDelete({_id:req.params.id,room:req.room._id});
        if(!deletedSet){
            return res.status(404).json({message:'Set not found'});
        }
        res.status(200).json({message:'Set deleted successfully'});
    }
    catch(error){
        console.error('deleteSet failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

module.exports={getSets,createSet,reorderSets,updateSet,deleteSet};
