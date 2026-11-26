import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Aura from '../components/ui/Aura'
import Button from '../components/ui/Button'
import RoomHeader from '../components/results/RoomHeader'
import TeamTag from '../components/board/TeamTag'
import PlayerAvatar from '../components/board/PlayerAvatar'
import { useRoom } from '../components/roomContext'
import { useFranchises } from '../hooks/useFranchises'
import { getRounds } from '../api/history'
import { getTeams } from '../api/auction'
import { errorMessage } from '../api/axios'
import { formatMoney } from '../utils/money'
import { teamGlow } from '../utils/board'
import { roundTotals, teamByName, numberRounds, formatRoundDate } from '../utils/results'

const pill='grid rounded-xl border border-line bg-night/55 px-3 pt-1.5 pb-[5px]'
const Pill=({ label, value })=><div className={pill}><small className="text-[10px] font-bold tracking-[.14em] text-fg-3 uppercase">{label}</small><b className="font-num text-[19px] leading-[1.05] font-extrabold tabular-nums">{value}</b></div>

// Every saved round of this room, newest first. Each card glows in the colour of the team that made the biggest buy.
function PastAuctions(){
    const { roomId, room }=useRoom()
    const { franchises, byCode }=useFranchises()
    const [rounds,setRounds]=useState(null)
    const [teams,setTeams]=useState([])
    const [error,setError]=useState('')

    useEffect(()=>{
        let cancelled=false
        Promise.all([getRounds(roomId),getTeams(roomId)])
            .then(([list,teamList])=>{ if(!cancelled){ setRounds(numberRounds(list)); setTeams(teamList) } })
            .catch(err=>{ if(!cancelled) setError(errorMessage(err)) })
        return ()=>{ cancelled=true }
    },[roomId])

    return (
        <Aura variant="page" className="min-h-screen bg-night font-text text-[15px] text-fg antialiased">
            <div className="mx-auto max-w-[1240px] px-4 pt-[18px] pb-12 sm:px-5">
                <RoomHeader room={room}>
                    <Button as={Link} to={`/rooms/${roomId}/results`} kind="secondary" size="sm">Results</Button>
                </RoomHeader>

                <span className="text-xs font-semibold tracking-[.16em] text-fg-2 uppercase">Past auctions</span>
                <h1 className="mt-1.5 mb-1.5 font-num text-[clamp(44px,7vw,84px)] leading-[.88] font-black uppercase">Every round</h1>
                <p className="m-0 mb-[22px] max-w-[60ch] text-base text-fg-2">Each time the host starts a new round, the last one is saved here.</p>

                {error && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{error}</p>}
                {rounds&&rounds.length===0 && (
                    <div className="grid justify-items-center gap-2 rounded-3xl border border-dashed border-white/15 px-5 py-12 text-center">
                        <h2 className="m-0 font-num text-[30px] font-black uppercase">No saved rounds yet</h2>
                        <p className="m-0 max-w-[44ch] text-fg-2">When the host starts a new round, the finished one lands here with every squad and price.</p>
                    </div>
                )}
                {rounds&&rounds.length>0 && (
                    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3.5 p-0">
                        {rounds.map(round=>{
                            const t=roundTotals(round.results)
                            const topTeam=t.top ? teamByName(t.top.teamName,teams,franchises) : null
                            const glow=topTeam ? teamGlow(topTeam,byCode) : null
                            return (
                                <li key={round._id}>
                                    <Link to={`/rooms/${roomId}/history/${round._id}`}
                                        className="relative isolate grid gap-3.5 overflow-hidden rounded-[22px] border border-line bg-night-2 p-[18px] text-fg no-underline transition-[transform,border-color] duration-200 ease-bidzy hover:-translate-y-[3px] hover:border-white/15 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg">
                                        <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-45"
                                            style={{background:`radial-gradient(80% 60% at 100% 0% in oklab,${glow ? glow.p : 'var(--color-pitch)'},transparent 70%)`}} />
                                        <span>
                                            <span className="text-xs font-bold tracking-[.14em] text-fg-3 uppercase">{formatRoundDate(round.completedAt)}</span>
                                            <h2 className="m-0 mt-0.5 font-num text-[34px] leading-[.95] font-black uppercase">Round {round.number}</h2>
                                        </span>
                                        <span className="flex flex-wrap gap-1.5">
                                            <Pill label="Sold" value={t.sold} />
                                            <Pill label="Unsold" value={t.unsold} />
                                            <Pill label="Spent" value={formatMoney(t.spent)} />
                                        </span>
                                        {t.top && (
                                            <span className="flex items-center gap-2.5 text-sm text-fg-2">
                                                <PlayerAvatar player={{name:t.top.playerName,image:t.top.image}} className="size-10" />
                                                <span className="min-w-0">Biggest buy<br /><b className="text-fg">{t.top.playerName}</b> · {formatMoney(t.top.soldPrice)}</span>
                                                <span className="ml-auto"><TeamTag team={topTeam} franchisesByCode={byCode} /></span>
                                            </span>
                                        )}
                                        <span className="font-num text-[15px] font-extrabold tracking-[.06em] text-fg-2 uppercase">See the round →</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </Aura>
    )
}

export default PastAuctions
