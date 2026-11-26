import { useEffect, useRef, useState } from 'react'
import { HOUSE_GLOW } from '../../utils/color'

// A surface that glows in a team's colours (or Bidzy's own pitch-green house glow when there's no team).
// The team's primary owns the space (a bright and a deep shade); its accent is a small glow in a corner.
// When the colours change (another team takes the lead, you pick a franchise), it cross-fades in 0.9s.
//
//   <Aura glow={{p,pd,acc}} variant="card" className="rounded-[28px] p-8">...</Aura>
//   accent: override the corner colour (the auction floor passes the challenger's colour here)
//   variant: 'page' = tall hero, fades to night lower down; 'card' = shorter surface, lighter fade;
//            'sheet' = glow only along the top, the rest stays plain (popups with forms in them)
const FADES={
    page:'linear-gradient(to bottom,transparent 0%,rgb(7 9 13 / .35) 40%,var(--color-night) 92%)',
    card:'linear-gradient(to bottom,rgb(7 9 13 / .10) 0%,rgb(7 9 13 / .55) 100%)',
    sheet:'linear-gradient(to bottom,transparent 0%,var(--color-night-2) 48%)'
}

const BIG={
    page:(c)=>`radial-gradient(75% 80% at 20% 15% in oklab,${c.a},transparent 70%),radial-gradient(70% 75% at 68% 30% in oklab,${c.a2},transparent 72%)`,
    card:(c)=>`radial-gradient(80% 110% at 12% 30% in oklab,${c.a},transparent 72%),radial-gradient(60% 90% at 55% 70% in oklab,${c.a2},transparent 72%)`,
    sheet:(c)=>`radial-gradient(70% 40% at 15% 18% in oklab,${c.a},transparent 72%),radial-gradient(55% 32% at 60% 18% in oklab,${c.a2},transparent 75%)`
}
const CORNER={
    page:(c)=>`radial-gradient(26% 30% at 92% 10% in oklab,${c.b},transparent 72%)`,
    card:(c)=>`radial-gradient(34% 70% at 98% 20% in oklab,${c.b},transparent 70%)`,
    sheet:(c)=>`radial-gradient(24% 16% at 92% 16% in oklab,${c.b},transparent 72%)`
}

const Layer=({colors,visible,variant})=>{
    const big=(BIG[variant]||BIG.card)(colors)
    const corner=(CORNER[variant]||CORNER.card)(colors)
    return (
        <div className="absolute -inset-[20%] transition-opacity duration-[900ms] ease-bidzy" style={{opacity:visible ? 1 : 0}}>
            <div className="absolute inset-0 will-change-transform" style={{background:big,animation:'bidzy-drift-1 26s ease-in-out infinite alternate'}} />
            <div className="absolute inset-0 will-change-transform" style={{background:corner,opacity:.85,animation:'bidzy-drift-2 32s ease-in-out infinite alternate'}} />
        </div>
    )
}

function Aura({ glow, accent, variant='card', as:Tag='div', className='', children, ...rest }) {
    // no glow given -> the house glow (landing, sign-up, lobby...)
    const source=glow||HOUSE_GLOW
    const colors={a:source.p,a2:source.pd,b:accent||source.acc}
    // two layers: the new colours go on the hidden one, then it fades in over the old one
    const [state,setState]=useState({active:0,layers:[colors,null]})
    const first=useRef(true)

    useEffect(()=>{
        if(first.current){
            first.current=false
            return
        }
        setState(prev=>{
            const next=1-prev.active
            const layers=[...prev.layers]
            layers[next]={a:colors.a,a2:colors.a2,b:colors.b}
            return {active:next,layers}
        })
    // colors is rebuilt each render; the three strings are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[colors.a,colors.a2,colors.b])

    // clip, not hidden: a hidden box can still be scrolled by focus or scrollIntoView (the glow layers are
    // wider than the page), which slid the whole page sideways on long pages
    return (
        <Tag className={`relative isolate overflow-clip bidzy-grain ${className}`} {...rest}>
            <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
                {state.layers.map((layer,i)=>layer && (
                    <Layer key={i} colors={layer} visible={i===state.active} variant={variant} />
                ))}
                <div className="absolute inset-0" style={{background:FADES[variant]||FADES.card}} />
            </div>
            <div className="relative z-[1]">{children}</div>
        </Tag>
    )
}

export default Aura
