// Pure rules for arranging your XI (same rules as server/utils/lineupRules.js), kept here so they can be tested.
// A lineup is 11 positions: {player: id|null, backups: [ids]}. lineup[0] bats at 1.
// A "zone" is where a card is dropped:
//   {kind:'place', i}  an open position      {kind:'swap', i}  onto the player at i
//   {kind:'tuck', i}   onto his right edge = become his backup      {kind:'hand'}  back to the hand
// and while a player's backup pile is turned over (face up in his row):
//   {kind:'pile', i, k}  onto backup k: replaces him, or moves there if he's already in the pile
//   {kind:'pileAdd', i}  onto the pile anywhere else (his strip): add at the end
//   {kind:'unback', i}   a backup dragged out of the pile to the hand: no longer backs up i
import { idOf, isOverseas } from './board.js'

export const XI_SIZE=11
export const XI_OVERSEAS_MAX=4

// any lineup from the server (ids or populated players, missing slots) -> 11 clean slots of string ids
export const normalizeLineup=(lineup=[])=>Array.from({length:XI_SIZE},(_,i)=>{
    const slot=lineup[i]||{}
    const player=idOf(slot.player)||null
    return {player,backups:player ? (slot.backups||[]).map(idOf).filter(Boolean) : []}
})

const copy=(lineup)=>lineup.map(slot=>({player:slot.player,backups:[...slot.backups]}))

export const startersOf=(lineup)=>lineup.map(slot=>slot.player).filter(Boolean)
export const positionOf=(lineup,id)=>lineup.findIndex(slot=>slot.player===String(id))
// the positions (1-based) a player backs up
export const backingUp=(lineup,id)=>lineup.map((slot,i)=>slot.backups.includes(String(id)) ? i+1 : 0).filter(Boolean)

export const overseasStarters=(lineup,byId,homeCountry)=>startersOf(lineup).filter(id=>isOverseas(byId[id],homeCountry)).length

// everyone you bought who isn't starting (backups included), in squad order
export const handOf=(squad,lineup)=>squad.filter(p=>positionOf(lineup,p._id)===-1)

export const lastName=(name='')=>String(name).trim().split(/\s+/).pop()

// what a drop would do, before it happens: {ok, label, why?, overseas?} or null (nothing to do)
//   label: the short tag shown on the slot ("Bat at 8", "Swap with Kohli", "Back up Sharma", "No slot left")
//   why:   a full sentence when the drop is refused
export const planDrop=(lineup,id,zone,{byId={},homeCountry}={})=>{
    if(!zone) return null
    id=String(id)
    const player=byId[id]
    const from=positionOf(lineup,id)
    if(zone.kind==='hand') return from>-1 ? {ok:true,label:'Take out'} : null
    if(zone.kind==='unback') return lineup[zone.i]?.backups.includes(id) ? {ok:true,label:'Remove backup'} : null

    const i=zone.i
    const there=lineup[i]?.player||null
    if(zone.kind==='pile'||zone.kind==='pileAdd'){
        if(!there) return null
        if(from>-1) return {ok:false,label:'Starting already',why:`${player?.name} is in the XI. Take him out first to make him a backup.`}
        const pile=lineup[i].backups
        if(zone.kind==='pileAdd'){
            if(!pile.includes(id)) return {ok:true,label:`Back up ${lastName(byId[there]?.name)}`}
            return pile[pile.length-1]===id ? null : {ok:true,label:'Move to last'}
        }
        const current=pile[zone.k]
        if(!current||current===id) return null
        return pile.includes(id) ? {ok:true,label:`Make him no. ${zone.k+1}`} : {ok:true,label:`Replace ${lastName(byId[current]?.name)}`}
    }
    if(zone.kind==='tuck'){
        if(!there||there===id) return null
        const name=byId[there]?.name
        if(from>-1) return {ok:false,label:'Starting already',why:`${player?.name} is in the XI. Take him out first to make him a backup.`}
        if(lineup[i].backups.includes(id)) return {ok:false,label:'Already a backup',why:`${player?.name} already backs up ${name}.`}
        return {ok:true,label:`Back up ${lastName(name)}`}
    }
    if(from===i) return null
    // a new overseas starter needs a free overseas spot (swapping two starters changes nothing)
    const comesIn=from===-1
    if(comesIn&&isOverseas(player,homeCountry)&&!(there&&isOverseas(byId[there],homeCountry))&&overseasStarters(lineup,byId,homeCountry)>=XI_OVERSEAS_MAX){
        return {ok:false,overseas:true,label:'No overseas spot',why:`All ${XI_OVERSEAS_MAX} overseas spots are used. Take an overseas player out first.`}
    }
    return {ok:true,label:there ? `Swap with ${lastName(byId[there]?.name)}` : `Bat at ${i+1}`}
}

// the lineup after a drop (call planDrop first; this doesn't check the rules). returns a new lineup.
export const applyDrop=(lineup,id,zone)=>{
    id=String(id)
    const next=copy(lineup)
    const from=positionOf(next,id)
    if(zone.kind==='hand'){
        if(from>-1) next[from]={player:null,backups:[]}
        return next
    }
    const i=zone.i
    if(zone.kind==='tuck') return addBackup(next,i,id)
    if(zone.kind==='unback') return removeBackup(next,i,id)
    if(zone.kind==='pileAdd'){
        next[i].backups=[...next[i].backups.filter(b=>b!==id),id]
        return next
    }
    if(zone.kind==='pile'){
        const pile=next[i].backups
        const at=pile.indexOf(id)
        if(at>-1){
            // already in the pile: move him to k
            pile.splice(at,1)
            pile.splice(zone.k,0,id)
        }
        else pile[zone.k]=id // a hand card takes backup k's place
        return next
    }
    // he starts now, so he can't be anyone's backup
    next.forEach(slot=>{ slot.backups=slot.backups.filter(b=>b!==id) })
    if(from>-1){
        // two starters change places; their backups go with them
        const moving=next[from]
        next[from]=next[i]
        next[i]=moving
    }
    else{
        // from the hand: he takes the spot (and its backups); whoever was there goes back to the hand
        next[i]={player:id,backups:next[i].player ? next[i].backups : []}
    }
    return next
}

// add / remove one backup of position i (returns a new lineup)
export const addBackup=(lineup,i,id)=>{
    const next=copy(lineup)
    if(next[i].player&&!next[i].backups.includes(String(id))) next[i].backups.push(String(id))
    return next
}
export const removeBackup=(lineup,i,id)=>{
    const next=copy(lineup)
    next[i].backups=next[i].backups.filter(b=>b!==String(id))
    return next
}

// the balance see-saw and the checks under it. allrounders count half on each side.
export const balance=(lineup,byId)=>{
    const starters=startersOf(lineup).map(id=>byId[id]).filter(Boolean)
    const bat=starters.reduce((sum,p)=>sum+(p.role==='Bowler' ? 0 : p.role==='Allrounder' ? .5 : 1),0)
    const bowl=starters.reduce((sum,p)=>sum+(p.role==='Bowler' ? 1 : p.role==='Allrounder' ? .5 : 0),0)
    const tilt=Math.max(-14,Math.min(14,(bowl-bat)*3))
    return {
        placed:starters.length,
        bat,
        bowl,
        tilt,
        lean:Math.abs(tilt)<=3 ? 'Balanced' : tilt<0 ? 'Batting heavy' : 'Bowling heavy',
        keeper:starters.some(p=>p.role==='Wicketkeeper'),
        bowlingOptions:starters.filter(p=>p.role==='Bowler'||p.role==='Allrounder').length
    }
}

// the one number printed big on a card
export const powerStat=(player)=>{
    const s=player?.stats||{}
    const pick=(label,value)=>({label,value:value ? value : '–'})
    if(player?.role==='Bowler') return pick('WKT',s.wickets)
    if(player?.role==='Allrounder') return s.wickets>0&&!(s.strikeRate>0) ? pick('WKT',s.wickets) : pick('SR',s.strikeRate)
    return s.strikeRate>0 ? pick('SR',s.strikeRate) : pick('AVG',s.battingAverage)
}

export const ROLE_SHORT={Batsman:'BAT',Wicketkeeper:'WK',Allrounder:'AR',Bowler:'BOWL'}
export const ROLE_BAND={Batsman:'Batter',Wicketkeeper:'Keeper',Allrounder:'Allrounder',Bowler:'Bowler'}
// one bright colour per role (the band on a card, the chip); the values live in components/xi/xi.css
export const ROLE_COLOUR={Batsman:'var(--bat)',Wicketkeeper:'var(--wk)',Allrounder:'var(--ar)',Bowler:'var(--bowl)'}
