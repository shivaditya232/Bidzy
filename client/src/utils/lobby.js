import { HOUSE_GLOW, deriveGlow } from './color.js'

// Small pure helpers for the lobby, kept here so they can be tested without a browser.

export const CODE_LENGTH=6

// live rooms first, then the ones still in the lobby, finished ones last.
// inside each group the server's order (newest first) is kept.
const STATUS_ORDER={live:0,lobby:1,ended:2}
export const sortRooms=(rooms)=>[...rooms].sort((a,b)=>(STATUS_ORDER[a.room.status]??3)-(STATUS_ORDER[b.room.status]??3))

// whatever someone types or pastes -> up to 6 capital letters/digits ("hb4-c9x " -> "HB4C9X")
export const cleanCode=(text)=>String(text||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,CODE_LENGTH)

// "Morning" / "Afternoon" / "Evening" for the greeting at the top
export const greeting=(date=new Date())=>{
    const hour=date.getHours()
    if(hour>=5&&hour<12) return 'Morning'
    if(hour>=12&&hour<17) return 'Afternoon'
    return 'Evening'
}

// the line under the greeting, worked out from your rooms
export const lobbyLine=(rooms)=>{
    if(rooms.length===0){
        return "You're not in any room yet. Start your own auction, or join a friend's with their code."
    }
    const live=rooms.filter(r=>r.room.status==='live').length
    const waiting=rooms.filter(r=>r.room.status==='lobby').length
    const parts=[]
    if(live>0){
        parts.push(live===1 ? 'One auction is live right now.' : `${live} auctions are live right now.`)
    }
    if(waiting>0){
        const more=live>0 ? ' more' : ''
        parts.push(waiting===1 ? `One${more} room is waiting in the lobby.` : `${waiting}${more} rooms are waiting in the lobby.`)
    }
    if(parts.length===0){
        return 'Your auctions have all finished. Start a new one?'
    }
    return parts.join(' ')
}

// who you are in a room, as colours: the house floodlight when you host,
// your franchise's colours in an IPL room, or a glow made from your own colour in a custom room
export const roomGlow=(entry,franchisesByCode={})=>{
    if(entry.myRole==='host') return HOUSE_GLOW
    if(entry.franchise&&franchisesByCode[entry.franchise]) return franchisesByCode[entry.franchise].glow
    if(entry.color) return deriveGlow(entry.color)
    return HOUSE_GLOW
}

// short label on the card: the franchise code, or the first letters of a custom team name
export const teamTag=(entry)=>{
    if(entry.myRole==='host') return 'HOST'
    if(entry.franchise) return entry.franchise
    const letters=String(entry.teamName||'').split(/\s+/).filter(Boolean).map(word=>word[0]).join('')
    return letters.slice(0,3).toUpperCase()||'?'
}

// the create-room form. the purse is typed in crores, the server stores lakhs (1 Cr = 100 L).
// default squad rules: 19 players at ₹20 L each at least -> a purse of ₹3.80 Cr is the minimum that works.
export const MIN_PURSE_LAKHS=19*20

export const validateCreateRoom=({name,type,purseCr,timerSeconds,maxTeams})=>{
    const errors={}
    const trimmed=String(name||'').trim()
    if(!trimmed) errors.name='Give the room a name'
    else if(trimmed.length>60) errors.name='Keep it under 60 characters'

    const purse=Number(purseCr)
    if(String(purseCr).trim()===''||!Number.isFinite(purse)) errors.purse='Enter the purse in crores'
    else if(Math.round(purse*100)<MIN_PURSE_LAKHS) errors.purse='At least ₹3.80 Cr, so every team can buy 19 players'
    else if(purse>100000) errors.purse='That purse is too big'

    const timer=Number(timerSeconds)
    if(!Number.isInteger(timer)||timer<5||timer>120) errors.timer='5 to 120 seconds'

    const teams=Number(maxTeams)
    const most=type==='ipl' ? 10 : 20
    if(!Number.isInteger(teams)||teams<2||teams>most) errors.maxTeams=`2 to ${most} teams`
    return errors
}

export const createRoomPayload=({name,type,purseCr,timerSeconds,maxTeams})=>({
    name:String(name).trim(),
    type,
    settings:{
        purse:Math.round(Number(purseCr)*100),
        timerSeconds:Number(timerSeconds),
        maxTeams:Number(maxTeams)
    }
})
