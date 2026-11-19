const mongoose=require('mongoose');

const BidSchema=new mongoose.Schema({
    room:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Room',
        required:true
    },
    player:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Player'
    },
    //the bidding team's membership in this room
    team:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Membership'
    },
    amount:{
        type:Number,
        required:true
    }
},{timestamps:true});

//the live bid feed (B3) reads "all bids on this player in this room, newest first"
BidSchema.index({room:1,player:1,createdAt:-1});

module.exports=mongoose.model('Bid',BidSchema);
