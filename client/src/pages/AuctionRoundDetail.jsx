import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Aura from '../components/ui/Aura'
import RoomHeader from '../components/results/RoomHeader'
import TeamSheet from '../components/results/TeamSheet'
import { useRoom } from '../components/roomContext'
import { useFranchises } from '../hooks/useFranchises'
import { getRoundById, getRounds } from '../api/history'
import { getTeams } from '../api/auction'
import { errorMessage } from '../api/axios'
import { formatMoney } from '../utils/money'
import { teamGlow } from '../utils/board'
import { roundSheets, roundTotals, teamByName, numberRounds, formatRoundDate } from '../utils/results'

const pill='grid rounded-xl border border-line bg-night/55 px-3 pt-1.5 pb-[5px]'
const Pill=({ label, value })=><div className={pill}><small className="text-[10px] font-bold tracking-[.14em] text-fg-3 uppercase">{label}</small><b className="font-num text-[19px] leading-[1.05] font-extrabold tabular-nums">{value}</b></div>

// One saved round: every team's squad and prices as they were when the host started a new round.
function AuctionRoundDetail(){
    const { roomId, room }=useRoom()
    const { id }=useParams()
    const { franchises, byCode }=useFranchises()
    const [data,setData]=useState(null) // {round, number, teams}
    const [error,setError]=useState('')

    useEffect(()=>{
        let cancelled=false
        Promise.all([getRoundById(roomId,id),getRounds(roomId),getTeams(roomId)])
            .then(([round,all,teams])=>{
                const number=numberRounds(all).find(r=>r._id===round._id)?.number
                if(!cancelled) setData({round,number,teams})
            })
            .catch(err=>{ if(!cancelled) setError(errorMessage(err)) })
        return ()=>{ cancelled=true }
    },[roomId,id])

    const back=<Link to={`/rooms/${roomId}/history`} className="mb-1.5 inline-block rounded text-[13px] font-semibold text-fg-2 no-underline hover:text-fg focus-visible:outline-2 focus-visible:outline-fg">← Past auctions</Link>

    return (
        <Aura variant="page" className="min-h-screen bg-night font-text text-[15px] text-fg antialiased">
            <div className="mx-auto max-w-[1240px] px-4 pt-[18px] pb-12 sm:px-5">
                <RoomHeader room={room} />
                {back}
                {error && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{error}</p>}
                {data && (()=>{
                    const { round, number, teams }=data
                    const t=roundTotals(round.results)
                    const sheets=roundSheets(round.results)
                    const unsold=round.results.filter(r=>r.status==='unsold')
                    return (
                        <>
                            <div className="mb-[22px] flex flex-wrap items-end justify-between gap-[18px]">
                                <div>
                                    <span className="text-xs font-semibold tracking-[.16em] text-fg-2 uppercase">{number ? `Round ${number} · ` : ''}{formatRoundDate(round.completedAt)}</span>
                                    <h1 className="mt-1.5 mb-1.5 font-num text-[clamp(44px,7vw,84px)] leading-[.88] font-black uppercase">{number ? `Round ${number}` : 'Saved round'}</h1>
                                    <p className="m-0 max-w-[60ch] text-base text-fg-2">Saved when the host started a new round. Squads and prices as they were.</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <Pill label="Sold" value={t.sold} />
                                    <Pill label="Unsold" value={t.unsold} />
                                    <Pill label="Spent" value={formatMoney(t.spent)} />
                                </div>
                            </div>
                            {sheets.length===0
                                ? <p className="m-0 text-fg-2">Nobody was sold in this round.</p>
                                : (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(330px,100%),1fr))] items-start gap-4">
                                        {sheets.map(({team,squad,spent})=>{
                                            const known=teamByName(team.teamName,teams,franchises)
                                            return <TeamSheet key={team.teamName} team={known} glow={teamGlow(known,byCode)} squad={squad} spent={spent}
                                                homeCountry={room.settings?.rules?.homeCountry||'India'} franchisesByCode={byCode} />
                                        })}
                                    </div>
                                )}
                            {unsold.length>0 && (
                                <div className="mt-[22px] grid gap-2.5 rounded-[20px] border border-line bg-night-2/70 p-4">
                                    <h2 className="m-0 font-num text-2xl font-black uppercase">Unsold</h2>
                                    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                                        {unsold.map(r=><li key={r._id} className="rounded-full border border-line bg-white/[.04] px-2.5 py-1.5 text-[13px] text-fg-2">{r.playerName}</li>)}
                                    </ul>
                                </div>
                            )}
                        </>
                    )
                })()}
            </div>
        </Aura>
    )
}

export default AuctionRoundDetail
