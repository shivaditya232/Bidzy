require('dotenv').config();
const express=require('express');
const cors=require('cors');
const connectDB=require('./config/db');
const authRoutes=require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
//players, sets and the auction now live inside rooms: /api/rooms/:roomId/players etc.
const roomRoutes=require('./routes/roomRoutes');
const socketConfig=require('./config/socket');
const http=require('http');
const {Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=socketConfig.init(server);
connectDB();
app.use(cors());
app.use(express.json());
app.use('/api/auth',authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms',roomRoutes);
app.get('/',(req,res)=>{
    res.send("Bidzy API is running")
});
const PORT=process.env.PORT||5000;
server.listen(PORT,()=>{
    console.log("Server running on port "+PORT);
});

io.on('connection',(socket)=>{
    console.log('A client connected:',socket.id);

    socket.on('disconnect',()=>{
        console.log('A client disconnected',socket.id);
    });
});