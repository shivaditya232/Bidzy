const AuctionSession=require('../models/AuctionSession');
const Player=require('../models/Player');
const User=require('../models/User');
const Bid=require('../models/Bid');

const BIDDING_SECONDS=15;

const getOrCreateSession=async ()=>{
    let session=await AuctionSession.findOne();
    if(!session){
        session=await AuctionSession.create({});
    }
    return session;
}



const startAuction=async (req,res)=>{
    try{
        const session=await getOrCreateSession();

        if(session.status==='live'){
            return res.status(400).json({message:'Auction is already live'});
        }

        const firstPlayer=await getNextPendingPlayer();

        if(!firstPlayer){
            return res.status(400).json({message:"No players available to auction"});
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

const getBidIncrement=(currentPrice)=>{
    if(currentPrice<100) return 5;
    if(currentPrice<200) return 10;
    if(currentPrice<500) return 20;
    return 25;
}

const placeBid=async (req,res)=>{
    try{
        const session=await getOrCreateSession();
        if(session.status!=='live'){
            return res.status(400).json({message:"No active bidding"});
        }
        if(new Date()>session.timerEndsAt){
            return res.status(400).json({message:'The time is over'});
        }
        
        if(session.highestBidder && session.highestBidder.toString()===req.user.id){
            return res.status(400).json({message:"You're already the highest bidder"});
        }
        const newAmount=session.currentPrice+getBidIncrement(session.currentPrice);

        const team=await User.findById(req.user.id);

        if(newAmount>team.purseRemaining){
            return res.status(400).json({message:"Insufficient purse to place the bid"});
        }
        session.currentPrice=newAmount;
        session.highestBidder=req.user.id;
        session.timerEndsAt=new Date(Date.now()+BIDDING_SECONDS*1000);
        await session.save();

        await Bid.create({
            player:session.currentPlayer,
            team:req.user.id,
            amount:newAmount
        });

        res.status(200).json({message:"PLayer bid placed successfully",session});
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
}

const getNextPendingPlayer=async()=>{
    const pendingPlayers=await Player.find({status:'pending'}).populate('set');

    pendingPlayers.sort((a,b)=>{
        if(a.set.sequence!==b.set.sequence){
            return a.set.sequence-b.set.sequence;
        }
        return a.order-b.order;
    })

    return pendingPlayers[0]||null;
}

const finalizeAndAdvance=async()=>{
    const session=await getOrCreateSession();

    if(session.status!=='live'||!session.currentPlayer){
        return;
    }
    
    const finishedPlayer=await Player.findById(session.currentPlayer);
    if(session.highestBidder){
    finishedPlayer.status='sold';
    finishedPlayer.soldPrice=session.currentPrice;
    finishedPlayer.soldTo=session.highestBidder;
    await finishedPlayer.save();

    const winningTeam=await User.findById(session.highestBidder);
    winningTeam.purseRemaining-=session.currentPrice;
    await winningTeam.save();
}
    else{
        finishedPlayer.status='unsold';
        await finishedPlayer.save();
    }

    const upcomingPlayer=await getNextPendingPlayer();
    if(!upcomingPlayer){
        session.status='ended';
        session.currentPlayer=null;
        session.highestBidder=null;
        session.currentPrice=0;
        session.timerEndsAt=null;
        await session.save();
        return;
    }

    session.currentPlayer=upcomingPlayer._id;
    session.currentPrice=upcomingPlayer.basePrice;
    session.highestBidder=null;
    session.timerEndsAt=new Date(Date.now()+BIDDING_SECONDS*1000);
    await session.save();
    upcomingPlayer.status='live';
    await upcomingPlayer.save();

};

const getCurrentAuction=async (req,res)=>{
    try{
        const session=await getOrCreateSession();
        const populatedSession=await session.populate(['currentPlayer','highestBidder']);
        res.status(200).json({populatedSession});
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
}

setInterval(async()=>{
    try{
        const session=await getOrCreateSession();
        if(session.status==='live' && session.timerEndsAt && new Date()>session.timerEndsAt){
            await finalizeAndAdvance();
        }
    }
    catch(error){
        console.error('Auto advance check failed',error.message);
    }
},1000);

module.exports={getOrCreateSession,startAuction,placeBid,getCurrentAuction};