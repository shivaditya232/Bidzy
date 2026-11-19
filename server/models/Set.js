const mongoose=require('mongoose');

const SetSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    sequence:{
        type:Number,
        required:true
    },
    room:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Room',
        required:true
    }
});

//set names are unique inside a room (two rooms can both have a "Marquee" set)
SetSchema.index({room:1,name:1},{unique:true});

module.exports=mongoose.model('Set',SetSchema);
