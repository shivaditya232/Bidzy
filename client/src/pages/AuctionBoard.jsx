import { useState,useEffect } from "react"
import api from "../api/axios"
import socket from "../api/socket"
import Toast from "../components/Toast"
function AuctionBoard() {

  const [session,setSession]=useState(null);
  const [message,setMessage]=useState('');
  const [messageType,setMessageType]=useState('success');

  useEffect(()=>{
    if(!message) return;
    const timer=setTimeout(()=>{
      setMessage('')
    },3000)
    return ()=>{
      clearTimeout(timer)
    }
  },[message])

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
      setMessage('Bid placed successfully')
      setMessageType('success')
    })
    .catch(err=>{
      setMessage(err.response?.data?.message||'Something went wrong')
      setMessageType('error')
    })
  }
  useEffect(()=>{
    fetchAuction()

    socket.on('auction-started',()=>{
      fetchAuction()
    })
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
      socket.off('auction-started')
      socket.off('bid-placed')
      socket.off('next-player')
      socket.off('auction-ended')
    }
  },[])
  const [timeLeft,setTimeLeft]=useState(0)
  useEffect(()=>{
    const interval=setInterval(()=>{
      if(session && session.timerEndsAt){
        const remaining=Math.max(0,Math.floor((new Date(session.timerEndsAt)-new Date())/1000))
        setTimeLeft(remaining)
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">Auction Board</h1>
        <Toast message={message} type={messageType} />
        {session && session.status==='live' && session.currentPlayer && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-1">{session.currentPlayer.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{session.currentPlayer.role} - {session.currentPlayer.country}</p>

            <div className="flex flex-wrap justify-center gap-4 bg-gray-50 rounded-lg p-4 mb-4">
              {[
                {label:'Matches',value:session.currentPlayer.stats.matches},
                {label:'Runs',value:session.currentPlayer.stats.runs},
                {label:'Bat Avg',value:session.currentPlayer.stats.battingAverage},
                {label:'Strike Rate',value:session.currentPlayer.stats.strikeRate},
                {label:'Wickets',value:session.currentPlayer.stats.wickets},
                {label:'Economy',value:session.currentPlayer.stats.bowlingEconomy}
              ].filter(stat=>stat.value).map(stat=>{
                return (
                  <div key={stat.label}>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{stat.value}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center gap-8 mb-4">
              <div>
                <p className="text-xs text-gray-500">Current Price</p>
                <p className="text-2xl font-bold text-blue-600">{session.currentPrice}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Time Left</p>
                <p className={`text-2xl font-bold ${timeLeft<=5 ? 'text-red-600' : 'text-gray-800'}`}>{timeLeft}s</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Highest Bidder: <span className="font-medium text-gray-800">{session.highestBidder ? session.highestBidder.teamName : 'No bids yet'}</span>
            </p>

            <button
              onClick={handleBid}
              className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700"
            >
              Place Bid
            </button>
          </div>
        )}

        {session && session.status==='ended' && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
            Auction has ended
          </div>
        )}

        {session && session.status==='not_started' && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
            Waiting for the auction to start
          </div>
        )}
      </div>
    </div>
  )
}

export default AuctionBoard
