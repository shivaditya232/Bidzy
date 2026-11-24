// The hammer moment: an ink stamp that lands on the player.
// Put it inside a `relative` box. It plays each time it's shown (give it a new `key` to replay).
//
//   {result && <SoldStamp key={lotId} sold={result.status==='sold'} detail="To CSK · ₹4.20 Cr" />}
//   detail: an optional small line under the word (who bought, for how much)
function SoldStamp({ sold=true, detail, className='' }) {
    return (
        <span
            aria-hidden="true"
            className={`pointer-events-none absolute -left-1.5 -top-[18px] rounded-lg border-[5px] border-current bg-night/55 px-3.5 pt-0.5
                font-num text-[64px] leading-none font-black tracking-[.05em] ${sold ? 'text-sold' : 'text-fg-3'} ${className}`}
            style={{animation:'bidzy-stamp .42s var(--ease-bidzy) forwards',opacity:0}}
        >
            {sold ? 'SOLD' : 'UNSOLD'}
            {detail && <small className="-mt-1 mb-2 block text-[.26em] tracking-[.12em] text-fg uppercase">{detail}</small>}
        </span>
    )
}

export default SoldStamp
