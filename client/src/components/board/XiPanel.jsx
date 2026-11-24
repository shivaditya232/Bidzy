import Button from '../ui/Button'
import { xiSlots, isOverseas } from '../../utils/board'

// Your Playing XI, filling up as you buy: 11 numbered slots, OS for overseas, +n for backups.
//   landedId: the player you just won glows as he drops in
//   onArrange: opens the XI builder (drag the cards around)
function XiPanel({ lineup, playersById, homeCountry, boughtCount, landedId, onArrange }) {
    const slots=xiSlots(lineup,playersById)
    const placed=slots.filter(s=>s.player).length
    return (
        <div className="grid gap-2.5">
            <h2 className="m-0 flex items-baseline justify-between font-num text-2xl font-black uppercase">
                Your XI <span className="font-text text-xs font-semibold tracking-[.04em] text-fg-3 normal-case">{placed} of 11 placed</span>
            </h2>
            <ol className="m-0 grid list-none gap-[5px] p-0">
                {slots.map(slot=>(
                    <li
                        key={slot.position}
                        className={`grid min-h-[38px] grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 rounded-[11px] px-2.5 py-[7px]
                            ${slot.player ? 'border border-transparent bg-white/[.03]' : 'border border-dashed border-white/[.12]'}
                            ${slot.player&&String(slot.player._id)===String(landedId) ? 'bz-landed border-[var(--team-p)] bg-[color-mix(in_oklab,var(--team-p)_22%,transparent)]' : ''}`}
                    >
                        <span className="text-center font-num text-[17px] font-extrabold text-fg-3">{slot.position}</span>
                        {slot.player
                            ? <span className="min-w-0 truncate text-sm font-semibold">{slot.player.name}<small className="block text-[11px] font-medium text-fg-3">{slot.player.role}</small></span>
                            : <span className="text-sm text-fg-3">Open</span>}
                        <span className="flex items-center gap-1.5">
                            {slot.player&&isOverseas(slot.player,homeCountry) && <span className="rounded-[5px] border border-floodlight/35 px-1 text-[10px] font-bold tracking-[.1em] text-floodlight">OS</span>}
                            {slot.backups.length>0 && <span className="text-[11px] font-semibold text-fg-3">+{slot.backups.length}</span>}
                        </span>
                    </li>
                ))}
            </ol>
            <p className="m-0 border-t border-line pt-2.5 text-[13px] text-fg-2">
                {boughtCount} bought · {Math.max(0,boughtCount-placed)} not in the XI
            </p>
            {onArrange && <Button kind="secondary" size="sm" arrow onClick={onArrange}>Arrange your XI</Button>}
        </div>
    )
}

export default XiPanel
