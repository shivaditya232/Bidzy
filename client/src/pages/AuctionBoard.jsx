import { useState,useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/axios"
import socket from "../api/socket"
import Toast from "../components/Toast"
import PlayerStatsModal from "../components/PlayerStatsModal"
import Navbar from "../components/Navbar"

const cardClass = "bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_24px_-16px_rgba(15,23,42,0.18)]"

function AuctionBoard() {

  const [session,setSession]=useState(null);
  const [message,setMessage]=useState('');
  const [messageType,setMessageType]=useState('success');
  const [resultPopup,setResultPopup]=useState(null);
  const [myProfile,setMyProfile]=useState(null);
  const [allPlayers,setAllPlayers]=useState([]);
  const [teamsList,setTeamsList]=useState([]);
  const [openPanel,setOpenPanel]=useState(null);
  const [selectedTeamId,setSelectedTeamId]=useState(null);
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const navigate=useNavigate()

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

  const fetchMyProfile=()=>{
    api.get('/users/me')
    .then(res=>{
      setMyProfile(res.data)
    })
    .catch(err=>{
      console.log(err)
    })
  }

  const fetchAllPlayers=()=>{
    api.get('/players')
    .then(res=>{
      setAllPlayers(res.data)
    })
    .catch(err=>{
      console.log(err)
    })
  }

  const fetchTeamsList=()=>{
    api.get('/users/public-teams')
    .then(res=>{
      setTeamsList(res.data)
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
    fetchMyProfile()
    fetchAllPlayers()
    fetchTeamsList()

    socket.on('auction-started',()=>{
      fetchAuction()
      fetchAllPlayers()
    })
    socket.on('bid-placed',(data)=>{
      setSession(prev => prev ? {
        ...prev,
        currentPrice: data.currentPrice,
        highestBidder: { teamName: data.highestBidderName },
        timerEndsAt: data.timerEndsAt
      } : prev)
    })
    socket.on('next-player',(data)=>{
      setResultPopup(data.finishedPlayer)
      setTimeout(()=>{
        setResultPopup(null)
        fetchAuction()
        fetchMyProfile()
        fetchAllPlayers()
        fetchTeamsList()
      },2000)
    })
    socket.on('auction-ended',(data)=>{
      setResultPopup(data.finishedPlayer)
      setTimeout(()=>{
        setResultPopup(null)
        fetchAuction()
        fetchMyProfile()
        fetchAllPlayers()
        fetchTeamsList()
      },2000)
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

  const myPlayers=myProfile ? allPlayers.filter(p=>p.status==='sold' && p.soldTo && p.soldTo._id===myProfile._id) : []
  const upcomingPlayers=allPlayers.filter(p=>p.status==='pending')
  const otherTeams=teamsList
    .filter(team=>!myProfile || team._id!==myProfile._id)
    .map(team=>({
      ...team,
      players:allPlayers.filter(p=>p.status==='sold' && p.soldTo && p.soldTo._id===team._id)
    }))
  const selectedTeam=otherTeams.find(team=>team._id===selectedTeamId) || null

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl" />

      <Navbar
        title="Auction Board"
        actions={[
          { label:'Past Auctions', onClick:()=>navigate('/history') },
          { label:'View Results', onClick:()=>navigate('/results') }
        ]}
      />

      <div className="relative flex justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Toast message={message} type={messageType} />

        {resultPopup && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-2xl p-8 text-center max-w-sm w-full">
              {resultPopup.status==='sold' ? (
                <>
                  <p className="text-sm font-bold tracking-wide text-green-600 mb-2">SOLD!</p>
                  <h2 className="font-display font-bold text-2xl text-slate-800 mb-1">{resultPopup.name}</h2>
                  <p className="text-slate-600 mb-4">
                    to <span className="font-semibold text-slate-800">{resultPopup.teamName}</span>
                  </p>
                  <p className="font-display text-3xl font-bold text-green-600">{resultPopup.soldPrice}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold tracking-wide text-red-600 mb-2">UNSOLD</p>
                  <h2 className="font-display font-bold text-2xl text-slate-800">{resultPopup.name}</h2>
                </>
              )}
            </div>
          </div>
        )}
        {session && session.status==='live' && session.currentPlayer && (
          <div className={`${cardClass} p-6 text-center`}>
            <h2 className="font-display font-bold text-xl text-slate-800 mb-1">{session.currentPlayer.name}</h2>
            <p className="text-sm text-slate-500 mb-4">{session.currentPlayer.role} - {session.currentPlayer.country}</p>

            <div className="flex flex-wrap justify-center gap-4 bg-slate-50 rounded-xl p-4 mb-4">
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
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <p className="text-sm font-semibold text-slate-800">{stat.value}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center gap-8 mb-4">
              <div>
                <p className="text-xs text-slate-500">Current Price</p>
                <p className="font-display text-2xl font-bold text-indigo-600">{session.currentPrice}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Time Left</p>
                <p className={`font-display text-2xl font-bold ${timeLeft<=5 ? 'text-red-600' : 'text-slate-800'}`}>{timeLeft}s</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Highest Bidder: <span className="font-medium text-slate-800">{session.highestBidder ? session.highestBidder.teamName : 'No bids yet'}</span>
            </p>

            <button
              onClick={handleBid}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
            >
              Place Bid
            </button>
          </div>
        )}

        {session && session.status==='ended' && (
          <div className={`${cardClass} p-6 text-center text-slate-600`}>
            Auction has ended
          </div>
        )}

        {session && session.status==='not_started' && (
          <div className={`${cardClass} p-6 text-center text-slate-600`}>
            Waiting for the auction to start
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-6">
          <button
            onClick={()=>setOpenPanel('myTeam')}
            className={`${cardClass} p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all`}
          >
            <p className="text-sm font-semibold text-slate-800">Your Team</p>
          </button>
          <button
            onClick={()=>setOpenPanel('upcoming')}
            className={`${cardClass} p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all`}
          >
            <p className="text-sm font-semibold text-slate-800">Upcoming</p>
          </button>
          <button
            onClick={()=>setOpenPanel('otherTeams')}
            className={`${cardClass} p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all`}
          >
            <p className="text-sm font-semibold text-slate-800">Other Teams</p>
          </button>
        </div>

        {openPanel==='myTeam' && myProfile && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-semibold text-lg text-slate-800">Your Team</h2>
                <button onClick={()=>setOpenPanel(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Purse Remaining: <span className="font-semibold text-slate-800">{myProfile.purseRemaining}</span>
              </p>

              {myPlayers.length===0 && (
                <p className="text-sm text-slate-500">No players won yet</p>
              )}

              {myPlayers.length>0 && (
                <>
                  <div className="grid grid-cols-3 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-200">
                    <span>Name</span>
                    <span>Role</span>
                    <span>Price</span>
                  </div>
                  {myPlayers.map(player=>(
                    <button key={player._id} onClick={()=>setSelectedPlayer(player)}
                      className="w-full grid grid-cols-3 px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 text-left transition-colors">
                      <span className="font-medium">{player.name}</span>
                      <span className="text-slate-500">{player.role}</span>
                      <span className="text-slate-500">{player.soldPrice}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {openPanel==='upcoming' && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg text-slate-800">Upcoming Players</h2>
                <button onClick={()=>setOpenPanel(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>

              {upcomingPlayers.length===0 && (
                <p className="text-sm text-slate-500">No upcoming players</p>
              )}

              {upcomingPlayers.length>0 && (
                <>
                  <div className="grid grid-cols-3 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-200">
                    <span>Name</span>
                    <span>Role</span>
                    <span>Base Price</span>
                  </div>
                  {upcomingPlayers.map(player=>(
                    <button key={player._id} onClick={()=>setSelectedPlayer(player)}
                      className="w-full grid grid-cols-3 px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 text-left transition-colors">
                      <span className="font-medium">{player.name}</span>
                      <span className="text-slate-500">{player.role}</span>
                      <span className="text-slate-500">{player.basePrice}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {openPanel==='otherTeams' && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg text-slate-800">Other Teams</h2>
                <button onClick={()=>setOpenPanel(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>

              {otherTeams.length===0 && (
                <p className="text-sm text-slate-500">No other teams yet</p>
              )}

              <div className="grid gap-3">
                {otherTeams.map(team=>(
                  <button key={team._id}
                    onClick={()=>{setSelectedTeamId(team._id);setOpenPanel(null)}}
                    className="bg-slate-50 rounded-xl p-4 text-left hover:bg-indigo-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{team.teamName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTeam && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-semibold text-lg text-slate-800">{selectedTeam.teamName}</h2>
                <button onClick={()=>setSelectedTeamId(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Purse Remaining: <span className="font-semibold text-slate-800">{selectedTeam.purseRemaining}</span>
              </p>

              {selectedTeam.players.length===0 && (
                <p className="text-sm text-slate-500">No players won yet</p>
              )}

              {selectedTeam.players.length>0 && (
                <>
                  <div className="grid grid-cols-3 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-200">
                    <span>Name</span>
                    <span>Role</span>
                    <span>Price</span>
                  </div>
                  {selectedTeam.players.map(player=>(
                    <button key={player._id} onClick={()=>setSelectedPlayer(player)}
                      className="w-full grid grid-cols-3 px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 text-left transition-colors">
                      <span className="font-medium">{player.name}</span>
                      <span className="text-slate-500">{player.role}</span>
                      <span className="text-slate-500">{player.soldPrice}</span>
                    </button>
                  ))}
                </>
              )}

              <button onClick={()=>{setSelectedTeamId(null);setOpenPanel('otherTeams')}} className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Back to Other Teams
              </button>
            </div>
          </div>
        )}

        <PlayerStatsModal player={selectedPlayer} onClose={()=>setSelectedPlayer(null)} />
      </div>
      </div>
    </div>
  )
}

export default AuctionBoard
