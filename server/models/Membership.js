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

module.exports=mongoose.model('Membership',membershipSchema);
