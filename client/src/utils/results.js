// Pure helpers for the results and past-auction pages, kept here so they can be tested without a browser.
import { idOf } from './board.js'

// one team sheet per team: its buys (most expensive first), spent and left
// players: room players (soldTo is a membership id or {_id}), teams: from /members
export const liveSheets=(teams=[],players=[])=>teams.map(team=>{
    const squad=players
        .filter(p=>p.status==='sold'&&idOf(p.soldTo)===String(team._id))
        .sort((a,b)=>(b.soldPrice||0)-(a.soldPrice||0))
    const spent=squad.reduce((sum,p)=>sum+(p.soldPrice||0),0)
    return {team,squad,spent,left:team.purseRemaining??(team.purse-spent)}
})

export const totals=(players=[])=>{
    const sold=players.filter(p=>p.status==='sold')
    return {
        sold:sold.length,
        unsold:players.filter(p=>p.status==='unsold').length,
        spent:sold.reduce((sum,p)=>sum+(p.soldPrice||0),0)
    }
}

// a saved round only has plain rows ({playerName, status, soldPrice, teamName...}), grouped here by team name
export const roundSheets=(results=[])=>{
    const byTeam=new Map()
    for(const row of results){
        if(row.status!=='sold'||!row.teamName) continue
        if(!byTeam.has(row.teamName)) byTeam.set(row.teamName,[])
        byTeam.get(row.teamName).push({_id:row._id,name:row.playerName,role:row.role,country:row.country,image:row.image,soldPrice:row.soldPrice})
    }
    return [...byTeam.entries()].map(([teamName,squad])=>{
        squad.sort((a,b)=>(b.soldPrice||0)-(a.soldPrice||0))
        return {team:{_id:teamName,teamName},squad,spent:squad.reduce((sum,p)=>sum+(p.soldPrice||0),0)}
    }).sort((a,b)=>b.spent-a.spent)
}

export const roundTotals=(results=[])=>{
    const sold=results.filter(r=>r.status==='sold')
    const top=sold.reduce((best,r)=>(!best||(r.soldPrice||0)>(best.soldPrice||0)) ? r : best,null)
    return {
        sold:sold.length,
        unsold:results.filter(r=>r.status==='unsold').length,
        spent:sold.reduce((sum,r)=>sum+(r.soldPrice||0),0),
        top
    }
}

// a saved round only knows team names: find the team's colours by name (current teams first, then the franchise list)
export const teamByName=(teamName,teams=[],franchises=[])=>{
    const current=teams.find(t=>t.teamName===teamName)
    if(current) return current
    const franchise=franchises.find(f=>f.name===teamName)
    return franchise ? {teamName,franchise:franchise.code} : {teamName}
}

// rounds come newest first; round 1 is the oldest
export const numberRounds=(rounds=[])=>rounds.map((round,i)=>({...round,number:rounds.length-i}))

// an XI from /lineups (players filled in) as 11 rows: {position, player, backups}
export const xiRows=(lineup=[])=>Array.from({length:11},(_,i)=>({
    position:i+1,
    player:lineup[i]?.player||null,
    backups:(lineup[i]?.backups||[]).filter(Boolean)
}))

export const formatRoundDate=(date)=>new Date(date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
