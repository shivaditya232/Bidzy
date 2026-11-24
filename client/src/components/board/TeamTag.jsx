import { teamStyle } from '../../utils/color'
import { teamGlow } from '../../utils/board'
import { teamTag } from '../../utils/lobby'

// small team chip: CSK / MI, or a custom team's initials, in its colours
function TeamTag({ team, franchisesByCode, className='' }) {
    return (
        <span
            className={`bz-team-chip inline-grid h-6 min-w-10 shrink-0 place-items-center rounded-[7px] px-[7px] font-num text-sm font-black tracking-[.04em] ${className}`}
            style={teamStyle(teamGlow(team,franchisesByCode))}
        >
            {teamTag({myRole:'team',franchise:team?.franchise,teamName:team?.teamName})}
        </span>
    )
}

export default TeamTag
