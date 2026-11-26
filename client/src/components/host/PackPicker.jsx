import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import { getPack, loadPack } from '../../api/host'
import { errorMessage } from '../../api/axios'
import { inkOn } from '../../utils/color'
import { DEFAULT_GROUPS, GROUP_NOTES, groupsInRoom, pickSummary, toggleGroup } from '../../utils/pack'
import './photo.css'

const DEAL_MS=1000

// The ready-made pool: a sealed "IPL 2026" pack of player cards. Tick the groups of sets you want,
// deal them in, and the players land in their sets (with their Wikimedia photos where there are any).
//   sets, players: what the room has now (groups already in are shown as "In the room")
//   franchises: the 10 teams, for the fanned card backs
//   onDealt(result): {added, skipped, sets} after a load
function PackPicker({ roomId, sets, players, franchises, onDealt, onError }) {
    const [pack,setPack]=useState(null)
    const [chosen,setChosen]=useState(null)
    const [dealing,setDealing]=useState(false)
    const [loadError,setLoadError]=useState('')
    const mounted=useRef(true)

    useEffect(()=>{
        mounted.current=true
        getPack(roomId)
            .then(data=>{ if(mounted.current) setPack(data) })
            .catch(err=>{ if(mounted.current) setLoadError(errorMessage(err)) })
        return ()=>{ mounted.current=false }
    },[roomId])

    const already=pack ? groupsInRoom(pack.groups,sets,players) : []
    // ticked by default: the usual groups that aren't in the room yet
    const picked=chosen??DEFAULT_GROUPS.filter(g=>!already.includes(g))
    const open=pack ? pack.groups.filter(g=>!already.includes(g.name)) : []
    const summary=pickSummary(open,picked)

    const deal=async()=>{
        if(dealing||summary.count===0) return
        setDealing(true)
        try{
            // the load and the card animation run together; the list changes once both are done
            const [result]=await Promise.all([
                loadPack(roomId,picked.filter(g=>!already.includes(g))),
                new Promise(resolve=>setTimeout(resolve,DEAL_MS))
            ])
            if(!mounted.current) return
            setDealing(false)
            setChosen(null)
            onDealt(result)
        }
        catch(err){
            if(!mounted.current) return
            setDealing(false)
            onError(errorMessage(err))
        }
    }

    if(loadError) return <p className="m-0 text-sm text-alert">{loadError}</p>

    return (
        <div className="bz-pack grid gap-[18px] rounded-[26px] border border-white/15 bg-night-2 p-[22px]">
            <div className="flex flex-wrap items-start justify-between gap-3.5">
                <div>
                    <span className="text-xs font-semibold tracking-[.16em] text-fg-2 uppercase">The ready-made pool</span>
                    <b className="block font-num text-[clamp(34px,5vw,52px)] leading-[.9] font-black uppercase">IPL <span className="bz-gold-text">2026</span> squads</b>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {[['Players',pack?.total],['Teams',10],['With photos',pack?.photos]].map(([label,value])=>(
                        <span key={label} className="grid rounded-xl border border-line bg-night/55 px-3 pt-1.5 pb-[5px]">
                            <small className="text-[10px] font-bold tracking-[.14em] text-fg-3 uppercase">{label}</small>
                            <b className="font-num text-[21px] leading-[1.05] font-extrabold tabular-nums">{value??'–'}</b>
                        </span>
                    ))}
                </div>
            </div>

            <div className={`bz-deck ${dealing ? 'bz-deck-dealing' : ''}`} aria-hidden="true">
                {franchises.slice(0,10).map((f,i)=>{
                    const g=f.glow||{}
                    return (
                        <span key={f.code} className="bz-cb"
                            style={{'--i':i,'--d':Math.abs(i-4.5)*3,'--p':g.p,'--pd':g.pd,'--ink':inkOn(g.p),
                                ...(g.metal ? {} : {'--edge':`linear-gradient(135deg,${g.acc||g.p},#fff 50%,${g.acc||g.p})`})}}>
                            {f.code}
                        </span>
                    )
                })}
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                <b>Pick the sets to auction</b>
                <small className="text-xs text-fg-3">Base prices follow each player's 2026 salary</small>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
                {(pack?.groups||[]).map(g=>{
                    const isIn=already.includes(g.name)
                    const on=!isIn&&picked.includes(g.name)
                    return (
                        <button key={g.name} type="button" aria-pressed={isIn ? undefined : on} disabled={isIn||dealing}
                            onClick={()=>setChosen(toggleGroup(picked,g.name))}
                            className="bz-grp grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] border border-white/15 bg-night/50 px-3 py-2.5 text-left font-text text-fg transition-colors hover:border-floodlight/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floodlight disabled:cursor-default disabled:opacity-55 disabled:hover:border-white/15">
                            <span className="bz-grp-box grid size-5 place-items-center rounded-md border-2 border-white/15 text-[13px] font-black text-[#1A1407]" aria-hidden="true" />
                            <span className="min-w-0">
                                <b className="block truncate text-sm font-semibold">{g.name}</b>
                                <small className="block text-[11px] font-semibold text-fg-3">
                                    {isIn ? 'In the room' : `${GROUP_NOTES[g.name]||''} · ${g.sets.length} ${g.sets.length===1 ? 'set' : 'sets'}`}
                                </small>
                            </span>
                            <span className="font-num text-[22px] font-black tabular-nums">{g.count}</span>
                        </button>
                    )
                })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
                <div aria-live="polite">
                    <b className="font-num text-[30px] font-black tabular-nums">{summary.count}</b> players
                    <small className="block text-[13px] text-fg-2">{summary.line}</small>
                </div>
                <Button kind="primary" arrow onClick={deal} disabled={!pack||summary.count===0||dealing} aria-busy={dealing}
                    className="px-[26px]! pt-5! pb-[15px]! text-2xl!">
                    {dealing ? 'Dealing…' : summary.count ? `Deal ${summary.count} players in` : 'Pick a set'}
                </Button>
            </div>
            {pack && <p className="m-0 text-xs text-fg-3">Squads, roles and numbers from Wikipedia ({pack.license.split(' (')[0]}). Stats are T20 career numbers, not IPL-only. Photos from Wikimedia Commons, each with its photographer's credit.</p>}
        </div>
    )
}

export default PackPicker
