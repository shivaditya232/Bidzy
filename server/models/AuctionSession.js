const mongoose=require('mongoose')

const auctionSessionSchema=new mongoose.Schema({
    //one session per room. unique so two "create" calls can't make two.
    room:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Room',
        required:true,
        unique:true
    },
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
    //the leading team's membership in this room
    highestBidder:{
        type:mongoose.Types.ObjectId,
        ref:'Membership'
    }
},{timestamps:true});

module.exports=mongoose.model('AuctionSession',auctionSessionSchema);
