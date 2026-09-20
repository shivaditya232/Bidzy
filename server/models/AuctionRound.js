const mongoose=require('mongoose');

const auctionRoundSchema=new mongoose.Schema({
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
        teamName:{type:String}
    }]
});

module.exports=mongoose.model('AuctionRound',auctionRoundSchema);
