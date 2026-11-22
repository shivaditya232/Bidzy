import { Link } from 'react-router-dom'
import Button from './ui/Button'
import { formatMoney } from '../utils/money'
import { teamStyle } from '../utils/color'
import { roomGlow, teamTag } from '../utils/lobby'
import { roomHome } from '../api/rooms'

const STATUS={
    live:{label:'Live now',dot:'bg-[#FF4D4D] bz-live-dot',chip:'border-[#FF4D4D]/50 text-white'},
    lobby:{label:'In the lobby',dot:'bg-floodlight',chip:'border-white/15'},
    ended:{label:'Finished',dot:'bg-fg-3',chip:'border-white/15'}
}

const actionLabel=(status,isHost)=>{
    if(status==='live') return isHost ? 'Run the auction' : 'Take your seat'
    if(status==='lobby') return isHost ? 'Set up the room' : 'Open room'
    return 'See results'
}

// One room in the lobby. It glows in who you are there: your franchise, your own colour, or the floodlight when you host.
// entry is one item from GET /rooms: {room, myRole, teamName, franchise, color, purseRemaining}
// wide: the live room spans the whole row
function RoomCard({ entry, franchisesByCode, wide=false, onCopyCode }) {
    const { room, myRole }=entry
    const isHost=myRole==='host'
    const status=STATUS[room.status]||STATUS.lobby
    const glow=roomGlow(entry,franchisesByCode)
    const maxTeams=room.settings?.maxTeams||0
    const purse=room.settings?.purse||0
    const franchiseName=entry.franchise&&franchisesByCode[entry.franchise]?.name
    const href=room.status==='ended' ? `/rooms/${room._id}/results` : roomHome(room._id,myRole)
    const left=purse>0 ? Math.max(0,Math.min(100,Math.round((entry.purseRemaining??0)/purse*100))) : 0

    return (
        <article
            className={`relative isolate grid min-w-0 content-start gap-[18px] overflow-hidden rounded-[22px] border bg-night-2 p-5
                transition-[transform,border-color] duration-200 ease-bidzy hover:-translate-y-[3px]
                ${room.status==='live' ? 'border-[color-mix(in_oklab,var(--team-p)_55%,transparent)]' : 'border-line hover:border-white/15'}
                ${room.status==='ended' ? 'bz-room-ended opacity-80' : ''}
                ${wide ? 'col-span-full md:grid-cols-[1.3fr_1fr] md:items-end' : ''}`}
            style={teamStyle(glow)}
        >
            <span className="bz-room-glow" aria-hidden="true" />

            <div className="grid min-w-0 gap-3.5">
                <div className="flex items-center justify-between gap-2.5">
                    <span className={`inline-flex items-center gap-[7px] rounded-full border bg-night/55 px-2.5 pt-[5px] pb-1 text-[11px] font-bold tracking-[.14em] uppercase ${status.chip}`}>
                        <span className={`size-[7px] rounded-full ${status.dot}`} aria-hidden="true" />
                        {status.label}
                    </span>
                    <span className="text-xs font-semibold text-fg-2">{room.type==='custom' ? 'Custom' : 'IPL'}</span>
                </div>
                <div className="min-w-0">
                    <h3 className={`m-0 font-num leading-[.95] font-black [overflow-wrap:anywhere] uppercase [text-wrap:balance] ${wide ? 'text-[clamp(40px,5vw,60px)]' : 'text-[34px]'}`}>
                        {room.name}
                    </h3>
                    <div className="mt-2.5 flex items-center gap-2.5 text-[15px] text-fg-2">
                        {isHost
                            ? <span className="inline-grid h-[26px] min-w-11 place-items-center rounded-[7px] bg-floodlight/10 px-2 font-num text-[15px] font-black tracking-[.04em] text-floodlight ring-1 ring-floodlight/35 ring-inset">HOST</span>
                            : <span className="bz-team-chip inline-grid h-[26px] min-w-11 place-items-center rounded-[7px] px-2 font-num text-[15px] font-black tracking-[.04em]">{teamTag(entry)}</span>}
                        <span className="min-w-0">
                            {isHost ? 'You run this auction' : <>You're <b className="font-semibold text-fg">{franchiseName||entry.teamName}</b></>}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid min-w-0 gap-3.5">
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line">
                    <div className="grid min-w-0 gap-0.5 bg-night-2/90 px-[13px] pt-[11px] pb-2.5">
                        <small className="text-[11px] font-semibold tracking-[.12em] text-fg-3 uppercase">Teams</small>
                        <strong className="font-num text-2xl leading-[1.05] font-extrabold tabular-nums">
                            {room.teamCount}<span className="text-lg text-fg-3"> / {maxTeams}</span>
                        </strong>
                        <div className="mt-[5px] flex gap-[3px]" aria-hidden="true">
                            {Array.from({length:maxTeams},(_,i)=>(
                                <i key={i} className={`h-1 flex-1 rounded-sm ${i<room.teamCount ? 'bg-floodlight' : 'bg-white/10'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="grid min-w-0 gap-0.5 bg-night-2/90 px-[13px] pt-[11px] pb-2.5">
                        <small className="text-[11px] font-semibold tracking-[.12em] text-fg-3 uppercase">
                            {isHost ? 'Purse each' : room.status==='ended' ? 'Left over' : 'Purse left'}
                        </small>
                        <strong className="font-num text-2xl leading-[1.05] font-extrabold tabular-nums">
                            {formatMoney(isHost ? purse : entry.purseRemaining)}
                        </strong>
                        {!isHost && (
                            <div className="mt-[5px] h-1 overflow-hidden rounded-sm bg-white/10" aria-hidden="true">
                                <i className="block h-full bg-[linear-gradient(90deg_in_oklab,var(--team-pd),var(--team-p))]" style={{width:`${left}%`}} />
                            </div>
                        )}
                    </div>
                </div>

                {isHost&&room.status==='lobby' && (
                    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-dashed border-floodlight/35 bg-floodlight/[.04] py-2 pr-2 pl-3.5">
                        <div>
                            <small className="block text-[11px] font-semibold tracking-[.12em] text-fg-3 uppercase">Invite code</small>
                            <code className="font-num text-2xl font-extrabold tracking-[.22em] text-floodlight">{room.inviteCode}</code>
                        </div>
                        <button
                            type="button"
                            onClick={()=>onCopyCode(room.inviteCode)}
                            aria-label={`Copy invite code ${room.inviteCode}`}
                            className="min-w-[74px] cursor-pointer rounded-[9px] border border-white/15 bg-white/[.04] px-3 py-2 font-text text-[13px] font-semibold text-fg
                                hover:bg-white/[.09] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                        >
                            Copy
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[13px] text-fg-3">
                        {room.status==='live' ? 'Bidding is on' : room.status==='ended' ? 'Auction over' : room.type==='custom' ? 'Custom teams' : 'IPL franchises'}
                    </span>
                    <Button
                        as={Link}
                        to={href}
                        size="sm"
                        arrow
                        kind={room.status==='ended' ? 'secondary' : isHost ? 'primary' : 'team'}
                        glow={isHost ? undefined : glow}
                        aria-label={`${actionLabel(room.status,isHost)}: ${room.name}`}
                    >
                        {actionLabel(room.status,isHost)}
                    </Button>
                </div>
            </div>
        </article>
    )
}

export default RoomCard
