const RING=2*Math.PI*42

// The lot's countdown as a ring with the seconds in the middle. Turns red in the last 5 seconds.
function BidClock({ progress, seconds }) {
    const hurry=seconds<=5
    return (
        <div className="relative grid size-24 place-items-center" role="timer" aria-label={`${seconds} seconds left`}>
            <svg viewBox="0 0 96 96" className="absolute inset-0 -rotate-90" aria-hidden="true">
                <circle cx="48" cy="48" r="42" fill="none" strokeWidth="7" stroke="rgb(255 255 255 / .08)" />
                <circle cx="48" cy="48" r="42" fill="none" strokeWidth="7" strokeLinecap="round"
                    stroke={hurry ? 'var(--color-alert)' : 'var(--color-floodlight)'}
                    strokeDasharray={RING} strokeDashoffset={RING*(1-Math.max(0,Math.min(1,progress)))} />
            </svg>
            <b className={`font-num text-[34px] font-black tabular-nums ${hurry ? 'text-alert' : ''}`}>{seconds}</b>
        </div>
    )
}

export default BidClock
