import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Aura from '../components/ui/Aura'
import Button from '../components/ui/Button'
import Toast from '../components/ui/Toast'
import LotCard from '../components/board/LotCard'
import PlayerAvatar from '../components/board/PlayerAvatar'
import TeamTag from '../components/board/TeamTag'
import TeamSlots from '../components/host/TeamSlots'
import Leaderboard from '../components/host/Leaderboard'
import BidClock from '../components/host/BidClock'
import PlayerPopup from '../components/host/PlayerPopup'
import SettingsPopup from '../components/host/SettingsPopup'
import SetsPopup from '../components/host/SetsPopup'
import ConfirmPopup from '../components/host/ConfirmPopup'
import PackPicker from '../components/host/PackPicker'
import Popup from '../components/ui/Popup'
import { useRoom } from '../components/roomContext'
import { useFranchises } from '../hooks/useFranchises'
import socket, { connectToRoom } from '../api/socket'
import { getAuction, getPlayers, getTeams } from '../api/auction'
import { getSets, startAuction, resetAuction } from '../api/host'
import { getRoom } from '../api/rooms'
import { errorMessage } from '../api/axios'
import { formatMoney } from '../utils/money'
import { idOf, isOverseas, upcomingPlayers, teamGlow } from '../utils/board'
import { groupBySet, startChecks, canStart, auctionProgress, teamSummaries, biggestBuy } from '../utils/host'

const HAMMER_MS=2800

const panel='grid min-w-0 content-start gap-3.5 rounded-[22px] border border-line bg-night-2/80 p-[18px] backdrop-blur-md'
const panelTitle='m-0 flex items-center justify-between gap-2.5 font-num text-[26px] font-black uppercase'
const panelNote='font-text text-xs font-semibold tracking-[.02em] text-fg-3 normal-case'
const pill='grid rounded-xl border border-line bg-night/55 px-3 pt-1.5 pb-[5px]'
const pillLabel='text-[10px] font-bold tracking-[.14em] text-fg-3 uppercase'
const pillValue='font-num text-[19px] leading-[1.05] font-extrabold tabular-nums'
const eyebrow='text-xs font-semibold tracking-[.16em] text-fg-2 uppercase'
const pageTitle='mt-1.5 mb-1.5 font-num text-[clamp(44px,7vw,84px)] leading-[.88] font-black uppercase [text-wrap:balance]'

const Pill=({ label, value })=><div className={pill}><small className={pillLabel}>{label}</small><b className={pillValue}>{value}</b></div>

// (the three states below are plain render functions, not components, so nothing remounts on each clock tick)
// The host's desk, in three states that follow the auction:
// setting up (teams, players, settings, start), live (the lot, the clock, every team's purse), over (who bought what).
function HostDashboard(){
    const { roomId, room:startRoom }=useRoom()
    const { franchises, byCode }=useFranchises()
    const [room,setRoom]=useState(startRoom)
    const [data,setData]=useState(null)        // {session, players, teams, sets}
    const [feed,setFeed]=useState([])
    const [hammer,setHammer]=useState(null)
    const [now,setNow]=useState(()=>Date.now())
    const [popup,setPopup]=useState(null)      // {kind:'player'|'settings'|'sets'|'pack'|'start'|'reset', player?}
    const [toast,setToast]=useState(null)
    const [newestTeamId,setNewestTeamId]=useState(null)
    const toastTimer=useRef(null)

    const showToast=useCallback((message,tone='info')=>{
        clearTimeout(toastTimer.current)
        setToast({message,tone})
        toastTimer.current=setTimeout(()=>setToast(null),2600)
    },[])

    const loadAll=useCallback(async()=>{
        const [auction,players,teams,sets,fresh]=await Promise.all([
            getAuction(roomId),getPlayers(roomId),getTeams(roomId),getSets(roomId),getRoom(roomId)
        ])
        setRoom(fresh.room)
        setData({session:auction.populatedSession,players,teams,sets})
        const rows=(auction.recentBids||[]).map(b=>({key:`${idOf(b.team)}-${b.amount}`,teamId:idOf(b.team),amount:b.amount}))
        setFeed(rows.filter((row,i)=>rows.findIndex(r=>r.key===row.key)===i))
    },[roomId])

    useEffect(()=>{
        loadAll().catch(err=>showToast(errorMessage(err),'bad'))
    },[loadAll,showToast])

    // live events
    useEffect(()=>{
        const onJoined=(event)=>{
            const team=event.team
            setNewestTeamId(team._id)
            showToast(`${team.teamName} joined`,'good')
            // re-read the teams so a new one shows its owner's name like the others
            getTeams(roomId).then(list=>setData(prev=>prev ? {...prev,teams:list} : prev)).catch(()=>{})
        }
        const onStarted=()=>{ loadAll().catch(()=>{}) }
        const onBid=(event)=>{
            setData(prev=>prev ? {...prev,session:{...prev.session,currentPrice:event.currentPrice,highestBidder:event.highestBidder,timerEndsAt:event.timerEndsAt}} : prev)
            const key=`${idOf(event.highestBidder)}-${event.currentPrice}`
            setFeed(prev=>prev.some(b=>b.key===key) ? prev : [{key,teamId:idOf(event.highestBidder),amount:event.currentPrice},...prev].slice(0,5))
        }
        const onFinished=(event)=>{
            const done=event.finishedPlayer
            const sold=done?.status==='sold'
            setHammer({key:done?.id||Date.now(),sold,detail:sold ? `To ${done.teamName} · ${formatMoney(done.soldPrice)}` : undefined})
            setTimeout(()=>{
                setHammer(null)
                loadAll().catch(()=>{})
            },HAMMER_MS)
        }
        socket.on('team-joined',onJoined)
        socket.on('auction-started',onStarted)
        socket.on('bid-placed',onBid)
        socket.on('next-player',onFinished)
        socket.on('auction-ended',onFinished)
        connectToRoom(roomId)
        return ()=>{
            socket.off('team-joined',onJoined)
            socket.off('auction-started',onStarted)
            socket.off('bid-placed',onBid)
            socket.off('next-player',onFinished)
            socket.off('auction-ended',onFinished)
        }
    },[roomId,loadAll,showToast])

    useEffect(()=>{
        const tick=setInterval(()=>setNow(Date.now()),200)
        return ()=>{ clearInterval(tick); clearTimeout(toastTimer.current) }
    },[])

    const closePopup=useCallback(()=>setPopup(null),[])
    const reload=useCallback((message)=>{
        if(message) showToast(message,'good')
        loadAll().catch(err=>showToast(errorMessage(err),'bad'))
    },[loadAll,showToast])

    const dealt=useCallback((result)=>{
        setPopup(null)
        const more=result.skipped ? ` · ${result.skipped} already in` : ''
        reload(result.added ? `${result.added} players dealt in${more}` : `Nobody new to add${more}`)
    },[reload])
    const packError=useCallback((message)=>showToast(message,'bad'),[showToast])

    const teamsById=useMemo(()=>Object.fromEntries((data?.teams||[]).map(t=>[String(t._id),t])),[data?.teams])

    if(!data){
        return <div className="min-h-screen bg-night" aria-busy="true" />
    }

    const { session, players, teams, sets }=data
    const homeCountry=room.settings?.rules?.homeCountry||'India'
    const player=session?.currentPlayer&&typeof session.currentPlayer==='object' ? session.currentPlayer : null
    const phase=session?.status==='live'&&player ? 'live' : (session?.status==='ended'||room.status==='ended') ? 'ended' : 'setup'
    const leaderId=idOf(session?.highestBidder)
    const leader=leaderId ? teamsById[leaderId]||{teamName:session.highestBidder?.teamName} : null

    const copyCode=async()=>{
        try{
            await navigator.clipboard.writeText(room.inviteCode)
            showToast(`Code ${room.inviteCode} copied`,'good')
        }
        catch{
            showToast(`Code: ${room.inviteCode}`)
        }
    }

    const chip={
        setup:<span className="inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border border-white/15 bg-night/50 px-2.5 pt-1 pb-[3px] text-[11px] font-bold tracking-[.14em] uppercase"><i className="size-[7px] rounded-full bg-floodlight" aria-hidden="true" />In the lobby</span>,
        live:<span className="inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border border-[#FF4D4D]/50 bg-night/50 px-2.5 pt-1 pb-[3px] text-[11px] font-bold tracking-[.14em] uppercase"><i className="bz-live-dot size-[7px] rounded-full bg-[#FF4D4D]" aria-hidden="true" />Live</span>,
        ended:<span className="inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border border-white/15 bg-night/50 px-2.5 pt-1 pb-[3px] text-[11px] font-bold tracking-[.14em] uppercase"><i className="size-[7px] rounded-full bg-fg-3" aria-hidden="true" />Finished</span>
    }[phase]

    return (
        <Aura variant="page" accent={phase==='live'&&leader ? teamGlow(leader,byCode).p : undefined}
            className="min-h-screen bg-night font-text text-[15px] text-fg antialiased">
            <div className="mx-auto max-w-[1240px] px-4 pt-[18px] pb-12 sm:px-5">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-3.5">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <Link to="/lobby" className="font-num text-[22px] font-black tracking-[.06em] text-fg no-underline">BIDZY</Link>
                        {chip}
                        <span className="truncate font-semibold text-fg-2">{room.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="rounded-[7px] bg-floodlight/10 px-2 py-[3px] font-num text-sm font-black tracking-[.04em] text-floodlight ring-1 ring-floodlight/35 ring-inset">HOST</span>
                        <span className="text-sm text-fg-2">You run this auction</span>
                    </div>
                </header>

                {phase==='setup' && renderSetup()}
                {phase==='live' && renderLive()}
                {phase==='ended' && renderOver()}
            </div>

            {popup?.kind==='player' && <PlayerPopup roomId={roomId} player={popup.player} sets={sets} defaultSetId={popup.setId} onSaved={reload} onClose={closePopup} />}
            {popup?.kind==='settings' && <SettingsPopup roomId={roomId} room={room} teamCount={teams.length} onSaved={(updated)=>{ setRoom(prev=>({...prev,...updated})); reload('Settings saved') }} onClose={closePopup} />}
            {popup?.kind==='pack' && (
                <Popup open onClose={closePopup} title="Add IPL sets" wide="xl">
                    <PackPicker roomId={roomId} sets={sets} players={players} franchises={franchises} onDealt={dealt} onError={packError} />
                </Popup>
            )}
            {popup?.kind==='sets' && <SetsPopup roomId={roomId} groups={groupBySet(players,sets)} onChanged={()=>reload()} onClose={closePopup} />}
            {popup?.kind==='start' && (
                <ConfirmPopup title="Start the auction?" line="Settings lock and the first player goes up." confirmLabel="Start" cancelLabel="Not yet"
                    onConfirm={async()=>{ await startAuction(roomId); await loadAll() }} onClose={closePopup} />
            )}
            {popup?.kind==='reset' && (
                <ConfirmPopup title="Start a new round?" line="Results are saved; purses and squads reset." confirmLabel="New round" danger
                    onConfirm={async()=>{ await resetAuction(roomId); await loadAll() }} onClose={closePopup} />
            )}
            {toast && <Toast message={toast.message} tone={toast.tone} />}
        </Aura>
    )

    // ---------- 1. setting up ----------
    function renderSetup(){
        const groups=groupBySet(players,sets)
        const checks=startChecks(teams,players)
        const rules=room.settings.rules||{}
        const letters=String(room.inviteCode||'').split('')
        return (
            <section aria-label="Setting up">
                <div className="mb-[22px] grid items-end gap-[22px] min-[821px]:grid-cols-[minmax(0,1fr)_auto]">
                    <div>
                        <span className={eyebrow}>Setting up</span>
                        <h1 className={pageTitle}>Get the room ready</h1>
                        <p className="m-0 max-w-[56ch] text-base text-fg-2">Send the code, add your players, then start when the teams are in. Settings lock once the first player is up.</p>
                    </div>
                    <div className="bz-ticket grid gap-2 rounded-[18px] px-[18px] py-4 min-[421px]:min-w-[280px]">
                        <small className="text-[11px] font-bold tracking-[.18em] uppercase opacity-60">Invite code</small>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex gap-[5px]" role="img" aria-label={`Invite code ${letters.join(' ')}`}>
                                {letters.map((letter,i)=>(
                                    <span key={i} aria-hidden="true" className="grid h-11 w-[34px] place-items-center rounded-lg bg-[#1A1407] font-num text-[26px] font-black text-floodlight">{letter}</span>
                                ))}
                            </div>
                            <button type="button" onClick={copyCode}
                                className="cursor-pointer rounded-[9px] border border-[#1A1407]/30 bg-[#1A1407]/[.06] px-3 py-2 font-text text-[13px] font-bold text-[#1A1407] focus-visible:outline-2 focus-visible:outline-[#1A1407]">
                                Copy
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid items-start gap-[18px] min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                    <div className={panel}>
                        <h2 className={panelTitle}>Teams <small className={panelNote}>{teams.length} of {room.settings.maxTeams} in · joining live</small></h2>
                        <TeamSlots teams={teams} maxTeams={room.settings.maxTeams} franchisesByCode={byCode} newestId={newestTeamId} />
                        <div className="flex flex-wrap gap-1.5">
                            <Pill label="Purse each" value={formatMoney(room.settings.purse)} />
                            <Pill label="Bid timer" value={`${room.settings.timerSeconds} s`} />
                            <Pill label="Squad" value={`${rules.squadMin}–${rules.squadMax}`} />
                            <Pill label="Overseas" value={`${rules.overseasMin}–${rules.overseasMax}`} />
                        </div>
                        <div><Button kind="secondary" size="sm" onClick={()=>setPopup({kind:'settings'})}>Edit settings</Button></div>
                    </div>

                    {players.length===0 ? (
                    <div className="grid min-w-0 content-start gap-[18px]">
                        <PackPicker roomId={roomId} sets={sets} players={players} franchises={franchises} onDealt={dealt} onError={packError} />
                        <div className={panel}>
                            <h2 className={panelTitle}>Your own players</h2>
                            <p className="m-0 text-sm text-fg-2">College league, office cup, friends' XI: add anyone with a name, a role and a base price. A photo is optional.</p>
                            <div className="flex flex-wrap gap-2.5">
                                <Button kind="secondary" size="sm" onClick={()=>setPopup({kind:'player'})} disabled={sets.length===0}>Add a player <span aria-hidden="true">+</span></Button>
                                <Button kind="quiet" onClick={()=>setPopup({kind:'sets'})}>Order of sets</Button>
                            </div>
                        </div>
                    </div>
                    ) : (
                    <div className={panel}>
                        <h2 className={panelTitle}>Players <small className={panelNote}>{players.length} {players.length===1 ? 'player' : 'players'} · {sets.length} sets</small></h2>
                        <div className="grid gap-3.5">
                            {groups.map(({set,players:inSet})=>(
                                <div key={set._id}>
                                    <h3 className="m-0 mb-1.5 flex justify-between font-num text-lg font-extrabold tracking-[.04em] text-fg-2 uppercase">
                                        {set.name}<span className="font-text text-xs font-semibold tracking-normal text-fg-3 normal-case">{inSet.length} {inSet.length===1 ? 'player' : 'players'}</span>
                                    </h3>
                                    {inSet.length===0
                                        ? <button type="button" onClick={()=>setPopup({kind:'player',setId:set._id})}
                                            className="w-full cursor-pointer rounded-xl border border-dashed border-white/[.14] bg-transparent px-3 py-2.5 text-left font-text text-[13px] text-fg-3 hover:border-white/30 hover:text-fg-2">
                                            + Add a player to {set.name}
                                          </button>
                                        : (
                                            <ul className="m-0 grid list-none gap-1.5 p-0">
                                                {inSet.map((p,k)=>(
                                                    <li key={p._id} style={{'--k':Math.min(k,12)}} className="bz-land grid grid-cols-[40px_minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-xl bg-white/[.03] px-2 py-[7px]">
                                                        <PlayerAvatar player={p} className="size-10" />
                                                        <span className="min-w-0">
                                                            <b className="block truncate font-semibold">
                                                                {p.name}
                                                                {isOverseas(p,homeCountry) && <span className="ml-1.5 rounded-[5px] border border-floodlight/35 px-1 text-[10px] font-bold tracking-[.1em] text-floodlight">OS</span>}
                                                            </b>
                                                            <small className="text-xs text-fg-3">
                                                                {p.role} · {p.country}
                                                                {p.roleGuessed && <span className="ml-1.5 rounded-[5px] border border-dashed border-[#F6C24A]/60 px-1 text-[10px] font-bold tracking-[.06em] text-[#FFE3A3]">role guessed</span>}
                                                            </small>
                                                        </span>
                                                        <span className="font-num text-[17px] font-extrabold tabular-nums">{formatMoney(p.basePrice)}</span>
                                                        <button type="button" onClick={()=>setPopup({kind:'player',player:p})} aria-label={`Edit ${p.name}`}
                                                            className="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1.5 font-text text-[13px] font-semibold text-fg-2 hover:bg-white/[.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-fg">
                                                            Edit
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            <Button kind="primary" size="sm" onClick={()=>setPopup({kind:'player'})} disabled={sets.length===0}>Add a player <span aria-hidden="true">+</span></Button>
                            <Button kind="secondary" size="sm" onClick={()=>setPopup({kind:'sets'})}>Order of sets</Button>
                            <Button kind="secondary" size="sm" onClick={()=>setPopup({kind:'pack'})}>Add IPL sets</Button>
                        </div>
                    </div>
                    )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-line bg-night-2/75 px-[18px] py-4">
                    <ul className="m-0 flex list-none flex-wrap gap-4 p-0 text-sm text-fg-2">
                        {checks.map(c=>(
                            <li key={c.text}><span aria-hidden="true" className={c.ok ? 'font-bold text-sold' : 'text-fg-3'}>{c.ok ? '✓ ' : '• '}</span>{c.text}</li>
                        ))}
                    </ul>
                    <Button kind="primary" arrow onClick={()=>setPopup({kind:'start'})} disabled={!canStart(teams,players)} className="px-7! pt-[22px]! pb-[17px]! text-[26px]!">
                        Start the auction
                    </Button>
                </div>
            </section>
        )
    }

    // ---------- 2. live ----------
    function renderLive(){
        const progress=auctionProgress(players,player._id)
        const lot=players[progress.lot-1]
        const lotLabel=`${lot?.set?.name ? lot.set.name+' · ' : ''}Lot ${progress.lot} of ${progress.total}`
        const upcoming=upcomingPlayers(players)
        const msLeft=session.timerEndsAt ? Math.max(0,new Date(session.timerEndsAt).getTime()-now) : 0
        const timerMs=(room.settings.timerSeconds||15)*1000
        const feedRows=feed.map(f=>({...f,team:teamsById[f.teamId]||null}))
        return (
            <section aria-label="Live auction" className="grid items-start gap-5 min-[981px]:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                    <LotCard key={player._id} player={player} lotLabel={lotLabel} homeCountry={homeCountry} price={session.currentPrice}
                        leader={leader} mine={false} feed={feedRows} franchisesByCode={byCode} hammer={hammer} />
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        {!hammer && <BidClock progress={msLeft/timerMs} seconds={Math.ceil(msLeft/1000)} />}
                        <div className="flex flex-wrap gap-1.5">
                            <Pill label="Lot" value={`${progress.lot} of ${progress.total}`} />
                            <Pill label="Sold" value={progress.sold} />
                            <Pill label="Unsold" value={progress.unsold} />
                            <Pill label="Spent so far" value={formatMoney(progress.spent)} />
                        </div>
                    </div>
                    <div className={`${panel} mt-4`}>
                        <h2 className={panelTitle}>Up next <small className={panelNote}>{upcoming.length} to go</small></h2>
                        {upcoming.length===0
                            ? <p className="m-0 text-sm text-fg-3">This is the last player.</p>
                            : (
                                <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1">
                                    {upcoming.map(p=>(
                                        <li key={p._id} className="grid w-[150px] flex-none gap-1.5 rounded-[14px] border border-line bg-white/[.03] p-2">
                                            <PlayerAvatar player={p} className="h-[90px] w-full" />
                                            <b className="truncate text-[13px]">{p.name}</b>
                                            <small className="text-[11px] text-fg-3">{p.role} · {formatMoney(p.basePrice)}</small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </div>
                </div>
                <aside className={panel} aria-label="Teams">
                    <h2 className={panelTitle}>Teams <small className={panelNote}>live</small></h2>
                    <Leaderboard teams={teams} franchisesByCode={byCode} leaderId={hammer ? null : leaderId} />
                    <p className="m-0 text-xs text-fg-3">The team in a bright box is winning this lot.</p>
                </aside>
            </section>
        )
    }

    // ---------- 3. over ----------
    function renderOver(){
        const summaries=teamSummaries(teams,players)
        const sold=players.filter(p=>p.status==='sold')
        const unsold=players.filter(p=>p.status==='unsold').length
        const spent=sold.reduce((sum,p)=>sum+(p.soldPrice||0),0)
        const buyers=summaries.filter(s=>s.bought.length>0).length
        const top=biggestBuy(players)
        const topTeam=top ? teamsById[idOf(top.soldTo)] : null
        return (
            <section aria-label="Auction over">
                <span className={eyebrow}>Auction over</span>
                <h1 className={pageTitle}>Hammer's down</h1>
                <p className="m-0 mb-[18px] max-w-[60ch] text-base text-fg-2">
                    {sold.length+unsold} players went under the hammer: {sold.length} sold, {unsold} unsold. {formatMoney(spent)} spent across {buyers} {buyers===1 ? 'team' : 'teams'}.
                </p>

                {top && (
                    <div className="mb-[18px] flex flex-wrap items-center gap-4 rounded-[20px] border border-[#F0B93A]/35 bg-[#F0B93A]/[.06] px-4 py-3.5">
                        <PlayerAvatar player={top} className="size-16" />
                        <div><span className={eyebrow}>Biggest buy</span><b className="block font-num text-[26px] leading-none font-black uppercase">{top.name}</b></div>
                        <div className="ml-auto flex items-center gap-2.5">
                            {topTeam && <TeamTag team={topTeam} franchisesByCode={byCode} />}
                            <b className="font-num text-[30px] font-black tabular-nums">{formatMoney(top.soldPrice)}</b>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-3.5">
                    {summaries.map(({team,bought,spent:teamSpent})=>{
                        const glow=teamGlow(team,byCode)
                        return (
                            <div key={team._id} className="relative isolate grid content-start gap-3 overflow-hidden rounded-[20px] border border-line bg-night-2 p-4">
                                <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-60" style={{background:`radial-gradient(90% 60% at 0% 0% in oklab,${glow.p},transparent 70%)`}} />
                                <span aria-hidden="true" className="absolute inset-0 -z-10" style={{background:'linear-gradient(to bottom,transparent 10%,var(--color-night-2) 60%)'}} />
                                <div className="flex items-center gap-2.5">
                                    <TeamTag team={team} franchisesByCode={byCode} />
                                    <b className="min-w-0 font-num text-xl leading-[1.05] font-black uppercase">{team.teamName}</b>
                                </div>
                                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
                                    {[['Bought',bought.length],['Spent',formatMoney(teamSpent)],['Left',formatMoney(team.purseRemaining)]].map(([label,value])=>(
                                        <div key={label} className="grid bg-night-2/90 px-2.5 py-2">
                                            <small className={pillLabel}>{label}</small>
                                            <b className="font-num text-lg font-extrabold whitespace-nowrap tabular-nums">{value}</b>
                                        </div>
                                    ))}
                                </div>
                                {bought.length===0
                                    ? <p className="m-0 text-[13px] text-fg-3">Bought nobody.</p>
                                    : (
                                        <ul className="m-0 grid list-none gap-[3px] p-0 text-[13px]">
                                            {bought.map(p=>(
                                                <li key={p._id} className="flex justify-between gap-2 text-fg-2">
                                                    <span className="truncate">{p.name}</span>
                                                    <span className="font-num text-[15px] font-extrabold text-fg tabular-nums">{formatMoney(p.soldPrice)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                            </div>
                        )
                    })}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-line bg-night-2/75 px-[18px] py-4">
                    <ul className="m-0 flex list-none flex-wrap gap-4 p-0 text-sm text-fg-2">
                        <li><span aria-hidden="true" className="font-bold text-sold">✓ </span>Every XI is now visible to all teams</li>
                    </ul>
                    <div className="flex flex-wrap gap-2.5">
                        <Button kind="secondary" onClick={()=>setPopup({kind:'reset'})}>Start a new round</Button>
                        <Button kind="primary" arrow as={Link} to={`/rooms/${roomId}/results`}>See results</Button>
                    </div>
                </div>
            </section>
        )
    }
}

export default HostDashboard
