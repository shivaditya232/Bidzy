import TeamTag from '../board/TeamTag'
import { teamGlow } from '../../utils/board'
import { formatMoney } from '../../utils/money'

// Every team's purse, squad and overseas count, live. The team winning the current lot is lit up.
function Leaderboard({ teams, franchisesByCode, leaderId }) {
    return (
        <ol className="m-0 grid list-none gap-1.5 p-0">
            {teams.map(team=>{
                const glow=teamGlow(team,franchisesByCode)
                const leads=String(team._id)===String(leaderId)
                const left=team.purse>0 ? Math.round(team.purseRemaining/team.purse*100) : 0
                return (
                    <li key={team._id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[14px] border px-3 py-2.5 transition-[border-color,background-color] duration-300"
                        style={leads ? {borderColor:`color-mix(in oklab,${glow.p} 70%,transparent)`,background:`color-mix(in oklab,${glow.p} 16%,transparent)`} : {borderColor:'transparent',background:'rgb(255 255 255 / .03)'}}>
                        <TeamTag team={team} franchisesByCode={franchisesByCode} />
                        <span className="min-w-0">
                            <b className="block truncate font-semibold">{team.teamName}</b>
                            <small className="text-xs text-fg-3">
                                {team.squadSize} {team.squadSize===1 ? 'player' : 'players'} · {team.overseasCount} overseas
                                {leads && <span className="ml-1 text-[10px] font-bold tracking-[.12em] text-floodlight">BIDDING</span>}
                            </small>
                            <span className="mt-[5px] block h-1 overflow-hidden rounded-sm bg-white/10" aria-hidden="true">
                                <i className="block h-full" style={{width:`${left}%`,background:`linear-gradient(90deg in oklab,${glow.pd},${glow.p})`}} />
                            </span>
                        </span>
                        <span className="text-right font-num text-[19px] font-extrabold tabular-nums">
                            {formatMoney(team.purseRemaining)}<small className="block font-text text-[11px] font-semibold text-fg-3">left</small>
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}

export default Leaderboard
