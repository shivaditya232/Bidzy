const jwt=require('jsonwebtoken');
const mongoose=require('mongoose');
const User=require('../models/User');
const Membership=require('../models/Membership');

let io;

//runs once per connection, before 'connection' fires. no valid token -> the socket is refused.
const authenticateSocket=async (socket,next)=>{
    try{
        const token=socket.handshake.auth && socket.handshake.auth.token;
        if(!token){
            return next(new Error('No token provided'));
        }
        let decoded;
        try{
            decoded=jwt.verify(token,process.env.JWT_SECRET);
        }
        catch(error){
            return next(new Error('Invalid or expired token'));
        }
        const user=await User.findById(decoded.id).select('_id');
        if(!user){
            return next(new Error('Account no longer exists'));
        }
        socket.data.userId=user._id.toString();
        next();
    }
    catch(error){
        console.error('socket auth failed:',error.message);
        next(new Error('Server error'));
    }
};

//client asks to follow a room's live events. only members get in.
//a socket follows one room at a time, so joining a new one leaves the old one.
const handleJoinRoom=(socket)=>async (roomId,ack)=>{
    const reply=typeof ack==='function' ? ack : ()=>{};
    try{
        if(typeof roomId!=='string'||!mongoose.isValidObjectId(roomId)){
            return reply({ok:false,message:'Room not found'});
        }
        const member=await Membership.findOne({room:roomId,user:socket.data.userId});
        if(!member){
            return reply({ok:false,message:"You're not a member of this room"});
        }
        for(const joined of socket.rooms){
            if(joined!==socket.id&&joined!==roomId){
                socket.leave(joined);
            }
        }
        socket.join(roomId);
        reply({ok:true,role:member.role});
    }
    catch(error){
        console.error('join-room failed:',error.message);
        reply({ok:false,message:'Server error'});
    }
};

module.exports={
    init:(server)=>{
        const {Server}=require('socket.io');
        io=new Server(server,{
            cors:{origin:'*'}
        });
        io.use(authenticateSocket);
        io.on('connection',(socket)=>{
            socket.on('join-room',handleJoinRoom(socket));
        });
        return io;
    },
    getIO:()=>{
        if(!io){
            throw new Error("Socket.io not initialized yet");
        }
        return io;
    },
    //send an event only to the sockets that joined this room
    emitToRoom:(roomId,event,data)=>{
        if(!io){
            throw new Error("Socket.io not initialized yet");
        }
        io.to(roomId.toString()).emit(event,data);
    }


};
