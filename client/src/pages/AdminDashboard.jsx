import { useState,useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/axios"
import socket from "../api/socket"
import Toast from "../components/Toast"
import ConfirmModal from "../components/ConfirmModal"
import Navbar from "../components/Navbar"

const cardClass = "bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_24px_-16px_rgba(15,23,42,0.18)] p-6"
const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
const pillEdit = "text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
const pillDelete = "text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
const pillGhost = "text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-full transition-colors"

function SectionTitle({ children }) {
    return (
        <h2 className="font-display font-semibold text-lg text-slate-800 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            {children}
        </h2>
    )
}

function AdminDashboard() {
    const [players,setPlayers]=useState([])
    const [message,setMessage]=useState('')
    const [messageType,setMessageType]=useState('success')
    const navigate=useNavigate()
    const [confirmAction,setConfirmAction]=useState(null)

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

    const [teams,setTeams]=useState([])
    const [editingPurse,setEditingPurse]=useState({})

    const fetchTeams=()=>{
        api.get('/users/teams')
        .then(res=>{
            setTeams(res.data)
        })
        .catch(err=>{
            console.log(err)
        })
    }

    useEffect(()=>{
        fetchTeams()
    },[])

    const handlePurseChange=(id,value)=>{
        setEditingPurse({...editingPurse,[id]:value})
    }

    const handleSavePurse=(id)=>{
        api.patch(`/users/${id}`,{purseRemaining:editingPurse[id]})
        .then(res=>{
            setMessage('Team purse updated successfully')
            setMessageType('success')
            fetchTeams()
        })
        .catch(err=>{
            setMessage(err.response?.data?.message||'Something went wrong')
            setMessageType('error')
        })
    }

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
    const [showCreateSetForm,setShowCreateSetForm]=useState(false)
    const [editingSetId,setEditingSetId]=useState(null)
    const [editSetName,setEditSetName]=useState('')

    const handleCreateSet=()=>{
        api.post('/sets',{name:newSetName})
        .then(res=>{
            setMessage(res.data.message)
            setMessageType('success')
            setNewSetName('')
            setShowCreateSetForm(false)
            fetchSets()
        })
        .catch(err=>{
            setMessage(err.response?.data?.message||'Something went wrong')
            setMessageType('error')
        })
    }

    const handleUpdateSet=(id)=>{
        api.patch(`/sets/${id}`,{name:editSetName})
        .then(res=>{
            setMessage(res.data.message)
            setMessageType('success')
            setEditingSetId(null)
            fetchSets()
        })
        .catch(err=>{
            setMessage(err.response?.data?.message||'Something went wrong')
            setMessageType('error')
        })
    }

    const handleDeleteSet=(id)=>{
        setConfirmAction({
            message:'Delete this set?',
            onConfirm:()=>{
                api.delete(`/sets/${id}`)
                .then(res=>{
                    setMessage(res.data.message)
                    setMessageType('success')
                    fetchSets()
                })
                .catch(err=>{
                    setMessage(err.response?.data?.message||'Something went wrong')
                    setMessageType('error')
                })
                setConfirmAction(null)
            }
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

    const [editingPlayer,setEditingPlayer]=useState(null)
    const [editForm,setEditForm]=useState({
        name:'',
        role:'Batsman',
        country:'',
        basePrice:'',
        set:'',
        stats:{
            matches:'',
            runs:'',
            battingAverage:'',
            strikeRate:'',
            wickets:'',
            bowlingEconomy:''
        }
    })

    const handleEditPlayerClick=(player)=>{
        setEditingPlayer(player)
        setEditForm({
            name:player.name,
            role:player.role,
            country:player.country||'',
            basePrice:player.basePrice,
            set:player.set._id,
            stats:{
                matches:player.stats?.matches||'',
                runs:player.stats?.runs||'',
                battingAverage:player.stats?.battingAverage||'',
                strikeRate:player.stats?.strikeRate||'',
                wickets:player.stats?.wickets||'',
                bowlingEconomy:player.stats?.bowlingEconomy||''
            }
        })
    }

    const handleEditFormChange=(field,value)=>{
        setEditForm({...editForm,[field]:value})
    }

    const handleEditStatsChange=(field,value)=>{
        setEditForm({...editForm,stats:{...editForm.stats,[field]:value}})
    }

    const handleUpdatePlayer=()=>{
        api.patch(`/players/${editingPlayer._id}`,editForm)
        .then(res=>{
            setMessage('Player updated successfully')
            setMessageType('success')
            setEditingPlayer(null)
            fetchPlayers()
        })
        .catch(err=>{
            setMessage(err.response?.data?.message||'Something went wrong')
            setMessageType('error')
        })
    }

    const handleCloseEditModal=()=>{
        setEditingPlayer(null)
    }

    const handleDeletePlayer=(id)=>{
        setConfirmAction({
            message:'Delete this player?',
            onConfirm:()=>{
                api.delete(`/players/${id}`)
                .then(res=>{
                    setMessage(res.data.message)
                    setMessageType('success')
                    fetchPlayers()
                })
                .catch(err=>{
                    setMessage(err.response?.data?.message||'Something went wrong')
                    setMessageType('error')
                })
                setConfirmAction(null)
            }
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

    const handleResetAuction=()=>{
        setConfirmAction({
            message:"Save today's results and reset all players and purses for a new auction?",
            onConfirm:()=>{
                api.post('/auction/reset')
                .then(res=>{
                    setMessage(res.data.message)
                    setMessageType('success')
                    fetchPlayers()
                    fetchTeams()
                })
                .catch(err=>{
                    setMessage(err.response?.data?.message||'Something went wrong')
                    setMessageType('error')
                })
                setConfirmAction(null)
            }
        })
    }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-200/20 blur-3xl" />

      <Navbar
        title="Admin"
        actions={[
          { label:'Past Auctions', onClick:()=>navigate('/history') },
          { label:'View Results', onClick:()=>navigate('/results') }
        ]}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <Toast message={message} type={messageType} />

        <ConfirmModal
          message={confirmAction?.message}
          onConfirm={confirmAction?.onConfirm}
          onCancel={()=>setConfirmAction(null)}
        />

        {editingPlayer && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg text-slate-800">Edit Player</h2>
                <button onClick={handleCloseEditModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input type="text" value={editForm.name} onChange={(e)=>{handleEditFormChange('name',e.target.value)}}
                    className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select value={editForm.role} onChange={(e)=>{handleEditFormChange('role',e.target.value)}}
                    className={`${inputClass} bg-white`}>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="Allrounder">Allrounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input type="text" value={editForm.country} onChange={(e)=>{handleEditFormChange('country',e.target.value)}}
                    className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Base Price</label>
                  <input type="number" value={editForm.basePrice} onChange={(e)=>{handleEditFormChange('basePrice',e.target.value)}}
                    className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Set</label>
                  <select value={editForm.set} onChange={(e)=>{handleEditFormChange('set',e.target.value)}}
                    className={`${inputClass} bg-white`}>
                    <option value="">Select a set</option>
                    {sets.map(s=>{
                        return <option key={s._id} value={s._id}>{s.name}</option>
                    })}
                  </select>
                </div>
              </div>

              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-6 mb-3">Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                {(editForm.role==='Batsman' || editForm.role==='Wicketkeeper' || editForm.role==='Allrounder') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Matches</label>
                      <input type="number" value={editForm.stats.matches} onChange={(e)=>{handleEditStatsChange('matches',e.target.value)}}
                        className={inputClass} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Runs</label>
                      <input type="number" value={editForm.stats.runs} onChange={(e)=>{handleEditStatsChange('runs',e.target.value)}}
                        className={inputClass} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Batting Average</label>
                      <input type="number" value={editForm.stats.battingAverage} onChange={(e)=>{handleEditStatsChange('battingAverage',e.target.value)}}
                        className={inputClass} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Strike Rate</label>
                      <input type="number" value={editForm.stats.strikeRate} onChange={(e)=>{handleEditStatsChange('strikeRate',e.target.value)}}
                        className={inputClass} />
                    </div>
                  </>
                )}

                {editForm.role==='Bowler' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Matches</label>
                    <input type="number" value={editForm.stats.matches} onChange={(e)=>{handleEditStatsChange('matches',e.target.value)}}
                      className={inputClass} />
                  </div>
                )}

                {(editForm.role==='Bowler' || editForm.role==='Allrounder') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Wickets</label>
                      <input type="number" value={editForm.stats.wickets} onChange={(e)=>{handleEditStatsChange('wickets',e.target.value)}}
                        className={inputClass} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bowling Economy</label>
                      <input type="number" value={editForm.stats.bowlingEconomy} onChange={(e)=>{handleEditStatsChange('bowlingEconomy',e.target.value)}}
                        className={inputClass} />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleUpdatePlayer}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                >
                  Update Player
                </button>
                <button
                  onClick={handleCloseEditModal}
                  className="bg-slate-100 text-slate-700 px-5 py-2 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mb-8">
          <button
            onClick={handleResetAuction}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-red-500/25 hover:bg-red-700 hover:-translate-y-0.5 transition-all"
          >
            Start New Auction
          </button>
          <button
            onClick={handleStartAuction}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
          >
            Start Auction
          </button>
        </div>

        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Sets</SectionTitle>
            <button
              onClick={()=>setShowCreateSetForm(!showCreateSetForm)}
              className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full text-xl leading-none shadow-md shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all"
            >
              +
            </button>
          </div>

          {showCreateSetForm && (
            <div className="flex gap-3 mb-4">
              <input type="text" value={newSetName} onChange={(e)=>{setNewSetName(e.target.value)}}
                placeholder="e.g. Marquee, Batsman Set 1"
                className={inputClass} />
              <button
                onClick={handleCreateSet}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition-colors shrink-0"
              >
                Create
              </button>
            </div>
          )}

          {sets.map(s=>(
            <div key={s._id} className="flex items-center justify-between px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0">
              {editingSetId===s._id ? (
                <>
                  <input type="text" value={editSetName} onChange={(e)=>{setEditSetName(e.target.value)}}
                    className={`${inputClass} py-1.5 mr-3`} />
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>handleUpdateSet(s._id)} className={pillEdit}>Save</button>
                    <button onClick={()=>setEditingSetId(null)} className={pillGhost}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-medium">{s.name}</span>
                  <div className="flex gap-2">
                    <button onClick={()=>{setEditingSetId(s._id);setEditSetName(s.name)}} className={pillEdit}>Edit</button>
                    <button onClick={()=>handleDeleteSet(s._id)} className={pillDelete}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className={`${cardClass} mb-6`}>
          <SectionTitle>Manage Teams</SectionTitle>
          <div className="grid grid-cols-4 px-2 py-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-200">
            <span>Team</span>
            <span>Email</span>
            <span>Purse Remaining</span>
            <span></span>
          </div>
          {teams.map(team=>{
            const currentValue=editingPurse[team._id]!==undefined ? editingPurse[team._id] : team.purseRemaining
            return (
                <div key={team._id} className="grid grid-cols-4 items-center px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors rounded-lg">
                    <span className="font-medium">{team.teamName}</span>
                    <span className="text-slate-500">{team.email}</span>
                    <input type="number" value={currentValue} onChange={(e)=>{handlePurseChange(team._id,e.target.value)}}
                        className={`${inputClass} w-28 py-1.5`} />
                    <button onClick={()=>handleSavePurse(team._id)} className={`${pillEdit} justify-self-start`}>
                        Save
                    </button>
                </div>
            )
          })}
        </div>

        <div className={`${cardClass} mb-6`}>
          <SectionTitle>Add Player</SectionTitle>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" value={name} onChange={(e)=>{setName(e.target.value)}}
                className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={role} onChange={(e)=>{setRole(e.target.value)}}
                className={`${inputClass} bg-white`}>
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="Allrounder">Allrounder</option>
                <option value="Wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <input type="text" value={country} onChange={(e)=>{setCountry(e.target.value)}}
                className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base Price</label>
              <input type="number" value={basePrice} onChange={(e)=>{setBasePrice(e.target.value)}}
                className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Set</label>
              <select value={set} onChange={(e)=>{setSet(e.target.value)}}
                className={`${inputClass} bg-white`}>
                <option value="">Select a set</option>
                {sets.map(s=>{
                    return <option key={s._id} value={s._id}>{s.name}</option>
                })}
              </select>
            </div>
          </div>

          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-6 mb-3">Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            {(role==='Batsman' || role==='Wicketkeeper' || role==='Allrounder') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matches</label>
                  <input type="number" value={stats.matches} onChange={(e)=>{handleStatsChange('matches',e.target.value)}}
                    className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Runs</label>
                  <input type="number" value={stats.runs} onChange={(e)=>{handleStatsChange('runs',e.target.value)}}
                    className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Batting Average</label>
                  <input type="number" value={stats.battingAverage} onChange={(e)=>{handleStatsChange('battingAverage',e.target.value)}}
                    className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Strike Rate</label>
                  <input type="number" value={stats.strikeRate} onChange={(e)=>{handleStatsChange('strikeRate',e.target.value)}}
                    className={inputClass} />
                </div>
              </>
            )}

            {role==='Bowler' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Matches</label>
                <input type="number" value={stats.matches} onChange={(e)=>{handleStatsChange('matches',e.target.value)}}
                  className={inputClass} />
              </div>
            )}

            {(role==='Bowler' || role==='Allrounder') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Wickets</label>
                  <input type="number" value={stats.wickets} onChange={(e)=>{handleStatsChange('wickets',e.target.value)}}
                    className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bowling Economy</label>
                  <input type="number" value={stats.bowlingEconomy} onChange={(e)=>{handleStatsChange('bowlingEconomy',e.target.value)}}
                    className={inputClass} />
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleAddPlayer}
            className="mt-6 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
          >
            Add Player
          </button>
        </div>

        <div className={cardClass}>
          <SectionTitle>Players</SectionTitle>
          <div className="grid grid-cols-4 px-2 py-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-200">
            <span>Name</span>
            <span>Role</span>
            <span>Status</span>
            <span></span>
          </div>
          {players.map(player=>{
            return (
                <div key={player._id} className="grid grid-cols-4 items-center px-2 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors rounded-lg">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-slate-500">{player.role}</span>
                    <span className="text-slate-500 capitalize">{player.status}</span>
                    <div className="flex gap-2">
                        <button onClick={()=>handleEditPlayerClick(player)} className={pillEdit}>Edit</button>
                        {player.status==='pending' && (
                            <button onClick={()=>handleDeletePlayer(player._id)} className={pillDelete}>Delete</button>
                        )}
                    </div>
                </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

export default AdminDashboard
