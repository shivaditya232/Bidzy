import { useState } from 'react'
import Popup from '../ui/Popup'
import PlayerAvatar from './PlayerAvatar'
import TeamTag from './TeamTag'
import { formatMoney } from '../../utils/money'
import { isOverseas, teamGlow } from '../../utils/board'

const Row=({ player, right, sub })=>(
    <li className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl bg-white/[.03] p-2">
        <PlayerAvatar player={player} />
        <span className="min-w-0">
            <b className="block truncate font-semibold text-fg">{player.name}</b>
            <small className="text-xs text-fg-3">{sub}</small>
        </span>
        <span className="font-num text-lg font-extrabold text-fg tabular-nums">{right}</span>
    </li>
)

// the players still to come, in auction order
export function UpcomingPopup({ onClose, players, homeCountry }) {
    return (
        <Popup open onClose={onClose} title="Upcoming" wide>
            {players.length===0
                ? <p className="m-0">This is the last player.</p>
                : (
                    <ul className="m-0 grid list-none gap-1.5 p-0 text-fg">
                        {players.map(p=>(
                            <Row key={p._id} player={p} right={formatMoney(p.basePrice)}
                                sub={[p.role,p.country,isOverseas(p,homeCountry)&&'Overseas',p.set?.name].filter(Boolean).join(' · ')} />
                        ))}
                    </ul>
                )}
        </Popup>
    )
}

// what every other team has bought so far, one team at a time
export function TeamsPopup({ onClose, teams, boughtByTeam, franchisesByCode }) {
    const [selected,setSelected]=useState(teams[0]?._id||null)
    const team=teams.find(t=>t._id===selected)
    const bought=boughtByTeam[selected]||[]
    return (
        <Popup open onClose={onClose} title="Other teams" wide glow={team ? teamGlow(team,franchisesByCode) : undefined}>
            {teams.length===0 ? <p className="m-0">No other teams yet.</p> : (
                <div className="grid gap-3 text-fg">
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pick a team">
                        {teams.map(t=>(
                            <button key={t._id} type="button" aria-pressed={t._id===selected} aria-label={t.teamName} onClick={()=>setSelected(t._id)}
                                className={`cursor-pointer rounded-lg border-0 bg-transparent p-0.5 ${t._id===selected ? 'outline-2 outline-offset-1 outline-white' : 'opacity-70 hover:opacity-100'}`}>
                                <TeamTag team={t} franchisesByCode={franchisesByCode} />
                            </button>
                        ))}
                    </div>
                    {team && (
                        <>
                            <p className="m-0 text-[13px] text-fg-2">{team.teamName} · {formatMoney(team.purseRemaining)} left · {bought.length} bought</p>
                            {bought.length===0
                                ? <p className="m-0 text-sm text-fg-3">Nobody bought yet.</p>
                                : <ul className="m-0 grid list-none gap-1.5 p-0">{bought.map(p=><Row key={p._id} player={p} right={formatMoney(p.soldPrice)} sub={p.role} />)}</ul>}
                        </>
                    )}
                </div>
            )}
        </Popup>
    )
}
