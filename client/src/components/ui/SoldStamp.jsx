// The hammer moment: an ink stamp that lands on the player.
// Put it inside a `relative` box. It plays each time it's shown (give it a new `key` to replay).
//
//   {result && <SoldStamp key={lotId} sold={result.status==='sold'} />}
function SoldStamp({ sold=true, className='' }) {
    return (
        <span
            aria-hidden="true"
            className={`pointer-events-none absolute -left-1.5 -top-[18px] rounded-lg border-[5px] border-current bg-night/55 px-3.5 pt-0.5
                font-num text-[64px] leading-none font-black tracking-[.05em] ${sold ? 'text-sold' : 'text-fg-3'} ${className}`}
            style={{animation:'bidzy-stamp .42s var(--ease-bidzy) forwards',opacity:0}}
        >
            {sold ? 'SOLD' : 'UNSOLD'}
        </span>
    )
}

export default SoldStamp
