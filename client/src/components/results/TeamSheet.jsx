import TeamTag from '../board/TeamTag'
import PlayerAvatar from '../board/PlayerAvatar'
import { formatMoney } from '../../utils/money'
import { isOverseas } from '../../utils/board'
import { xiRows } from '../../utils/results'

const numsLabel='text-[10px] font-bold tracking-[.12em] text-fg-3 uppercase'
const flipButton='cursor-pointer justify-self-start rounded border-0 bg-transparent px-0 py-1.5 text-left font-text text-[13px] font-semibold text-fg-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg'

// One team's sheet: who they bought and for how much. With an XI it has a back side (the batting order)
// that flips into view: flipped + onFlip. me: your own team gets a YOU badge and a brighter edge.
//   left: purse left (leave out for saved rounds, where only spent is known)
function TeamSheet({ team, glow, squad, spent, left, me=false, xi, flipped=false, onFlip, homeCountry, franchisesByCode }) {
    const face=(back)=>(
        <div
            className={`bz-sheet-face ${back ? 'bz-sheet-back' : ''} relative isolate grid min-w-0 content-start gap-3 overflow-hidden rounded-[22px] border bg-night-2 p-4`}
            style={{borderColor:me ? `color-mix(in oklab,${glow.p} 60%,transparent)` : 'var(--color-line)'}}
            aria-hidden={back ? !flipped : flipped}
            inert={(back ? !flipped : flipped) || undefined}
        >
            <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-60" style={{background:`radial-gradient(90% 50% at 0% 0% in oklab,${glow.p},transparent 70%)`}} />
            <span aria-hidden="true" className="absolute inset-0 -z-10" style={{background:'linear-gradient(to bottom,transparent 8%,var(--color-night-2) 45%)'}} />
            {back ? backSide() : frontSide()}
        </div>
    )

    const heading=(title,badge)=>(
        <div className="flex min-w-0 items-center gap-2.5">
            <TeamTag team={team} franchisesByCode={franchisesByCode} />
            <b className="min-w-0 font-num text-[21px] leading-[1.05] font-black uppercase">{title}</b>
            {badge}
        </div>
    )

    const frontSide=()=>(
        <>
            {heading(team.teamName,me && <span className="ml-auto rounded-md border border-floodlight/35 px-1.5 py-0.5 text-[10px] font-bold tracking-[.14em] text-floodlight">YOU</span>)}
            <div className={`grid gap-px overflow-hidden rounded-xl border border-line bg-line ${left===undefined ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {[['Bought',squad.length],['Spent',formatMoney(spent)],...(left===undefined ? [] : [['Left',formatMoney(left)]])].map(([label,value])=>(
                    <div key={label} className="grid bg-night-2/90 px-2.5 py-2">
                        <small className={numsLabel}>{label}</small>
                        <b className="font-num text-lg font-extrabold whitespace-nowrap tabular-nums">{value}</b>
                    </div>
                ))}
            </div>
            {squad.length===0
                ? <p className="m-0 text-[13px] text-fg-3">Bought nobody.</p>
                : (
                    <ul className="m-0 grid list-none gap-1 p-0">
                        {squad.map(p=>(
                            <li key={p._id||p.name} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-[9px] rounded-[10px] bg-white/[.03] px-1.5 py-[5px] text-sm">
                                <PlayerAvatar player={p} className="size-8" />
                                <span className="min-w-0">
                                    <b className="block truncate font-semibold">
                                        {p.name}
                                        {isOverseas(p,homeCountry) && <span className="ml-[5px] rounded-[4px] border border-floodlight/35 px-[3px] align-[1px] text-[9px] font-bold tracking-[.1em] text-floodlight">OS</span>}
                                    </b>
                                    <small className="text-[11px] text-fg-3">{p.role}</small>
                                </span>
                                <span className="font-num text-base font-extrabold tabular-nums">{formatMoney(p.soldPrice)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            {xi && <button type="button" className={flipButton} onClick={onFlip}>See their XI →</button>}
        </>
    )

    const backSide=()=>{
        const rows=xiRows(xi)
        const placed=rows.filter(r=>r.player).length
        return (
            <>
                {heading('Playing XI',<span className="ml-auto rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-bold tracking-[.14em] text-fg-2">{placed}/11</span>)}
                <ol className="m-0 grid list-none gap-1 p-0">
                    {rows.map(row=>(
                        <li key={row.position}
                            className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] px-2 py-1.5 text-sm ${row.player ? 'bg-white/[.03]' : 'border border-dashed border-white/[.12] text-fg-3'}`}>
                            <span className="text-center font-num text-base font-extrabold text-fg-3">{row.position}</span>
                            {row.player
                                ? <span className="min-w-0">
                                    <b className="block truncate font-semibold">{row.player.name}</b>
                                    {row.backups.length>0 && <small className="block truncate text-[11px] text-fg-3">Backup: {row.backups.map(b=>b.name).join(', ')}</small>}
                                  </span>
                                : <span>Not picked</span>}
                            <span className="text-[11px] text-fg-3">{row.backups.length>0 ? `+${row.backups.length}` : ''}</span>
                        </li>
                    ))}
                </ol>
                <button type="button" className={flipButton} onClick={onFlip}>← Back to squad</button>
            </>
        )
    }

    return (
        <div className={`bz-sheet ${flipped ? 'bz-flipped' : ''}`}>
            <div className="bz-sheet-inner">
                {face(false)}
                {xi && face(true)}
            </div>
        </div>
    )
}

export default TeamSheet
