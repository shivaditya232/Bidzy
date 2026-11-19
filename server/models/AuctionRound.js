const mongoose=require('mongoose');

const auctionRoundSchema=new mongoose.Schema({
    room:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Room',
        required:true,
        index:true
    },
    completedAt:{
        type:Date,
        default:Date.now
    },
    results:[{
        playerName:{type:String},
        role:{type:String},
        country:{type:String},
        status:{type:String,enum:['sold','unsold']},
        soldPrice:{type:Number},
        teamName:{type:String},
        image:{type:String},
        stats:{
            matches:{type:Number},
            runs:{type:Number},
            battingAverage:{type:Number},
            strikeRate:{type:Number},
            wickets:{type:Number},
            bowlingEconomy:{type:Number}
        }
    }]
});

module.exports=mongoose.model('AuctionRound',auctionRoundSchema);
