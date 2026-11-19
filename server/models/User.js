const mongoose=require('mongoose');

const UserSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        //legacy global role for the single-auction app. new sign-ups get none;
        //from A3.3 roles live on room membership (host/team) instead.
        enum:['admin','team']
    },
    teamName:{
        type:String,
    },
    purse:{
        type:Number,
        default:12000
    },
    purseRemaining:{
        type:Number,
        default:12000
    },

},{
    timestamps:true
});

module.exports=mongoose.model('User',UserSchema);