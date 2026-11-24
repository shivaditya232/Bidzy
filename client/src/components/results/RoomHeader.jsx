import { Link } from 'react-router-dom'

const CHIPS={
    lobby:{label:'In the lobby',dot:'bg-floodlight'},
    live:{label:'Live',dot:'bg-[#FF4D4D] bz-live-dot'},
    ended:{label:'Finished',dot:'bg-fg-3'}
}

// The strip at the top of a room page: wordmark (back to the lobby), the room's state and name, and a slot on the right.
function RoomHeader({ room, children }) {
    const chip=CHIPS[room.status]||CHIPS.lobby
    return (
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3.5">
            <div className="flex min-w-0 items-center gap-3.5">
                <Link to="/lobby" className="font-num text-[22px] font-black tracking-[.06em] text-fg no-underline">BIDZY</Link>
                <span className="inline-flex shrink-0 items-center gap-[7px] rounded-full border border-white/15 bg-night/50 px-2.5 pt-1 pb-[3px] text-[11px] font-bold tracking-[.14em] whitespace-nowrap uppercase">
                    <i className={`size-[7px] rounded-full ${chip.dot}`} aria-hidden="true" />{chip.label}
                </span>
                <span className="truncate font-semibold text-fg-2">{room.name}</span>
            </div>
            {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
        </header>
    )
}

export default RoomHeader
