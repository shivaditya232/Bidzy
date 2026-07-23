const mongoose=require('mongoose');

const BidSchema=new mongoose.Schema({
    player:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Player'
    },
    team:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    amount:{
        type:Number,
        required:true
    }
},{timestamps:true});

module.exports=mongoose.model('Bid',BidSchema);