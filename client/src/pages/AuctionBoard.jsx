import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Aura from '../components/ui/Aura'
import Button from '../components/ui/Button'
import Paddle from '../components/ui/Paddle'
import Toast from '../components/ui/Toast'
import LotCard from '../components/board/LotCard'
import XiPanel from '../components/board/XiPanel'
import TeamTag from '../components/board/TeamTag'
import { UpcomingPopup, TeamsPopup } from '../components/board/BoardPopups'
import XiBuilder from '../components/xi/XiBuilder'
import { useRoom } from '../components/roomContext'
import { useFranchises } from '../hooks/useFranchises'
import socket, { connectToRoom } from '../api/socket'
import { getAuction, placeBid, getPlayers, getTeams, getMyMember } from '../api/auction'
import { getMyLineup, saveLineup } from '../api/rooms'
import { errorMessage } from '../api/axios'
import { formatMoney } from '../utils/money'
import { teamStyle } from '../utils/color'
import { nextBid, idOf, placeInFirstOpen, upcomingPlayers, boughtByTeam, teamGlow } from '../utils/board'

const HAMMER_MS=2800 // how long SOLD / UNSOLD stays up before the next player rolls in

// The auction floor, from a team's seat: your XI on the left, the player on the block in the middle,
// your paddle below. The page glows in your colours; the corner glows in whoever leads.
function AuctionBoard(){
    const { roomId, room, me }=useRoom()
    const { byCode }=useFranchises()
    const [data,setData]=useState(null)        // {session, players, teams, mine, lineup, unplaced}
    const [feed,setFeed]=useState([])          // [{key, teamId, amount}] newest first
    const [hammer,setHammer]=useState(null)    // {key, sold, detail} while the gavel is down
    const [landedId,setLandedId]=useState(null)
    const [now,setNow]=useState(()=>Date.now())
    const [popup,setPopup]=useState(null)      // 'upcoming' | 'teams' | 'xi'
    const [saveState,setSaveState]=useState('idle') // the XI builder's 'Saving… / Saved'
    const [toast,setToast]=useState(null)
    const [announce,setAnnounce]=useState('')
    const toastTimer=useRef(null)
    const saveTimer=useRef(null)
    const saveSeq=useRef(0)
    const homeCountry=room.settings?.rules?.homeCountry||'India'

    const showToast=useCallback((message,tone='bad')=>{
        clearTimeout(toastTimer.current)
        setToast({message,tone})
        toastTimer.current=setTimeout(()=>setToast(null),2600)
    },[])

    // everything the board shows, in one go
    const loadAll=useCallback(async()=>{
        const [auction,players,teams,mine,lineup]=await Promise.all([
            getAuction(roomId),getPlayers(roomId),getTeams(roomId),getMyMember(roomId),getMyLineup(roomId)
        ])
        setData({session:auction.populatedSession,players,teams,mine,lineup:lineup.lineup,unplaced:lineup.unplaced})
        const rows=(auction.recentBids||[]).map(b=>({key:`${idOf(b.team)}-${b.amount}`,teamId:idOf(b.team),amount:b.amount}))
        setFeed(rows.filter((row,i)=>rows.findIndex(r=>r.key===row.key)===i))
        return {players,lineup:lineup.lineup}
    },[roomId])

    // you won a player: drop him into the first open slot of your XI
    const placeWon=useCallback(async(playerId,lineup)=>{
        const next=placeInFirstOpen(lineup,playerId)
        if(!next) return
        try{
            const saved=await saveLineup(roomId,next)
            setData(prev=>prev ? {...prev,lineup:saved.lineup,unplaced:saved.unplaced} : prev)
            setLandedId(playerId)
            setTimeout(()=>setLandedId(null),2000)
        }
        catch{ /* e.g. a 5th overseas starter: he stays in "not in your XI" */ }
    },[roomId])

    // the XI builder changed your XI: show it at once, save it a moment later (a burst of moves = one save).
    // only the newest save's answer is used, so a slow reply can't undo a later move.
    const changeLineup=useCallback((next)=>{
        setData(prev=>prev ? {...prev,lineup:next} : prev)
        setSaveState('saving')
        clearTimeout(saveTimer.current)
        const seq=++saveSeq.current
        saveTimer.current=setTimeout(async()=>{
            try{
                const saved=await saveLineup(roomId,next)
                if(seq!==saveSeq.current) return
                setData(prev=>prev ? {...prev,lineup:saved.lineup,unplaced:saved.unplaced} : prev)
                setSaveState('saved')
            }
            catch(err){
                if(seq!==saveSeq.current) return
                setSaveState('error')
                showToast(errorMessage(err))
                // put back what the server has
                try{
                    const fresh=await getMyLineup(roomId)
                    setData(prev=>prev ? {...prev,lineup:fresh.lineup,unplaced:fresh.unplaced} : prev)
                }
                catch{ /* the next reload catches up */ }
            }
        },450)
    },[roomId,showToast])

    useEffect(()=>{
        loadAll().catch(err=>showToast(errorMessage(err)))
    },[loadAll,showToast])

    // live events
    useEffect(()=>{
        const onStarted=()=>{ loadAll().catch(()=>{}) }
        const onBid=(event)=>{
            setData(prev=>prev ? {...prev,session:{...prev.session,currentPrice:event.currentPrice,highestBidder:event.highestBidder,timerEndsAt:event.timerEndsAt}} : prev)
            // the same bid can arrive twice (live event + a reload that already has it): keep it once
            const key=`${idOf(event.highestBidder)}-${event.currentPrice}`
            setFeed(prev=>prev.some(b=>b.key===key) ? prev : [{key,teamId:idOf(event.highestBidder),amount:event.currentPrice},...prev].slice(0,5))
            setAnnounce(`${event.highestBidderName} bid ${formatMoney(event.currentPrice)}`)
        }
        const onFinished=(event)=>{
            const done=event.finishedPlayer
            const sold=done?.status==='sold'
            const mineWon=sold&&String(done.soldTo)===String(me.id)
            setHammer({key:done?.id||Date.now(),sold,detail:sold ? `${mineWon ? 'To you' : `To ${done.teamName}`} · ${formatMoney(done.soldPrice)}` : undefined})
            setAnnounce(sold ? `Sold to ${mineWon ? 'you' : done.teamName} for ${formatMoney(done.soldPrice)}` : `${done?.name} unsold`)
            setTimeout(async()=>{
                setHammer(null)
                try{
                    const fresh=await loadAll()
                    if(mineWon) placeWon(String(done.id),fresh.lineup)
                }
                catch{ /* the next event or a reload catches up */ }
            },HAMMER_MS)
        }
        socket.on('auction-started',onStarted)
        socket.on('bid-placed',onBid)
        socket.on('next-player',onFinished)
        socket.on('auction-ended',onFinished)
        connectToRoom(roomId)
        return ()=>{
            socket.off('auction-started',onStarted)
            socket.off('bid-placed',onBid)
            socket.off('next-player',onFinished)
            socket.off('auction-ended',onFinished)
        }
    },[roomId,me.id,loadAll,placeWon])

    // the clock: a few times a second is smooth enough for the ring
    useEffect(()=>{
        const tick=setInterval(()=>setNow(Date.now()),200)
        return ()=>{ clearInterval(tick); clearTimeout(toastTimer.current); clearTimeout(saveTimer.current) }
    },[])

    const closePopup=useCallback(()=>setPopup(null),[])
    const openXi=useCallback(()=>setPopup('xi'),[])

    const players=data?.players
    const playersById=useMemo(()=>Object.fromEntries((players||[]).map(p=>[String(p._id),p])),[players])
    const teamsById=useMemo(()=>Object.fromEntries((data?.teams||[]).map(t=>[String(t._id),t])),[data?.teams])
    const squad=useMemo(()=>(players||[]).filter(p=>p.status==='sold'&&idOf(p.soldTo)===String(me.id)),[players,me.id])

    if(!data){
        return <div className="min-h-screen bg-night" aria-busy="true" />
    }

    const { session, teams, mine, lineup }=data
    const myTeam=teamsById[String(me.id)]||{teamName:mine.teamName,franchise:mine.franchise,color:mine.color}
    const myGlow=teamGlow(myTeam,byCode)
    const rules=room.settings?.rules||{}
    const player=session?.currentPlayer&&typeof session.currentPlayer==='object' ? session.currentPlayer : null
    const live=session?.status==='live'&&player
    const ended=session?.status==='ended'||room.status==='ended'
    const leaderId=idOf(session?.highestBidder)
    const leader=leaderId ? teamsById[leaderId]||{teamName:session.highestBidder?.teamName} : null
    const iLead=leaderId===String(me.id)
    const amount=live ? nextBid(session.currentPrice,room.settings.increments) : 0
    const msLeft=live&&session.timerEndsAt ? Math.max(0,new Date(session.timerEndsAt).getTime()-now) : 0
    const timerMs=(room.settings.timerSeconds||15)*1000
    const tooPoor=amount>mine.purseRemaining
    const canBid=live&&!hammer&&msLeft>0&&!tooPoor

    const lotIndex=player ? players.findIndex(p=>String(p._id)===String(player._id)) : -1
    const lotPlayer=lotIndex>-1 ? players[lotIndex] : null
    const lotLabel=lotPlayer ? `${lotPlayer.set?.name ? lotPlayer.set.name+' · ' : ''}Lot ${lotIndex+1}` : ''
    const upcoming=upcomingPlayers(players)
    const otherTeams=teams.filter(t=>String(t._id)!==String(me.id))
    const feedRows=feed.map(f=>({...f,team:teamsById[f.teamId]||null}))

    const handleBid=async()=>{
        try{
            await placeBid(roomId)
        }
        catch(err){
            showToast(errorMessage(err))
        }
    }

    let hintTitle,hintText
    if(hammer){ hintTitle='Hammer down'; hintText='Next player in a moment.' }
    else if(ended){ hintTitle='Paddle down'; hintText='The auction is over. Your squad is final.' }
    else if(!live){ hintTitle='Paddle down'; hintText='Bidding opens when the host puts a player up.' }
    else if(iLead){ hintTitle="You're on top"; hintText=`Hold your nerve. If nobody beats ${formatMoney(session.currentPrice)}, he's yours.` }
    else if(tooPoor){ hintTitle='Out of reach'; hintText=`${formatMoney(amount)} is more than your ${formatMoney(mine.purseRemaining)} left.` }
    else{
        const stillNeed=Math.max(0,(rules.squadMin||0)-mine.squadSize-1)
        hintTitle=`Raise to ${formatMoney(amount)}`
        hintText=`Tap your paddle. You'd have ${formatMoney(mine.purseRemaining-amount)} left${stillNeed>0 ? ` for ${stillNeed} more players` : ''}.`
    }

    const pill='grid rounded-xl border border-line bg-night/55 px-3 pt-1.5 pb-[5px]'
    const pillLabel='text-[10px] font-bold tracking-[.14em] text-fg-3 uppercase'
    const pillValue='font-num text-xl leading-[1.05] font-extrabold tabular-nums'

    return (
        <Aura variant="page" glow={myGlow} accent={leader ? teamGlow(leader,byCode).p : undefined}
            className="min-h-screen overflow-x-hidden bg-night font-text text-[15px] text-fg antialiased" style={teamStyle(myGlow)}>
            <div className="mx-auto max-w-[1240px] px-4 pt-[18px] pb-10 sm:px-5">
                <header className="mb-5 flex flex-wrap items-center justify-between gap-3.5">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <Link to="/lobby" className="font-num text-[22px] font-black tracking-[.06em] text-fg no-underline">BIDZY</Link>
                        {(session ? session.status==='live' : room.status==='live') && (
                            <span className="inline-flex items-center gap-[7px] rounded-full border border-[#FF4D4D]/50 px-2.5 pt-1 pb-[3px] text-[11px] font-bold tracking-[.14em]">
                                <i className="bz-live-dot size-[7px] rounded-full bg-[#FF4D4D]" aria-hidden="true" />LIVE
                            </span>
                        )}
                        <span className="truncate font-semibold text-fg-2">{room.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <div className={pill}><small className={pillLabel}>You</small><span className="pt-0.5"><TeamTag team={myTeam} franchisesByCode={byCode} /></span></div>
                        <div className={pill}><small className={pillLabel}>Purse left</small><b className={pillValue}>{formatMoney(mine.purseRemaining)}</b></div>
                        <div className={pill}><small className={pillLabel}>Squad</small><b className={pillValue}>{mine.squadSize} / {rules.squadMax}</b></div>
                        <div className={pill}><small className={pillLabel}>Overseas</small><b className={pillValue}>{mine.overseasCount} / {rules.overseasMax}</b></div>
                    </div>
                </header>

                <div className="grid items-start gap-5 min-[921px]:grid-cols-[290px_minmax(0,1fr)]">
                    <aside className="hidden rounded-[22px] border border-line bg-night-2/80 p-4 backdrop-blur-md min-[921px]:block">
                        <XiPanel lineup={lineup} playersById={playersById} homeCountry={homeCountry} boughtCount={mine.squadSize} landedId={landedId} onArrange={openXi} />
                    </aside>

                    <main className="min-w-0">
                        {player
                            ? <LotCard key={player._id} player={player} lotLabel={lotLabel} homeCountry={homeCountry} price={session.currentPrice}
                                leader={leader} mine={iLead} feed={feedRows} franchisesByCode={byCode} hammer={hammer} />
                            : (
                                <div className="grid min-h-[400px] place-items-center content-center gap-3 rounded-[26px] border border-white/15 bg-night-2/80 p-6 text-center">
                                    <h1 className="m-0 font-num text-[clamp(40px,6vw,72px)] leading-[.9] font-black uppercase">
                                        {ended ? 'Auction over' : 'Waiting for the host'}
                                    </h1>
                                    <p className="m-0 max-w-[42ch] text-fg-2">
                                        {ended
                                            ? 'Every player has gone under the hammer. See who ended up where.'
                                            : 'The first player comes up as soon as the host starts the auction. Keep this page open.'}
                                    </p>
                                    {ended && <Button as={Link} to={`/rooms/${roomId}/results`} kind="primary" arrow>See results</Button>}
                                </div>
                            )}

                        <section aria-label="Your paddle"
                            className="mt-[18px] grid items-center gap-[18px] rounded-[22px] border border-line bg-night-2/70 px-[18px] py-4 max-[620px]:justify-items-center max-[620px]:text-center min-[621px]:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="grid gap-1">
                                <b className="font-num text-[26px] leading-none font-black uppercase">{hintTitle}</b>
                                <span className="text-sm text-fg-2">{hintText}</span>
                            </div>
                            <Paddle
                                glow={myGlow}
                                code={myTeam.franchise||myTeam.teamName?.slice(0,3).toUpperCase()}
                                amount={formatMoney(iLead ? session.currentPrice : amount||player?.basePrice)}
                                onBid={handleBid}
                                disabled={!canBid}
                                leading={iLead&&!hammer}
                                progress={live&&!hammer ? msLeft/timerMs : 0}
                                seconds={live&&!hammer ? Math.ceil(msLeft/1000) : undefined}
                            />
                        </section>

                        <div className="mt-[18px] flex flex-wrap gap-2.5">
                            <Button kind="secondary" size="sm" className="min-[921px]:hidden" onClick={openXi}>Arrange your XI</Button>
                            <Button kind="secondary" size="sm" onClick={()=>setPopup('upcoming')}>Upcoming players <span className="text-fg-3">({upcoming.length})</span></Button>
                            <Button kind="secondary" size="sm" onClick={()=>setPopup('teams')}>Other teams' players</Button>
                        </div>
                    </main>
                </div>
            </div>

            {popup==='upcoming' && <UpcomingPopup onClose={closePopup} players={upcoming} homeCountry={homeCountry} />}
            {popup==='teams' && <TeamsPopup onClose={closePopup} teams={otherTeams} boughtByTeam={boughtByTeam(players)} franchisesByCode={byCode} />}
            {popup==='xi' && (
                <XiBuilder lineup={lineup} squad={squad} homeCountry={homeCountry} glow={myGlow}
                    saveState={saveState} onChange={changeLineup} onClose={closePopup} />
            )}
            {toast && <Toast message={toast.message} tone={toast.tone} />}
            <div className="sr-only" aria-live="assertive">{announce}</div>
        </Aura>
    )
}

export default AuctionBoard
