import TeamTag from '../board/TeamTag'
import { teamGlow } from '../../utils/board'

// The room's team slots: filled ones glow in the team's colours, open ones wait.
//   newestId: the team that just joined lights up
function TeamSlots({ teams, maxTeams, franchisesByCode, newestId }) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
            {Array.from({length:maxTeams},(_,i)=>{
                const team=teams[i]
                if(!team){
                    return <div key={`open-${i}`} className="grid min-h-16 content-center rounded-[14px] border border-dashed border-white/[.14] px-3 py-2.5 text-[13px] text-fg-3">Open · waiting</div>
                }
                const glow=teamGlow(team,franchisesByCode)
                return (
                    <div key={team._id}
                        className={`relative isolate grid min-h-16 content-center gap-1 overflow-hidden rounded-[14px] border border-transparent px-3 py-2.5 ${String(team._id)===String(newestId) ? 'bz-landed' : ''}`}
                        style={{'--team-p':glow.p}}>
                        <span aria-hidden="true" className="absolute inset-0 -z-10 opacity-55" style={{background:`radial-gradient(120% 120% at 0% 0% in oklab,${glow.p},transparent 70%)`}} />
                        <TeamTag team={team} franchisesByCode={franchisesByCode} className="justify-self-start" />
                        <b className="truncate text-sm font-semibold">{team.teamName}</b>
                        {team.name && <small className="text-xs text-fg-2">{team.name}</small>}
                    </div>
                )
            })}
        </div>
    )
}

export default TeamSlots
