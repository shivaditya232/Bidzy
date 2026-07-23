const mongoose=require('mongoose');

const SetSchema=mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    sequence:{
        type:Number,
        required:true
    }
});

module.exports=mongoose.model('Set',SetSchema);
