import { useState,useEffect } from "react"
import api from "../api/axios"
import socket from "../api/socket"
import Toast from "../components/Toast"

function AdminDashboard() {
    const [players,setPlayers]=useState([])
    const [message,setMessage]=useState('')
    const [messageType,setMessageType]=useState('success')

    useEffect(()=>{
        if(!message) return;
        const timer=setTimeout(()=>{
            setMessage('')
        },3000)
        return ()=>{
            clearTimeout(timer)
        }
    },[message])

    const fetchPlayers=()=>{
        api.get('/players')
        .then(res=>{
            setPlayers(res.data)
        })
        .catch(err=>{
            console.log(err)
        })
    }

    useEffect(()=>{
        fetchPlayers()

        socket.on('auction-started',()=>{
            fetchPlayers()
        })
        socket.on('next-player',()=>{
            fetchPlayers()
        })
        socket.on('auction-ended',()=>{
            fetchPlayers()
        })

        return ()=>{
            socket.off('auction-started')
            socket.off('next-player')
            socket.off('auction-ended')
        }
    },[])

    const [sets,setSets]=useState([])

    const fetchSets=()=>{
        api.get('/sets')
        .then(res=>{
            setSets(res.data)
        })
        .catch(err=>{
            console.log(err)
        })
    }

    useEffect(()=>{
        fetchSets()
    },[])

    const [newSetName,setNewSetName]=useState('')

    const handleCreateSet=()=>{
        api.post('/sets',{name:newSetName})
        .then(res=>{
            setMessage(res.data.message)
            setMessageType('success')
            setNewSetName('')
            fetchSets()
        })
        .catch(err=>{
            setMessage(err.response?.data?.message||'Something went wrong')
            setMessageType('error')
        })
    }

    const [name,setName]=useState('')
    const [role,setRole]=useState('Batsman')
    const [country,setCountry]=useState('')
    const [basePrice,setBasePrice]=useState('')
    const [set,setSet]=useState('')
    const [stats,setStats]=useState({
        matches:'',
        runs:'',
        battingAverage:'',
        strikeRate:'',
        wickets:'',
        bowlingEconomy:''
    })
    const handleStatsChange=(field,value)=>{
        setStats({...stats,[field]:value})
    }
    const handleAddPlayer=()=>{
        api.post('/players',{name,role,country,basePrice,set,stats})
        .then(res=>{
            setPlayers([...players,res.data.player])
            setMessage('Player added successfully')
            setMessageType('success')
            setName('')
            setCountry('')
            setBasePrice('')
            setStats({matches:'',runs:'',battingAverage:'',strikeRate:'',wickets:'',bowlingEconomy:''})
        })
        .catch(err=>{
            setMessage(err.response?.data?.message||'Something went wrong')
            setMessageType('error')
        })
    }
    const handleStartAuction=()=>{
        api.post('/auction/start')
        .then(res=>{
            setMessage(res.data.message)
            setMessageType('success')
        })
        .catch(err=>{
            setMessage(err.response?.data?.message||'Something went wrong')
            setMessageType('error')
        })
    }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Admin dashboard</h1>
        </div>

        <Toast message={message} type={messageType} />

        <div className="flex justify-end mb-8">
          <button
            onClick={handleStartAuction}
            className="bg-green-600 text-white px-5 py-2 rounded font-medium hover:bg-green-700"
          >
            Start Auction
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Set</h2>
          <div className="flex gap-3">
            <input type="text" value={newSetName} onChange={(e)=>{setNewSetName(e.target.value)}}
              placeholder="e.g. Marquee, Batsman Set 1"
              className="flex-1 border border-gray-300 rounded px-3 py-2" />
            <button
              onClick={handleCreateSet}
              className="bg-gray-800 text-white px-5 py-2 rounded font-medium hover:bg-gray-900"
            >
              Create Set
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Player</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={name} onChange={(e)=>{setName(e.target.value)}}
                className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={role} onChange={(e)=>{setRole(e.target.value)}}
                className="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="Allrounder">Allrounder</option>
                <option value="Wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" value={country} onChange={(e)=>{setCountry(e.target.value)}}
                className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
              <input type="number" value={basePrice} onChange={(e)=>{setBasePrice(e.target.value)}}
                className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Set</label>
              <select value={set} onChange={(e)=>{setSet(e.target.value)}}
                className="w-full border border-gray-300 rounded px-3 py-2 bg-white">
                <option value="">Select a set</option>
                {sets.map(s=>{
                    return <option key={s._id} value={s._id}>{s.name}</option>
                })}
              </select>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-600 mt-6 mb-3">Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            {(role==='Batsman' || role==='Wicketkeeper' || role==='Allrounder') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matches</label>
                  <input type="number" value={stats.matches} onChange={(e)=>{handleStatsChange('matches',e.target.value)}}
                    className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Runs</label>
                  <input type="number" value={stats.runs} onChange={(e)=>{handleStatsChange('runs',e.target.value)}}
                    className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batting Average</label>
                  <input type="number" value={stats.battingAverage} onChange={(e)=>{handleStatsChange('battingAverage',e.target.value)}}
                    className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strike Rate</label>
                  <input type="number" value={stats.strikeRate} onChange={(e)=>{handleStatsChange('strikeRate',e.target.value)}}
                    className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
              </>
            )}

            {role==='Bowler' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matches</label>
                <input type="number" value={stats.matches} onChange={(e)=>{handleStatsChange('matches',e.target.value)}}
                  className="w-full border border-gray-300 rounded px-3 py-2" />
              </div>
            )}

            {(role==='Bowler' || role==='Allrounder') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wickets</label>
                  <input type="number" value={stats.wickets} onChange={(e)=>{handleStatsChange('wickets',e.target.value)}}
                    className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bowling Economy</label>
                  <input type="number" value={stats.bowlingEconomy} onChange={(e)=>{handleStatsChange('bowlingEconomy',e.target.value)}}
                    className="w-full border border-gray-300 rounded px-3 py-2" />
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleAddPlayer}
            className="mt-6 bg-blue-600 text-white px-5 py-2 rounded font-medium hover:bg-blue-700"
          >
            Add Player
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-3 px-6 py-3 text-xs font-medium text-gray-500 border-b border-gray-200">
            <span>Name</span>
            <span>Role</span>
            <span>Status</span>
          </div>
          {players.map(player=>{
            return (
                <div key={player._id} className="grid grid-cols-3 px-6 py-3 text-sm text-gray-800 border-b border-gray-100 last:border-b-0">
                    <span>{player.name}</span>
                    <span className="text-gray-500">{player.role}</span>
                    <span className="text-gray-500">{player.status}</span>
                </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

export default AdminDashboard
