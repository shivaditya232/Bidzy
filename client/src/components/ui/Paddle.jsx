import { useRef, useState } from 'react'
import { teamStyle } from '../../utils/color'

const RING=2*Math.PI*84 // circumference of the timer ring

// Your bid button: a real auction paddle in your team's colours.
// Tap it and it thrusts up and forward at the auctioneer. Tap while you're already on top and it wobbles "no".
// The bid timer runs as a ring around the head (pass progress 0..1 and seconds to show it).
//
//   <Paddle glow={glow} code="MI" amount="₹4.40 Cr" onBid={placeBid} leading={iLead} progress={0.6} seconds={9} />
//   disabled: can't bid at all (auction paused, purse too low...)
function Paddle({ glow, code, amount, onBid, disabled=false, leading=false, progress, seconds, label }) {
    const [motion,setMotion]=useState(null) // 'up' | 'nope' | null
    const [whoosh,setWhoosh]=useState(0)
    const timer=useRef(null)

    const play=(kind)=>{
        clearTimeout(timer.current)
        setMotion(null)
        // next frame, so the same animation can replay on a quick second tap
        requestAnimationFrame(()=>{
            setMotion(kind)
            timer.current=setTimeout(()=>setMotion(null),kind==='up' ? 750 : 400)
        })
    }

    const handleClick=()=>{
        if(disabled) return
        if(leading){
            play('nope')
            return
        }
        play('up')
        setWhoosh(w=>w+1)
        onBid?.()
    }

    const hasClock=typeof progress==='number'
    const hurry=hasClock&&typeof seconds==='number'&&seconds<=5
    const classes=['bz-paddle',motion==='up'&&'bz-up',motion==='nope'&&'bz-nope',leading&&'bz-leading',disabled&&'bz-off'].filter(Boolean).join(' ')

    return (
        <div className="bz-paddle-wrap" style={teamStyle(glow)}>
            {hasClock && (
                <>
                    <svg className={`bz-ring ${hurry ? 'bz-hurry' : ''}`} viewBox="0 0 178 178" aria-hidden="true">
                        <circle className="bz-ring-track" cx="89" cy="89" r="84" />
                        <circle className="bz-ring-left" cx="89" cy="89" r="84" strokeDasharray={RING} strokeDashoffset={RING*(1-Math.max(0,Math.min(1,progress)))} />
                    </svg>
                    {typeof seconds==='number' && <span className={`bz-secs ${hurry ? 'bz-hurry' : ''}`} aria-hidden="true">{seconds}</span>}
                </>
            )}
            {whoosh>0 && <span key={whoosh} className="bz-whoosh" aria-hidden="true" />}
            <button
                type="button"
                className={classes}
                onClick={handleClick}
                aria-disabled={disabled||leading}
                aria-label={label||(leading ? `You lead at ${amount}` : `Bid ${amount}`)}
            >
                <span className="bz-paddle-head">
                    <span className="bz-paddle-code">{code}</span>
                    <span className="bz-paddle-amount">{amount}</span>
                </span>
                <span className="bz-paddle-handle" aria-hidden="true" />
            </button>
        </div>
    )
}

export default Paddle
