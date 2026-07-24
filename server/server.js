require('dotenv').config();
const express=require('express');
const cors=require('cors');
const connectDB=require('./config/db');
const authRoutes=require('./routes/authRoutes');
const playerRoutes=require('./routes/playerRoutes');
const setRoutes = require('./routes/setRoutes');
const app=express();
connectDB();
app.use(cors());
app.use(express.json());
app.use('/api/auth',authRoutes);
app.use('/api/players',playerRoutes);
app.use('/api/sets', setRoutes);
app.get('/',(req,res)=>{
    res.send("Bidzy API is running")
});
const PORT=process.env.PORT||5000;
app.listen(PORT,()=>{
    console.log("Server running on port "+PORT);
});