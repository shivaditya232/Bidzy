const AuctionSession=require('../models/AuctionSession');
const Player=require('../models/Player');
const User=require('../models/User');
const Bid=require('../models/Bid');

const BIDDING_SECONDS=15;

const getOrCreateSession=async ()=>{
    let session=await AuctionSession.findOne();
    if(!session){
        session=await AuctionSession.create();
    }
    return session;
}

const startAuction=async (req,res)=>{
    try{
        const session=await getOrCreateSession();

        if(session.status==='live'){
            return res.status(400).json({message:'Auction is already live'});
        }

        const firstPlayer=await Player.findOne({status:'pending'}).sort({order:1});

        if(!firstPlayer){
            return res.status('400')
        }

        session.currentPlayer=firstPlayer._id;
        session.currentPrice=firstPlayer.basePrice;
        session.highestBidder=null;
        session.timerEndsAt=new Date(Date.now()+BIDDING_SECONDS*1000);
        session.status='live';
        await session.save();

        firstPlayer.status='live';
        await firstPlayer.save();

        res.status(200).json({message:'Auction started'});
    }
    catch(error){
        res.status(500).json({message:"Servor error",error:error.message});
    }
}