const mongoose=require('mongoose');

//one doc per (user, room). this is where a user's role, team name and purse live from A3 on.
const membershipSchema=new mongoose.Schema({
    room:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Room',
        required:true
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    role:{
        type:String,
        enum:['host','team'],
        required:true
    },
    //only teams have these. the host runs the auction and doesn't bid.
    teamName:{
        type:String,
        trim:true,
        maxlength:40
    },
    purse:{
        type:Number
    },
    purseRemaining:{
        type:Number
    },
    //IPL rooms: the franchise this team picked (CSK, MI, ...). custom rooms: none.
    franchise:{
        type:String
    },
    //the team's colour: the franchise's colour in IPL rooms, the team's own pick in custom rooms
    color:{
        type:String
    },
    //the team's playing XI in batting order. lineup[0] = position 1 ... lineup[10] = position 11.
    //each position has one starter and the backups who can replace them.
    //a backup can cover several positions. private to the team until the auction ends.
    lineup:{
        type:[{
            _id:false,
            player:{type:mongoose.Schema.Types.ObjectId,ref:'Player',default:null},
            backups:[{type:mongoose.Schema.Types.ObjectId,ref:'Player'}]
        }],
        default:undefined
    }
},{timestamps:true});

//a user can be in a room only once
membershipSchema.index({room:1,user:1},{unique:true});

//team names are unique inside a room, ignoring case ("CSK" and "csk" clash).
//partial filter: the host has no teamName, so it isn't part of this index.
membershipSchema.index(
    {room:1,teamName:1},
    {
        unique:true,
        collation:{locale:'en',strength:2},
        partialFilterExpression:{teamName:{$type:'string'}}
    }
);

//each franchise can be taken by only one team in a room
membershipSchema.index(
    {room:1,franchise:1},
    {
        unique:true,
        partialFilterExpression:{franchise:{$type:'string'}}
    }
);

//11 empty positions: what a team starts with, and what a new auction resets to
const emptyLineup=()=>Array.from({length:11},()=>({player:null,backups:[]}));

module.exports=mongoose.model('Membership',membershipSchema);
module.exports.emptyLineup=emptyLineup;
