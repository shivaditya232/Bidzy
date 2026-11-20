const Set=require('../models/Set');

const DEFAULT_SETS=['Marquee','Batsman Set 1','Allrounder Set 1','Bowler Set 1','Wicketkeeper Set 1'];


//to seed the room with default sets and avoiding duplicates with the key (room,name)
const seedDefaultSets=async (roomId)=>{
    try{
        await Set.insertMany(DEFAULT_SETS.map((name,i)=>({room:roomId,name,sequence:i+1})));
    }
    catch(error){
        console.error('Seeding default sets failed',error.message);
    }
};

module.exports=seedDefaultSets;
