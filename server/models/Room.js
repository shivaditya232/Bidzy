const mongoose=require('mongoose');

//price bands for the bid step. upTo:null = "and above" (must be the last band).
//same numbers the single auction used: <100 +5, <200 +10, <500 +20, else +25
const DEFAULT_INCREMENTS=[
    {upTo:100,step:5},
    {upTo:200,step:10},
    {upTo:500,step:20},
    {upTo:null,step:25}
];

const roomSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
        maxlength:60
    },
    inviteCode:{
        type:String,
        required:true,
        unique:true
    },
    host:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    //lobby = teams can join and settings can change. live/ended = locked.
    status:{
        type:String,
        enum:['lobby','live','ended'],
        default:'lobby'
    },
    //kept on the room so "is there a free slot?" + "take it" can be one atomic update
    teamCount:{
        type:Number,
        default:0
    },
    settings:{
        purse:{type:Number,default:12000},
        timerSeconds:{type:Number,default:15},
        maxTeams:{type:Number,default:10},
        increments:{
            type:[{
                _id:false,
                upTo:{type:Number,default:null},
                step:{type:Number,required:true}
            }],
            default:()=>DEFAULT_INCREMENTS.map(band=>({...band}))
        }
    }
},{timestamps:true});

module.exports=mongoose.model('Room',roomSchema);
module.exports.DEFAULT_INCREMENTS=DEFAULT_INCREMENTS;
