require('dotenv').config();
const express=require('express');
const cors=require('cors');
const connectDB=require('./config/db');
const authRoutes=require('./routes/authRoutes');
const playerRoutes=require('./routes/playerRoutes');
const setRoutes = require('./routes/setRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const userRoutes = require('./routes/userRoutes');
const socketConfig=require('./config/socket');
const seedDefaultSets=require('./config/seedSets');
const http=require('http');
const {Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=socketConfig.init(server);
connectDB();
seedDefaultSets();
app.use(cors());
app.use(express.json());
app.use('/api/auth',authRoutes);
app.use('/api/players',playerRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/users', userRoutes);
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