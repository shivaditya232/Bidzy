// Pure helpers for the auction board, kept here so they can be tested without a browser.
import { HOUSE_GLOW, deriveGlow } from './color.js'

// the next bid: current price + the room's step for that price band (same rule as the server)
//   increments: [{upTo:100,step:5},...,{upTo:null,step:25}]
export const bidStep=(price,increments=[])=>{
    for(const band of increments){
        if(band.upTo===null||band.upTo===undefined||price<band.upTo) return band.step
    }
    return increments.length ? increments[increments.length-1].step : 0
}
export const nextBid=(price,increments)=>price+bidStep(price,increments)

// the four numbers that matter for this kind of player
export const statsFor=(player)=>{
    const s=player?.stats||{}
    const n=(v)=>v??0
    if(player?.role==='Bowler'){
        return [['Matches',n(s.matches)],['Wickets',n(s.wickets)],['Economy',n(s.bowlingEconomy)],['Runs',n(s.runs)]]
    }
    if(player?.role==='Allrounder'){
        return [['Matches',n(s.matches)],['Runs',n(s.runs)],['Wickets',n(s.wickets)],['Strike rate',n(s.strikeRate)]]
    }
    return [['Matches',n(s.matches)],['Runs',n(s.runs)],['Average',n(s.battingAverage)],['Strike rate',n(s.strikeRate)]]
}

export const isOverseas=(player,homeCountry='India')=>Boolean(player?.country)&&player.country.trim().toLowerCase()!==String(homeCountry).trim().toLowerCase()

// "MS Dhoni" -> "MD" (shown when there's no photo)
export const initials=(name)=>String(name||'').split(/\s+/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?'

// an id from either a plain id or a populated document
export const idOf=(value)=>value&&typeof value==='object' ? String(value._id??'') : (value ? String(value) : '')

// your XI as 11 rows: {position, player, backups} with players looked up by id (null = open slot)
export const xiSlots=(lineup=[],playersById={})=>Array.from({length:11},(_,i)=>{
    const spot=lineup[i]||{}
    return {
        position:i+1,
        player:playersById[idOf(spot.player)]||null,
        backups:(spot.backups||[]).map(b=>playersById[idOf(b)]).filter(Boolean)
    }
})

// a player you just won goes into the first open XI slot. returns the new lineup, or null if the XI is full / he's already in.
export const placeInFirstOpen=(lineup=[],playerId)=>{
    const full=Array.from({length:11},(_,i)=>({player:idOf(lineup[i]?.player)||null,backups:(lineup[i]?.backups||[]).map(idOf)}))
    if(full.some(spot=>spot.player===String(playerId)||spot.backups.includes(String(playerId)))) return null
    const open=full.findIndex(spot=>!spot.player)
    if(open===-1) return null
    full[open]={...full[open],player:String(playerId)}
    return full
}

// players still to come, in auction order (the server already sorts by set, then order)
export const upcomingPlayers=(players=[])=>players.filter(p=>p.status==='pending')

// players each team has bought: {membershipId: [players]}
export const boughtByTeam=(players=[])=>{
    const out={}
    for(const p of players){
        if(p.status!=='sold') continue
        const team=idOf(p.soldTo)
        if(!team) continue
        ;(out[team]||=[]).push(p)
    }
    return out
}

// a team's colours: its franchise, or a glow made from its own colour in a custom room
export const teamGlow=(team,franchisesByCode={})=>{
    if(!team) return HOUSE_GLOW
    if(team.franchise&&franchisesByCode[team.franchise]) return franchisesByCode[team.franchise].glow
    if(team.color) return deriveGlow(team.color)
    return HOUSE_GLOW
}

// the short city/club name for "Chennai with ₹2 Cr"
export const shortName=(team)=>{
    const name=team?.teamName||''
    const words=name.split(' ')
    // "Royal Challengers Bengaluru" -> "Bengaluru", "Mumbai Indians" -> "Mumbai", custom names stay as they are
    if(team?.franchise==='RCB') return words[words.length-1]
    if(team?.franchise) return words[0]
    return name
}
