const mongoose=require('mongoose');

const UserSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:['admin','team'],
        required:true
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