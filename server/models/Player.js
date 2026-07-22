const mongoose=require('mongoose');
const User = require('./User');

const playerSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:['Batsman','Bowler','Allrounder','Wicketkeeper'],
        required:true
    },
    country:{
        type:String
    },
    basePrice:{
        type:Number,
        required:true
    },
    stats:{
        matches:{type:Number,default:0},
        runs:{type:Number,default:0},
        battingAverage:{type:Number,default:0},
        strikeRate:{type:Number,default:0},
        wickets:{type:Number,default:0},
        bowlingEconomy:{type:Number,default:0}
    },
    image:{
        type:String
    },
    status:{
        type:String,
        enum:['pending','live','sold','unsold'],
        default:'pending'
    },
    soldPrice:{
        type:Number
    },
    soldTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    order:{
        type:Number,
        required:true
    },
    setName:{
        type:String,
        required:true
    }
},{timestamps:true});

module.exports=mongoose.model('Player',playerSchema);