const mongoose=require('mongoose')

const auctionSessionSchema=new mongoose.Schema({
    currentPlayer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Player'
    },
    currentPrice:{
        type:Number,
        default:0
    },
    timerEndsAt:{
        type:Date
    },
    status:{
        type:String,
        enum:['not_started','live','paused','ended'],
        default:'not_started'
    },
    highestBidder:{
        type:mongoose.Types.ObjectId,
        ref:'User'
    }
},{timestamps:true});

module.exports=mongoose.model('AuctionSession',auctionSessionSchema);