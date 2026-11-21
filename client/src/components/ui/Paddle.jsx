import { teamStyle } from '../../utils/color'

// Your bid button: your team's paddle.
// Primary colour in two shades, your accent as a thin edge along the bottom (metal when it's gold).
//
//   <Paddle glow={glow} code="CSK" amount="₹4.40 Cr" onBid={placeBid} disabled={...} />
function Paddle({ glow, code, amount, onBid, disabled=false, label='paddle' }) {
    return (
        <button
            type="button"
            onClick={onBid}
            disabled={disabled}
            style={teamStyle(glow)}
            className="group relative isolate grid min-w-[220px] cursor-pointer justify-items-start gap-0.5 overflow-hidden rounded-2xl px-[22px] pt-3.5 pb-[18px] text-left
                text-[var(--team-ink)] shadow-[0_10px_30px_-10px_var(--team-p),inset_0_1px_0_rgb(255_255_255/.25)]
                transition-[transform,filter] duration-75 ease-bidzy active:translate-y-px active:scale-[.99] active:brightness-95
                disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 disabled:active:scale-100"
        >
            <span className="absolute inset-0 -z-10" style={{background:'linear-gradient(135deg in oklab,var(--team-p),var(--team-pd))'}} />
            <span className="text-xs font-bold uppercase tracking-[.12em] opacity-80">{code} {label}</span>
            <strong className="font-num text-[38px] leading-none font-black tabular-nums">{amount}</strong>
            <span className="absolute inset-x-0 bottom-0 h-[5px]" style={{background:'var(--team-acc-solid)'}} />
        </button>
    )
}

export default Paddle
