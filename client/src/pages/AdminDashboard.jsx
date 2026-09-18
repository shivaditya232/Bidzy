import { useState,useEffect } from "react"
import api from "../api/axios"

function AdminDashboard() {
    const [players,setPlayers]=useState([])
    useEffect(()=>{
        api.get('/players')
        .then(res=>{
            setPlayers(res.data)
        })
        .catch(err=>{
            console.log(err)
        })
    },[])

    const [sets,setSets]=useState([])

    useEffect(()=>{
        api.get('/sets')
        .then(res=>{
            setSets(res.data)
        })
        .catch(err=>{
            console.log(err)
        })
    },[])

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
            console.log('Player added:',res.data)
            setPlayers([...players,res.data.player])
            setName('')
            setCountry('')
            setBasePrice('')
            setStats({matches:'',runs:'',battingAverage:'',strikeRate:'',wickets:'',bowlingEconomy:''})
        })
        .catch(err=>{
            console.log(err)
        })
    }
    const handleStartAuction=()=>{
        api.post('/auction/start')
        .then(res=>{
            console.log(res.data)
        })
        .catch(err=>{
            console.log(err)
        })
    }

  return (
    <div>
      <h1>Admin dashboard</h1>
      <button onClick={handleStartAuction}>Start Auction</button>
      <div>
        <h2>Add Player</h2>
        <label>Name</label><br></br>
        <input type="text" value={name} onChange={(e)=>{setName(e.target.value)}}></input><br></br>
        <label>Role</label><br></br>
        <select value={role} onChange={(e)=>{setRole(e.target.value)}}>
            <option value="Batsman">Batsman</option>
            <option value="Bowler">Bowler</option>
            <option value="Allrounder">Allrounder</option>
            <option value="Wicketkeeper">Wicketkeeper</option>
        </select><br></br>
        <label>Country</label><br/>
    <input type="text" value={country} onChange={(e)=>{setCountry(e.target.value)}}/><br/>

    <label>Base Price</label><br/>
    <input type="number" value={basePrice} onChange={(e)=>{setBasePrice(e.target.value)}}/><br/>

    <label>Set</label><br/>
    <select value={set} onChange={(e)=>{setSet(e.target.value)}}>
        <option value="">Select a set</option>
        {sets.map(s=>{
            return <option key={s._id} value={s._id}>{s.name}</option>
        })}
    </select><br/>

    <label>Matches</label><br/>
    <input type="number" value={stats.matches} onChange={(e)=>{handleStatsChange('matches',e.target.value)}}/><br/>

    <label>Runs</label><br/>
    <input type="number" value={stats.runs} onChange={(e)=>{handleStatsChange('runs',e.target.value)}}/><br/>

    <label>Batting Average</label><br/>
    <input type="number" value={stats.battingAverage} onChange={(e)=>{handleStatsChange('battingAverage',e.target.value)}}/><br/>

    <label>Strike Rate</label><br/>
    <input type="number" value={stats.strikeRate} onChange={(e)=>{handleStatsChange('strikeRate',e.target.value)}}/><br/>

    <label>Wickets</label><br/>
    <input type="number" value={stats.wickets} onChange={(e)=>{handleStatsChange('wickets',e.target.value)}}/><br/>

    <label>Bowling Economy</label><br/>
    <input type="number" value={stats.bowlingEconomy} onChange={(e)=>{handleStatsChange('bowlingEconomy',e.target.value)}}/><br/>

    <button onClick={handleAddPlayer}>Add Player</button>
      </div>
      {players.map(player=>{
        return (
            <div key={player._id}>
                <p>{player.name}-{player.role}-{player.status}</p>
            </div>
        )
      })}
    </div>
  )
}

export default AdminDashboard