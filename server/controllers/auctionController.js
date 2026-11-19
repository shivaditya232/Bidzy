const AuctionSession=require('../models/AuctionSession');
const Player=require('../models/Player');
const User=require('../models/User');
const Bid=require('../models/Bid');
const AuctionRound=require('../models/AuctionRound');
const {getIO}=require('../config/socket');
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

        getIO().emit('auction-started',{
            currentPlayer:firstPlayer,
            currentPrice:session.currentPrice,
            timerEndsAt:session.timerEndsAt
        });

        res.status(200).json({message:'Auction started'});
    }
    catch(error){
        console.error('startAuction failed:',error.message);
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
        //compare-and-set: only update if the session is still exactly what we just read.
        //if another bid landed in between, currentPrice has changed and nothing matches.
        const now=new Date();
        const updatedSession=await AuctionSession.findOneAndUpdate(
            {
                _id:session._id,
                status:'live',
                currentPlayer:session.currentPlayer,
                currentPrice:session.currentPrice,
                timerEndsAt:{$gt:now},
                highestBidder:{$ne:req.user.id}
            },
            {
                $set:{
                    currentPrice:newAmount,
                    highestBidder:req.user.id,
                    timerEndsAt:new Date(now.getTime()+BIDDING_SECONDS*1000)
                }
            },
            {returnDocument:'after'}
        );

        if(!updatedSession){
            //no match: either someone bid first, or the timer ran out in between. re-read to tell which.
            const latest=await AuctionSession.findById(session._id);
            if(!latest || latest.status!=='live' || !latest.timerEndsAt || new Date()>latest.timerEndsAt || latest.currentPlayer.toString()!==session.currentPlayer.toString()){
                return res.status(400).json({message:'The time is over'});
            }
            return res.status(409).json({message:"You were outbid, try again"});
        }

        getIO().emit('bid-placed',{
            currentPrice:updatedSession.currentPrice,
            highestBidder:updatedSession.highestBidder,
            highestBidderName:team.teamName,
            timerEndsAt:updatedSession.timerEndsAt
        });

        await Bid.create({
            player:updatedSession.currentPlayer,
            team:req.user.id,
            amount:newAmount
        });

        res.status(200).json({message:"PLayer bid placed successfully",session:updatedSession});
    }
    catch(error){
        console.error('placeBid failed:',error.message);
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
    //Step 1: claim. freeze the session (timerEndsAt:null) only if it is still live and the timer has passed.
    //only one caller can win this. it also makes any late bid fail, because bids need timerEndsAt > now.
    let session=await AuctionSession.findOneAndUpdate(
        {status:'live',currentPlayer:{$ne:null},timerEndsAt:{$lte:new Date()}},
        {$set:{timerEndsAt:null}},
        {returnDocument:'after'}
    );
    if(!session){
        //no fresh claim. if a previous finalize crashed halfway, the session is live but frozen -> resume it.
        session=await AuctionSession.findOne({status:'live',currentPlayer:{$ne:null},timerEndsAt:null});
    }
    if(!session){
        return;
    }

    //Step 2: flip the player to sold/unsold. only the call that does this flip deducts the purse.
    const finishedPlayer=await Player.findOneAndUpdate(
        {_id:session.currentPlayer,status:{$in:['live','pending']}},
        session.highestBidder
            ? {$set:{status:'sold',soldPrice:session.currentPrice,soldTo:session.highestBidder}}
            : {$set:{status:'unsold'}},
        {returnDocument:'after'}
    );

    if(finishedPlayer && finishedPlayer.status==='sold'){
        //conditional $inc: deduct only if the team can still afford it
        const paidTeam=await User.findOneAndUpdate(
            {_id:session.highestBidder,purseRemaining:{$gte:session.currentPrice}},
            {$inc:{purseRemaining:-session.currentPrice}}
        );
        if(!paidTeam){
            console.error('Purse too low at finalize, marking unsold:',finishedPlayer.name);
            finishedPlayer.status='unsold';
            finishedPlayer.soldPrice=null;
            finishedPlayer.soldTo=null;
            await finishedPlayer.save();
        }
    }

    //if the flip didn't match, an earlier run already did it. just load the player for the event data.
    const player=finishedPlayer||await Player.findById(session.currentPlayer);
    let winningTeamName=null;
    if(player.status==='sold'){
        const winningTeam=await User.findById(player.soldTo).select('teamName');
        winningTeamName=winningTeam ? winningTeam.teamName : null;
    }
    const finishedData={
        id:player._id,
        name:player.name,
        status:player.status,
        soldPrice:player.soldPrice||null,
        soldTo:player.soldTo||null,
        teamName:winningTeamName
    };

    //Step 3: advance. filter on currentPlayer so the session moves on exactly once.
    const upcomingPlayer=await getNextPendingPlayer();
    if(!upcomingPlayer){
        const endedSession=await AuctionSession.findOneAndUpdate(
            {_id:session._id,status:'live',currentPlayer:session.currentPlayer},
            {$set:{status:'ended',currentPlayer:null,highestBidder:null,currentPrice:0,timerEndsAt:null}}
        );
        if(endedSession){
            getIO().emit('auction-ended',{finishedPlayer:finishedData});
        }
        return;
    }

    const advancedSession=await AuctionSession.findOneAndUpdate(
        {_id:session._id,status:'live',currentPlayer:session.currentPlayer},
        {$set:{
            currentPlayer:upcomingPlayer._id,
            currentPrice:upcomingPlayer.basePrice,
            highestBidder:null,
            timerEndsAt:new Date(Date.now()+BIDDING_SECONDS*1000)
        }},
        {returnDocument:'after'}
    );
    if(!advancedSession){
        return;
    }
    await Player.updateOne({_id:upcomingPlayer._id},{$set:{status:'live'}});

    getIO().emit('next-player',{
        finishedPlayer:finishedData,
        newPlayer:{
            id:upcomingPlayer._id,
            name:upcomingPlayer.name,
            basePrice:upcomingPlayer.basePrice
        },
        currentPrice:advancedSession.currentPrice,
        timerEndsAt:advancedSession.timerEndsAt
    })

};

const resetAuction=async (req,res)=>{
    try{
        const players=await Player.find({status:{$in:['sold','unsold']}}).populate('soldTo','teamName');

        const results=players.map(player=>({
            playerName:player.name,
            role:player.role,
            country:player.country,
            status:player.status,
            soldPrice:player.soldPrice||null,
            teamName:player.soldTo ? player.soldTo.teamName : null,
            image:player.image||null,
            stats:player.stats
        }));

        if(results.length>0){
            await AuctionRound.create({results});
        }

        await Player.updateMany({},{status:'pending',soldPrice:null,soldTo:null});
        await User.updateMany({role:'team'},[{$set:{purseRemaining:'$purse'}}],{updatePipeline:true});
        await AuctionSession.deleteMany({});

        res.status(200).json({message:'Auction has been reset. Ready for a new round.'});
    }
    catch(error){
        console.error('resetAuction failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getAuctionRounds=async (req,res)=>{
    try{
        const rounds=await AuctionRound.find().sort({completedAt:-1});
        res.status(200).json(rounds);
    }
    catch(error){
        console.error('getAuctionRounds failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getAuctionRoundById=async (req,res)=>{
    try{
        const round=await AuctionRound.findById(req.params.id);
        if(!round){
            return res.status(404).json({message:'Auction round not found'});
        }
        res.status(200).json(round);
    }
    catch(error){
        console.error('getAuctionRoundById failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getCurrentAuction=async (req,res)=>{
    try{
        const session=await getOrCreateSession();
        const populatedSession=await session.populate([
            {path:'currentPlayer'},
            {path:'highestBidder',select:'teamName'}
        ]);
        res.status(200).json({populatedSession});
    }
    catch(error){
        console.error('getCurrentAuction failed:',error.message);
        res.status(500).json({message:"Server error",error:error.message});
    }
}

//if Atlas is slow, a tick can take longer than 1s. this flag stops the next tick from starting on top of it.
let isTicking=false;

const autoAdvanceTimer=setInterval(async()=>{
    if(isTicking){
        return;
    }
    isTicking=true;
    try{
        const session=await getOrCreateSession();
        //timerEndsAt null while live = a finalize was interrupted (e.g. server restart), so resume it
        if(session.status==='live' && (!session.timerEndsAt || new Date()>session.timerEndsAt)){
            await finalizeAndAdvance();
        }
    }
    catch(error){
        console.error('Auto advance check failed',error.message);
    }
    finally{
        isTicking=false;
    }
},1000);

module.exports={getOrCreateSession,startAuction,placeBid,getCurrentAuction,resetAuction,getAuctionRounds,getAuctionRoundById,finalizeAndAdvance,autoAdvanceTimer};