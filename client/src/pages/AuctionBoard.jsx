import { useState,useEffect } from "react"
import api from "../api/axios"
import socket from "../api/socket"
function AuctionBoard() {

  const [session,setSession]=useState(null);

  const fetchAuction=()=>{
    api.get('/auction')
    .then(res=>{
      setSession(res.data.populatedSession)
    })
    .catch(err=>{
      console.log(err)
    })
  }
  const handleBid=()=>{
    api.post('/auction/bid')
    .then(res=>{
      console.log(res.data)
    })
    .catch(err=>{
      console.log(err)
    })
  }
  useEffect(()=>{
    fetchAuction()

    socket.on('bid-placed',()=>{
      fetchAuction()
    })
    socket.on('next-player',()=>{
      fetchAuction()
    })
    socket.on('auction-ended',()=>{
      fetchAuction()
    })
    return ()=>{
      socket.off('bid-placed')
      socket.off('next-player')
      socket.off('auction-ended')
    }
  },[])
  const [timeLeft,setTimeLeft]=useState(0)
  useEffect(()=>{
    const interval=setInterval(()=>{
      if(session && session.timerEndsAt){
        const remaining=Math.max(0,Math.floor((new Date(session.timerEndsAt)-setTimeLeft(remaining))))
      }
      else{
        setTimeLeft(0)
      }
    },1000)
    return()=>{
      clearInterval(interval);
    }
  },[session])
  return (
    <div>
      <h1>Auction Board</h1>
      {session && session.status==='live' && session.currentPlayer && (
        <div>
          <h2>{session.currentPlayer.name}</h2>
          <p>{session.currentPlayer.role}-{session.currentPlayer.country}</p>
          <p>Current Price: {session.currentPrice}</p>
          <p>Time Left: {timeLeft}s</p>
          <p>Highest Bidder: {session.highestBidder ? session.highestBidder.teamName :'No bids yet'}</p>
          <button onClick={handleBid}>Place Bid</button>
        </div>
      )
    }
    {session && session.status==='ended' &&(
      <p>Auction has ended</p>
    )}

    {session && session.status==='not-started' &&(
      <p>Waiting for the auction to start</p>
    )}
    </div>
  )
}

export default AuctionBoard