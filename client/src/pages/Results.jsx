import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Aura from '../components/ui/Aura'
import Button from '../components/ui/Button'
import RoomHeader from '../components/results/RoomHeader'
import TeamSheet from '../components/results/TeamSheet'
import { useRoom } from '../components/roomContext'
import { useFranchises } from '../hooks/useFranchises'
import { getPlayers, getTeams } from '../api/auction'
import { getRoom, getAllLineups, roomHome } from '../api/rooms'
import { errorMessage } from '../api/axios'
import { formatMoney } from '../utils/money'
import { teamGlow } from '../utils/board'
import { liveSheets, totals } from '../utils/results'

const pill='grid rounded-xl border border-line bg-night/55 px-3 pt-1.5 pb-[5px]'
const Pill=({ label, value })=><div className={pill}><small className="text-[10px] font-bold tracking-[.14em] text-fg-3 uppercase">{label}</small><b className="font-num text-[19px] leading-[1.05] font-extrabold tabular-nums">{value}</b></div>

// Every team's squad, one sheet each. Once the auction ends, the secret Playing XIs can be revealed:
// the sheets flip over one after another.
function Results(){
    const { roomId, room:startRoom, role, me }=useRoom()
    const { byCode }=useFranchises()
    const [data,setData]=useState(null) // {room, players, teams, lineups|null}
    const [error,setError]=useState('')
    const [flipped,setFlipped]=useState({}) // teamId -> true

    useEffect(()=>{
        let cancelled=false
        Promise.all([getRoom(roomId),getPlayers(roomId),getTeams(roomId)])
            .then(async([fresh,players,teams])=>{
                // every XI is private until the auction ends (the server says 403 before that)
                const lineups=fresh.room.status==='ended' ? await getAllLineups(roomId).catch(()=>null) : null
                if(!cancelled) setData({room:fresh.room,players,teams,lineups})
            })
            .catch(err=>{ if(!cancelled) setError(errorMessage(err)) })
        return ()=>{ cancelled=true }
    },[roomId])

    const room=data?.room||startRoom
    const myTeam=role==='team'&&data ? data.teams.find(t=>String(t._id)===String(me.id)) : null
    const myGlow=myTeam ? teamGlow(myTeam,byCode) : undefined

    if(!data){
        return (
            <div className="min-h-screen bg-night px-4 pt-[18px] font-text text-fg sm:px-5">
                {error && <p role="alert" className="mx-auto max-w-[1240px] rounded-xl bg-alert/10 px-3.5 py-2.5 text-alert">{error}</p>}
            </div>
        )
    }

    const { players, teams, lineups }=data
    const homeCountry=room.settings?.rules?.homeCountry||'India'
    const ended=room.status==='ended'
    const sum=totals(players)
    const unsold=players.filter(p=>p.status==='unsold')
    // your own sheet first
    const sheets=liveSheets(teams,players).sort((a,b)=>(String(b.team._id)===String(me.id))-(String(a.team._id)===String(me.id)))
    const xiFor=(teamId)=>lineups?.find(l=>String(l._id)===String(teamId))?.lineup
    const anyFront=sheets.some(s=>!flipped[s.team._id])

    const revealAll=()=>{
        sheets.forEach((s,i)=>setTimeout(()=>setFlipped(prev=>({...prev,[s.team._id]:anyFront})),i*220))
    }

    return (
        <Aura variant="page" glow={myGlow} className="min-h-screen overflow-x-hidden bg-night font-text text-[15px] text-fg antialiased">
            <div className="mx-auto max-w-[1240px] px-4 pt-[18px] pb-12 sm:px-5">
                <RoomHeader room={room}>
                    {room.status==='live' && <Button as={Link} to={roomHome(roomId,role)} kind="primary" size="sm" arrow>Back to the auction</Button>}
                    <Button as={Link} to={`/rooms/${roomId}/history`} kind="secondary" size="sm">Past auctions</Button>
                </RoomHeader>

                <div className="mb-[22px] flex flex-wrap items-end justify-between gap-[18px]">
                    <div>
                        <span className="text-xs font-semibold tracking-[.16em] text-fg-2 uppercase">Results</span>
                        <h1 className="mt-1.5 mb-1.5 font-num text-[clamp(44px,7vw,84px)] leading-[.88] font-black uppercase [text-wrap:balance]">{ended ? 'Final squads' : 'Squads so far'}</h1>
                        <p className="m-0 max-w-[60ch] text-base text-fg-2">
                            {ended ? "Every team's buys, and now that the hammer's down, every Playing XI." : 'Every team\'s buys so far. The Playing XIs stay secret until the auction ends.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Pill label="Sold" value={sum.sold} />
                        <Pill label="Unsold" value={sum.unsold} />
                        <Pill label="Spent" value={formatMoney(sum.spent)} />
                    </div>
                </div>

                {lineups && sheets.length>0 && (
                    <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3.5 rounded-[20px] border border-floodlight/25 bg-floodlight/5 px-4 py-3.5">
                        <div>
                            <b className="font-num text-2xl font-black uppercase">The XIs were secret</b>
                            <span className="block text-sm text-fg-2">Each team built theirs during the auction. Flip the sheets to see them.</span>
                        </div>
                        <Button kind="primary" size="sm" onClick={revealAll}>{anyFront ? 'Reveal the XIs' : 'Show the squads'}</Button>
                    </div>
                )}

                {sheets.length===0
                    ? <p className="m-0 text-fg-2">No teams in this room yet.</p>
                    : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(330px,100%),1fr))] items-start gap-4">
                            {sheets.map(({team,squad,spent,left})=>(
                                <TeamSheet key={team._id} team={team} glow={teamGlow(team,byCode)} squad={squad} spent={spent} left={left}
                                    me={String(team._id)===String(me.id)} xi={xiFor(team._id)} flipped={Boolean(flipped[team._id])}
                                    onFlip={()=>setFlipped(prev=>({...prev,[team._id]:!prev[team._id]}))}
                                    homeCountry={homeCountry} franchisesByCode={byCode} />
                            ))}
                        </div>
                    )}

                {unsold.length>0 && (
                    <div className="mt-[22px] grid gap-2.5 rounded-[20px] border border-line bg-night-2/70 p-4">
                        <h2 className="m-0 flex justify-between font-num text-2xl font-black uppercase">
                            Unsold <small className="font-text text-xs font-semibold text-fg-3 normal-case">{unsold.length} {unsold.length===1 ? 'player' : 'players'}</small>
                        </h2>
                        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                            {unsold.map(p=>(
                                <li key={p._id} className="rounded-full border border-line bg-white/[.04] px-2.5 py-1.5 text-[13px] text-fg-2">{p.name} · {formatMoney(p.basePrice)} base</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Aura>
    )
}

export default Results
