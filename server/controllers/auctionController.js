const mongoose=require('mongoose');
const AuctionSession=require('../models/AuctionSession');
const Player=require('../models/Player');
const Room=require('../models/Room');
const Membership=require('../models/Membership');
const Bid=require('../models/Bid');
const AuctionRound=require('../models/AuctionRound');
const {getIO}=require('../config/socket');

//one session doc per room. if two requests create it at once, the unique index lets one win and the other re-reads.
const getOrCreateSession=async (roomId)=>{
    let session=await AuctionSession.findOne({room:roomId});
    if(!session){
        try{
            session=await AuctionSession.create({room:roomId});
        }
        catch(error){
            if(error.code!==11000) throw error;
            session=await AuctionSession.findOne({room:roomId});
        }
    }
    return session;
}

const startAuction=async (req,res)=>{
    let claimed=false;
    try{
        const room=req.room;
        const firstPlayer=await getNextPendingPlayer(room._id);

        if(!firstPlayer){
            return res.status(400).json({message:"No players available to auction"});
        }

        //claim the start: lobby -> live, only once. a double click (or two host tabs) can't start it twice.
        const liveRoom=await Room.findOneAndUpdate({_id:room._id,status:'lobby'},{$set:{status:'live'}},{returnDocument:'after'});
        if(!liveRoom){
            const message=room.status==='ended' ? 'Auction has ended. Start a new auction first' : 'Auction is already live';
            return res.status(400).json({message});
        }
        claimed=true;

        const session=await getOrCreateSession(room._id);
        session.currentPlayer=firstPlayer._id;
        session.currentPrice=firstPlayer.basePrice;
        session.highestBidder=null;
        session.timerEndsAt=new Date(Date.now()+liveRoom.settings.timerSeconds*1000);
        session.status='live';
        await session.save();

        firstPlayer.status='live';
        await firstPlayer.save();

        getIO().emit('auction-started',{
            roomId:room._id,
            currentPlayer:firstPlayer,
            currentPrice:session.currentPrice,
            timerEndsAt:session.timerEndsAt
        });

        res.status(200).json({message:'Auction started'});
    }
    catch(error){
        //we flipped the room to live but couldn't finish -> put it back so the host can retry
        if(claimed){
            await Room.updateOne({_id:req.room._id,status:'live'},{$set:{status:'lobby'}}).catch(()=>{});
        }
        console.error('startAuction failed:',error.message);
        res.status(500).json({message:"Servor error",error:error.message});
    }
}

//bands come from the room's settings, e.g. [{upTo:100,step:5},...,{upTo:null,step:25}]
const getBidIncrement=(currentPrice,increments)=>{
    for(const band of increments){
        if(band.upTo===null||band.upTo===undefined||currentPrice<band.upTo){
            return band.step;
        }
    }
    return increments[increments.length-1].step;
}

const placeBid=async (req,res)=>{
    try{
        const room=req.room;
        const memberId=req.member._id;
        const session=await AuctionSession.findOne({room:room._id});
        if(!session||session.status!=='live'){
            return res.status(400).json({message:"No active bidding"});
        }
        if(new Date()>session.timerEndsAt){
            return res.status(400).json({message:'The time is over'});

        }

        if(session.highestBidder && session.highestBidder.toString()===memberId.toString()){
            return res.status(400).json({message:"You're already the highest bidder"});
        }
        const newAmount=session.currentPrice+getBidIncrement(session.currentPrice,room.settings.increments);

        //fresh read: the purse may have changed since the request started
        const team=await Membership.findById(memberId);

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
                highestBidder:{$ne:memberId}
            },
            {
                $set:{
                    currentPrice:newAmount,
                    highestBidder:memberId,
                    timerEndsAt:new Date(now.getTime()+room.settings.timerSeconds*1000)
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
            roomId:room._id,
            currentPrice:updatedSession.currentPrice,
            highestBidder:updatedSession.highestBidder,
            highestBidderName:team.teamName,
            timerEndsAt:updatedSession.timerEndsAt
        });

        await Bid.create({
            room:room._id,
            player:updatedSession.currentPlayer,
            team:memberId,
            amount:newAmount
        });

        res.status(200).json({message:"PLayer bid placed successfully",session:updatedSession});
    }
    catch(error){
        console.error('placeBid failed:',error.message);
        res.status(500).json({message:"Server error",error:error.message});
    }
}

const getNextPendingPlayer=async(roomId)=>{
    const pendingPlayers=await Player.find({room:roomId,status:'pending'}).populate('set');

    pendingPlayers.sort((a,b)=>{
        if(a.set.sequence!==b.set.sequence){
            return a.set.sequence-b.set.sequence;
        }
        return a.order-b.order;
    })

    return pendingPlayers[0]||null;
}

const finalizeAndAdvance=async(roomId)=>{
    //Step 1: claim. freeze the session (timerEndsAt:null) only if it is still live and the timer has passed.
    //only one caller can win this. it also makes any late bid fail, because bids need timerEndsAt > now.
    let session=await AuctionSession.findOneAndUpdate(
        {room:roomId,status:'live',currentPlayer:{$ne:null},timerEndsAt:{$lte:new Date()}},
        {$set:{timerEndsAt:null}},
        {returnDocument:'after'}
    );
    if(!session){
        //no fresh claim. if a previous finalize crashed halfway, the session is live but frozen -> resume it.
        session=await AuctionSession.findOne({room:roomId,status:'live',currentPlayer:{$ne:null},timerEndsAt:null});
    }
    if(!session){
        return;
    }

    //Step 2: flip the player to sold/unsold. only the call that does this flip deducts the purse.
    const finishedPlayer=await Player.findOneAndUpdate(
        {_id:session.currentPlayer,room:roomId,status:{$in:['live','pending']}},
        session.highestBidder
            ? {$set:{status:'sold',soldPrice:session.currentPrice,soldTo:session.highestBidder}}
            : {$set:{status:'unsold'}},
        {returnDocument:'after'}
    );

    if(finishedPlayer && finishedPlayer.status==='sold'){
        //conditional $inc: deduct only if the team can still afford it
        const paidTeam=await Membership.findOneAndUpdate(
            {_id:session.highestBidder,room:roomId,purseRemaining:{$gte:session.currentPrice}},
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
        const winningTeam=await Membership.findById(player.soldTo).select('teamName');
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
    const upcomingPlayer=await getNextPendingPlayer(roomId);
    if(!upcomingPlayer){
        const endedSession=await AuctionSession.findOneAndUpdate(
            {_id:session._id,status:'live',currentPlayer:session.currentPlayer},
            {$set:{status:'ended',currentPlayer:null,highestBidder:null,currentPrice:0,timerEndsAt:null}}
        );
        if(endedSession){
            await Room.updateOne({_id:roomId},{$set:{status:'ended'}});
            getIO().emit('auction-ended',{roomId,finishedPlayer:finishedData});
        }
        return;
    }

    const room=await Room.findById(roomId).select('settings.timerSeconds');
    const advancedSession=await AuctionSession.findOneAndUpdate(
        {_id:session._id,status:'live',currentPlayer:session.currentPlayer},
        {$set:{
            currentPlayer:upcomingPlayer._id,
            currentPrice:upcomingPlayer.basePrice,
            highestBidder:null,
            timerEndsAt:new Date(Date.now()+room.settings.timerSeconds*1000)
        }},
        {returnDocument:'after'}
    );
    if(!advancedSession){
        return;
    }
    await Player.updateOne({_id:upcomingPlayer._id},{$set:{status:'live'}});

    getIO().emit('next-player',{
        roomId,
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
        const roomId=req.room._id;
        const players=await Player.find({room:roomId,status:{$in:['sold','unsold']}}).populate('soldTo','teamName');

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
            await AuctionRound.create({room:roomId,results});
        }

        await Player.updateMany({room:roomId},{status:'pending',soldPrice:null,soldTo:null});
        await Membership.updateMany({room:roomId,role:'team'},[{$set:{purseRemaining:'$purse'}}],{updatePipeline:true});
        await AuctionSession.deleteOne({room:roomId});
        await Room.updateOne({_id:roomId},{$set:{status:'lobby'}});

        res.status(200).json({message:'Auction has been reset. Ready for a new round.'});
    }
    catch(error){
        console.error('resetAuction failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getAuctionRounds=async (req,res)=>{
    try{
        const rounds=await AuctionRound.find({room:req.room._id}).sort({completedAt:-1});
        res.status(200).json(rounds);
    }
    catch(error){
        console.error('getAuctionRounds failed:',error.message);
        res.status(500).json({message:'Server error',error:error.message});
    }
};

const getAuctionRoundById=async (req,res)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.id)){
            return res.status(404).json({message:'Auction round not found'});
        }
        const round=await AuctionRound.findOne({_id:req.params.id,room:req.room._id});
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
        const session=await getOrCreateSession(req.room._id);
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

//every second: find every live room whose timer ran out and finalize them all in parallel.
//rooms are independent docs, so one slow room doesn't hold up the others' writes.
const autoAdvanceTimer=setInterval(async()=>{
    if(isTicking){
        return;
    }
    isTicking=true;
    try{
        //timerEndsAt null while live = a finalize was interrupted (e.g. server restart), so resume it
        const dueSessions=await AuctionSession.find({
            status:'live',
            $or:[{timerEndsAt:null},{timerEndsAt:{$lte:new Date()}}]
        }).select('room');

        await Promise.all(dueSessions.map(s=>
            finalizeAndAdvance(s.room).catch(error=>console.error('Auto advance failed for room',s.room.toString(),error.message))
        ));
    }
    catch(error){
        console.error('Auto advance check failed',error.message);
    }
    finally{
        isTicking=false;
    }
},1000);

module.exports={getOrCreateSession,startAuction,placeBid,getCurrentAuction,resetAuction,getAuctionRounds,getAuctionRoundById,finalizeAndAdvance,autoAdvanceTimer};
